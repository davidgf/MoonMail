// This is the aggregate root in the list microservice.
import Promise from 'bluebird';
import omitEmpty from 'omit-empty';
import moment from 'moment';
import RecipientModel from './RecipientModel';
import ListModel from './ListModel';
import ListImportStatus from './ListImportStatus';
import UserNotifier from '../lib/UserNotifier';
import wait from '../lib/utils/wait';

function getList(userId, listId) {
  return ListModel.find(userId, listId);
}

function updateList(userId, listId, newList) {
  return ListModel.update(newList, userId, listId);
}

function deleteList(userId, listId) {
  return ListModel.delete(userId, listId);
}

function createList(list) {
  return ListModel.create(list);
}

function getLists(userId, options) {
  return ListModel.allBy('userId', userId, options);
}

function getListsRecursive(userId, options) {
  return ListModel.allBy('userId', userId, Object.assign({}, options, { recursive: true }));
}

function setImportingStarted(userId, listId, importId) {
  return updateImportStatus(userId, listId, importId, { status: 'importing', createdAt: moment().unix() })
    .then(() => setProcessing(userId, listId, true));
}

async function updateImportStatus(userId, listId, importId, { status, message, createdAt, finishedAt }) {
  const list = await getList(userId, listId);
  const existingImportStatus = list.importStatus;
  const newImportStatus = ListImportStatus.aggregateImportStatus(importId, existingImportStatus, { status, message, createdAt, finishedAt });
  return ListModel.update({ importStatus: newImportStatus }, userId, listId);
}

function appendMetadataAttributes(userId, listId, newMetadataAttributes) {
  // TESTING MOVING THIS TO MM-MODELS
  // if (Object.keys(newMetadataAttributes).length === 0) return Promise.resolve();
  //
  return ListModel.appendMetadataAttributes(newMetadataAttributes, { userId, listId });
}

function setProcessing(userId, listId, processing) {
  return ListModel.update({ processed: !processing }, userId, listId);
}

// FIXME: This is not a good place for this function
// It also has too many responsibilities
async function broadcastImportStatus(userId, listId, index, total) {
  const imported = index + 1 === total;
  if (imported) {
    // If imported then wait a bit to give time recipientsCounter to finish
    // FIXME: Remove recipientCounter service and make the calculations here instead
    await wait(200);
    await UserNotifier.notify(userId, { type: 'LIST_IMPORT_PROCESSED', data: { listId } });
    return UserNotifier.notify(userId, { type: 'LIST_IMPORT_SUCCEDED', data: { listId } });

    // // Inmediatelly unlock lists with more than 10000 recipients, poeplo uploading
    // // big lists wont expects results anytime soon.
    // if (total < 10000) return Promise.resolve();
    // await setProcessing(userId, listId, false);
    // return UserNotifier.notify(userId, { type: 'LIST_UPDATED', data: { id: listId, processed: true } });
  }
  return UserNotifier.notify(userId, { type: 'LIST_IMPORT_PROCESSED', data: { listId } });
}

// TODO: Improve me to save in batch recipients regardless of the list it belongs
// TODO: Extract services
function importRecipientsBatch(recipientImportedEvents) {
  const importedRecipientEventsByListId = recipientImportedEvents.reduce((result, current) => {
    if (!result[current.payload.recipient.listId]) {
      result[current.payload.recipient.listId] = [];
    }
    result[current.payload.recipient.listId].push(current);
    return result;
  }, {});

  return Promise.map(Object.keys(importedRecipientEventsByListId), (listId) => {
    const listRecipientEvents = importedRecipientEventsByListId[listId];
    const sampleRecipientImportedEvent = listRecipientEvents[listRecipientEvents.length - 1];
    const { recipient, importId, recipientIndex, totalRecipients } = sampleRecipientImportedEvent.payload;
    const importStatus = omitEmpty({
      status: totalRecipients === recipientIndex + 1 ? 'success' : 'importing',
      finishedAt: totalRecipients === recipientIndex + 1 ? moment().unix() : null
    });
    const recipients = listRecipientEvents
      .map(rw => Object.assign({}, rw.payload.recipient, { status: RecipientModel.statuses.subscribed, subscriptionOrigin: RecipientModel.subscriptionOrigins.listImport, isConfirmed: true }));

    return RecipientModel.saveBatch(recipients)
      .then(() => updateImportStatus(recipient.userId, listId, importId, importStatus))
      .then(() => appendMetadataAttributes(recipient.userId, listId, Object.keys(recipient.metadata)))
      .then(() => broadcastImportStatus(recipient.userId, listId, recipientIndex, totalRecipients));
  });
}

// TODO: Create apiManual subscriptionOrigin
function createRecipientsBatch(recipientCreatedEvents) {
  const recipients = recipientCreatedEvents
    .map(event => Object.assign({}, event.payload.recipient, { subscriptionOrigin: RecipientModel.subscriptionOrigins.listImport }));
  return RecipientModel.saveBatch(recipients);
}

function updateRecipientsBatch(recipientUpdatedEvents) {
  return Promise.map(recipientUpdatedEvents, (recipientUpdatedEvent) => {
    return RecipientModel.update(recipientUpdatedEvent.payload.data, recipientUpdatedEvent.payload.listId, recipientUpdatedEvent.payload.id);
  }, { concurrency: 2 });
}

function deleteRecipientsBatch(recipientDeletedEvents) {
  return Promise.map(recipientDeletedEvents, (recipientDeletedEvent) => {
    return RecipientModel.delete(recipientDeletedEvent.listId, recipientDeletedEvent.id);
  }, { concurrency: 2 });
}

export default {
  getList,
  createList,
  updateList,
  deleteList,
  getLists,
  getListsRecursive,
  setImportingStarted,
  updateImportStatus,
  appendMetadataAttributes,
  setProcessing,
  importRecipientsBatch,
  createRecipientsBatch,
  updateRecipientsBatch,
  deleteRecipientsBatch
};
