import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import faker from 'faker';
import AutomationActionDispatcher from './AutomationActionDispatcher';
import ConditionalAutomationActionDispatcher from './ConditionalAutomationActionDispatcher';
import EmailScheduler from './email_scheduler';
import ConditionsEvaluator from './ConditionsEvaluator';

const { expect } = chai;
chai.use(sinonChai);

describe('ConditionalAutomationActionDispatcher', () => {
  describe('#dispatch()', () => {
    const userId = 'userId';
    const senderId = 'sender-id';
    const sender = { id: senderId, emailAddress: 'sender@email.com', fromName: 'From Name' };
    const listId = 'list-id';
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
      name: faker.commerce.productName(),
      conditions: [{ type: 'some-condition' }]
    };
    const firstEvent = { type: 'list.recipient.subscribe', payload: { recipient: { a: 'recipient', listId } } };
    const secondEvent = { type: 'list.recipient.subscribe', payload: { recipient: { another: 'recipient' } } };
    const events = [firstEvent, secondEvent];

    beforeEach(() => {
      sinon.stub(AutomationActionDispatcher.prototype, 'fetchAutomationSender').resolves(sender);
      sinon.stub(EmailScheduler, 'scheduleBatch').resolves(true);
      sinon.stub(ConditionsEvaluator, 'areMet')
        .withArgs(automationAction.conditions, firstEvent).resolves(true)
        .withArgs(automationAction.conditions, secondEvent).resolves(false);
    });
    afterEach(() => {
      AutomationActionDispatcher.prototype.fetchAutomationSender.restore();
      EmailScheduler.scheduleBatch.restore();
      ConditionsEvaluator.areMet.restore();
    });

    it('schedules emails that meet the conditions', async () => {
      const expectedEmails = [{
        email: {
          body: automationAction.campaign.body,
          subject: automationAction.campaign.subject
        },
        metadata: {
          campaignId: automationAction.id,
          listId: firstEvent.payload.recipient.listId,
          userId: automationAction.userId,
          automationActionId: automationAction.id,
          automationId: automationAction.automationId
        },
        sender,
        recipient: firstEvent.payload.recipient,
        delay: automationAction.delay
      }];
      const dispatcher = new ConditionalAutomationActionDispatcher(automationAction, events);
      await dispatcher.dispatch();
      expect(EmailScheduler.scheduleBatch).to.have.been.calledWith(expectedEmails);
    });
  });
});
