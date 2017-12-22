import LambdaUtils from './lib/LambdaUtils';
import Lists from './domain/Lists';
import Events from './domain/Events';
import App from './App';


export function recipientImportedHandler(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('recipientImportedHandler', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientImported);
  const validRecipients = recipients.filter(Events.isValid);
  const invalidRecipients = recipients.filter(e => !Events.isValid(e));
  if (invalidRecipients.length > 0) {
    const error = '[ERROR], Invalid events detected in the stream';
    App.logger().error(error);
    callback(new Error(error));
  }
  return Lists.importRecipientsBatch(validRecipients)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}