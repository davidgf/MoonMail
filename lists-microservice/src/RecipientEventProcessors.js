import LambdaUtils from './lib/LambdaUtils';
import Lists from './domain/Lists';
import Events from './domain/Events';
import App from './App';


function recipientImportedProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('recipientImportedHandler', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientImported);

  // TODO: Evaluate if it's better to use validate instead of isValid
  if (recipients.some(e => !Events.isValid(e))) {
    const error = '[ERROR], Invalid events detected in the stream';
    App.logger().error(error);
    callback(new Error(JSON.stringify(error)));
  }
  const validRecipients = recipients.filter(Events.isValid);
  return Lists.importRecipientsBatch(validRecipients)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function recipientCreatedProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('recipientCreatedProcessor', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientCreated);

  const invalidEvents = recipients.filter(e => !Events.isValid(e));
  if (invalidEvents.length > 0) {
    const { error } = Events.validate(invalidEvents.shift());
    App.logger().error(error);
    callback(new Error(JSON.stringify(error)));
  }

  const validEvents = recipients.filter(Events.isValid);
  console.log('>>>>>', JSON.stringify(validEvents));
  return Lists.createRecipientsBatch(validEvents)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function recipientUpdatedProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('recipientCreatedProcessor', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientUpdated);
  App.logger().debug('recipients', JSON.stringify(recipients));

  const invalidEvents = recipients.filter(e => !Events.isValid(e));
  if (invalidEvents.length > 0) {
    const { error } = Events.validate(invalidEvents.shift());
    App.logger().error(error);
    callback(new Error(JSON.stringify(error)));
  }
  const validEvents = recipients.filter(Events.isValid);
  return Lists.updateRecipientsBatch(validEvents)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function recipientDeletedProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('recipientCreatedProcessor', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientDeleted);

  const invalidEvents = recipients.filter(e => !Events.isValid(e));
  if (invalidEvents.length > 0) {
    const { error } = Events.validate(invalidEvents.shift());
    App.logger().error(error);
    callback(new Error(JSON.stringify(error)));
  }
  const validEvents = recipients.filter(Events.isValid);
  return Lists.deleteRecipientsBatch(validEvents)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

export default {
  recipientImportedProcessor,
  recipientCreatedProcessor,
  recipientUpdatedProcessor,
  recipientDeletedProcessor
};
