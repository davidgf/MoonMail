import AWS from 'aws-sdk';
import moment from 'moment';
import ImportRecipientsCsvCommand from './recipients/ImportRecipientsCsvCommand';
import LambdaUtils from './lib/LambdaUtils';
import App from './App';
import Lists from './domain/Lists';
import UserNotifier from './lib/UserNotifier';
const lambdaClient = new AWS.Lambda();

function buildImportRecipientsParams(s3Data, event) {
  const fileKey = s3Data.key;
  const fileTokens = fileKey.split('.');
  return {
    userId: fileTokens[0],
    listId: fileTokens[1],
    fileName: fileKey,
    body: s3Data.body,
    headerMapping: JSON.parse(s3Data.metadata.headers),
    processingOffset: event.processingOffset || 0,
    // The event clone so to be used on recursive calls
    s3Event: event
  };
}

export function importRecipientsCsvFromS3(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('importRecipientsCsvFromS3', JSON.stringify(event));
  return LambdaUtils.parseS3Event(event)
    .then(s3Data => buildImportRecipientsParams(s3Data, event))
    .then(importRecipientsParams => importRecipientsCsvCommand(importRecipientsParams, context))
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

async function importRecipientsCsvCommand(importRecipientsParams, context) {
  try {
    await Lists.setImportingStarted(importRecipientsParams.userId, importRecipientsParams.listId, importRecipientsParams.fileName);
    await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_UPDATED', data: { id: importRecipientsParams.listId, processed: false } });
    await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_IMPORT_PROCESSED', data: { listId: importRecipientsParams.listId } });
    return ImportRecipientsCsvCommand.execute(importRecipientsParams, lambdaClient, context);
  } catch (error) {
    App.logger().error(error);
    if (!error.message.match(/$ImportError/)) throw error;
    await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_IMPORT_FAILED', data: { listId: importRecipientsParams.listId } });
    await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_UPDATED', data: { id: importRecipientsParams.listId, processed: true } });
    return Lists.updateImportStatus(importRecipientsParams.userId, importRecipientsParams.listId, importRecipientsParams.fileName, {
      status: 'failed',
      message: error.message,
      finishedAt: moment().unix()
    });
  }
}
