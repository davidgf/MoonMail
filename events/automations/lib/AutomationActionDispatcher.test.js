import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import faker from 'faker';
import { Recipient } from 'moonmail-models';
import AutomationActionDispatcher from './AutomationActionDispatcher';
import EmailScheduler from './email_scheduler';
import FunctionsClient from '../../lib/functions_client';

const { expect } = chai;
chai.use(sinonChai);

describe('AutomationActionDispatcher', () => {
  const userId = 'userId';
  const senderId = 'sender-id';
  const sender = { id: senderId, emailAddress: 'sender@email.com', fromName: 'From Name' };
  const fetchSenderFunctionName = 'function-name';
  const listId = 'list-id';
  const segmentId = 'segment-id';
  const automationAction = {
    type: 'list.recipient.subscribe',
    id: 'automation-action-id',
    automationId: faker.random.alphaNumeric(5),
    userId,
    listId,
    senderId,
    delay: 3600,
    status: 'active',
    campaign: { subject: 'Email subject {{name}}', body: 'Email body {{name}}' },
    name: faker.commerce.productName()
  };
  const events = [{ payload: { recipient: { id: 123 } } }, { payload: { recipient: { id: 567 } } }];

  beforeEach(() => {
    process.env.FETCH_SENDER_FN_NAME = fetchSenderFunctionName;
    sinon.stub(FunctionsClient, 'execute')
      .withArgs(fetchSenderFunctionName, { userId, senderId })
      .resolves(sender);
    sinon.stub(EmailScheduler, 'scheduleBatch').resolves(true);
  });
  afterEach(() => {
    delete process.env.FETCH_SENDER_FN_NAME;
    FunctionsClient.execute.restore();
    EmailScheduler.scheduleBatch.restore();
  });

  describe('#fetchAutomationSender()', () => {
    it('resolves the sender of the automation action', async () => {
      const dispatcher = new AutomationActionDispatcher(automationAction, events);
      const actualSender = await dispatcher.fetchAutomationSender();
      expect(FunctionsClient.execute).to.have.been.calledWithExactly(fetchSenderFunctionName, { userId, senderId });
      expect(actualSender).to.deep.equal(sender);
    });
  });

  describe('#buildEmail()', () => {
    it('builds an email object for a given sender, recipient and event', () => {
      const recipient = { id: 123, email: 'david.garcia@microapps.com', listId };
      const expectedEmail = {
        email: {
          body: automationAction.campaign.body,
          subject: automationAction.campaign.subject
        },
        metadata: {
          campaignId: automationAction.id,
          automationActionId: automationAction.id,
          automationId: automationAction.automationId,
          listId: recipient.listId,
          userId: automationAction.userId,
          segmentId
        },
        sender,
        recipient,
        delay: automationAction.delay
      };
      const dispatcher = new AutomationActionDispatcher(automationAction, events);
      const actualEmail = dispatcher.buildEmail(sender, recipient, { segmentId });
      expect(expectedEmail).to.deep.equal(actualEmail);
    });
  });

  describe('#dispatchableEmails', () => {
    it('returns all events', () => {
      const dispatcher = new AutomationActionDispatcher(automationAction, events);
      expect(dispatcher.dispatchableEmails).to.deep.equal(events);
    });
  });

  describe('#fetchEventRecipient', () => {
    context('when the event contains the recipient', () => {
      it('resolves the recipient', async () => {
        const recipient = { the: 'recipient' };
        const dispatcher = new AutomationActionDispatcher(automationAction, events);
        const actualRecipient = await dispatcher.fetchEventRecipient({ recipient });
        expect(actualRecipient).to.deep.equal(recipient);
      });
    });

    context('when the event does not contain the recipient', () => {
      const eventPayload = { listId, recipientId: 'the-recipient-id' };
      const recipient = { the: 'recipient', listId };

      before(() => sinon.stub(Recipient, 'get')
        .withArgs(eventPayload.listId, eventPayload.recipientId).resolves(recipient));
      after(() => Recipient.get.restore());

      it('fetches it from the database', async () => {
        const dispatcher = new AutomationActionDispatcher(automationAction, events);
        const actualRecipient = await dispatcher.fetchEventRecipient({ recipient });
        expect(actualRecipient).to.deep.equal(recipient);
      });
    });
  });

  describe('#buildEmails()', () => {
    it('builds an email object for every dispatchable event', async () => {
      const dispatcher = new AutomationActionDispatcher(automationAction, events);
      const actualEmails = await dispatcher.buildEmails(sender);
      const expectedEmails = events.map(evt => dispatcher.buildEmail(sender, evt.payload.recipient, evt.payload));
      expect(expectedEmails).to.deep.equal(actualEmails);
    });
  });
});
