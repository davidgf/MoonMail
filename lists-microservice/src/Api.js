import omitEmpty from 'omit-empty';
import App from './App';
import UserContext from './lib/UserContext';
import Events from './domain/Events';
import RecipientModel from './domain/RecipientModel';
import Recipients from './domain/Recipients';
import EventLog from './EventLog';
import HttpUtils from './lib/HttpUtils';

async function createRecipient(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('createRecipient', JSON.stringify(event));
    const { recipient } = JSON.parse(event.body);
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const recipientCreatedEvent = await Events.buildRecipientCreatedEvent({ listId: event.pathParameters.listId, userId: user.id, recipient });
    await EventLog.write({ topic: Events.listRecipientCreated, streamName: process.env.LIST_RECIPIENT_STREAM_NAME, payload: recipientCreatedEvent });
    HttpUtils.buildApiResponse({ statusCode: 202, body: {}, headers: { Location: `/lists/${event.pathParameters.listId}/recipients/${RecipientModel.buildId(recipient)}` } }, callback);
  } catch (error) {
    App.logger().error(error);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function updateRecipient(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('updateRecipient', JSON.stringify(event));
    const params = JSON.parse(event.body);
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const recipientUpdatedEvent = await Events.buildRecipientUpdatedEvent({ listId: event.pathParameters.listId, userId: user.id, id: event.pathParameters.recipientId, data: params });
    await EventLog.write({ topic: Events.listRecipientUpdated, streamName: process.env.LIST_RECIPIENT_STREAM_NAME, payload: recipientUpdatedEvent });
    HttpUtils.buildApiResponse({ statusCode: 202 }, callback);
  } catch (error) {
    App.logger().error(error);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function deleteRecipient(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('deleteRecipient', JSON.stringify(event));
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const recipientDeletedEvent = await Events.buildRecipientDeleteEvent({ listId: event.pathParameters.listId, userId: user.id, recipient: event.pathParameters.recipientId });
    await EventLog.write({ topic: Events.listRecipientDeleted, streamName: process.env.LIST_RECIPIENT_STREAM_NAME, payload: recipientDeletedEvent });
    HttpUtils.buildApiResponse({ statusCode: 202 }, callback);
  } catch (error) {
    App.logger().error(error);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function listRecipients(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('listRecipients', JSON.stringify(event));
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const qs = event.queryStringParameters || {};
    const page = qs.page || 1;
    const limit = qs.limit || 10;
    const options = { from: (page - 1) * limit, size: Math.min(limit, 100) };
    // FIXME: Improve according to:
    // https://bitbucket.org/micro-apps/monei-core-serverless/src/38856c21a98cacc775cf0518e0d2bd8f488b45e9/node/users/lib/index.js?at=master&fileviewer=file-view-default
    const conditions = qs.status ? [{ condition: { queryType: 'match', fieldToQuery: 'status', searchTerm: qs.status }, conditionType: 'filter' }] : [];
    // const conditions = qs.status ? [{ condition: { queryType: 'match', fieldToQuery: 'status.keyword', searchTerm: qs.status }, conditionType: 'filter' }] : [];
    // const conditions = qs.status ? [{ condition: { queryType: 'terms', fieldToQuery: 'status.keyword', searchTerm: [qs.status] }, conditionType: 'filter' }] : [];
    const recipients = await Recipients.searchRecipientsByListAndConditions(event.pathParameters.listId, conditions, omitEmpty(options));
    HttpUtils.buildApiResponse({ statusCode: 200, body: recipients }, callback);
  } catch (error) {
    App.logger().error(error, error.stack);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function getRecipient(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('getRecipient', JSON.stringify(event));
    App.logger().info('getRecipient', JSON.stringify(event.pathParameters));
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const recipient = await Recipients.getRecipient({ listId: event.pathParameters.listId, recipientId: event.pathParameters.recipientId });
    HttpUtils.buildApiResponse({ statusCode: 200, body: recipient }, callback);
  } catch (error) {
    App.logger().error(error, error.stack);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

export default {
  createRecipient,
  updateRecipient,
  deleteRecipient,
  listRecipients,
  getRecipient
};
