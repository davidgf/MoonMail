import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import faker from 'faker';
import AutomationActionDispatcher from './AutomationActionDispatcher';
import ConditionalDeferredAutomationActionDispatcher from './ConditionalDeferredAutomationActionDispatcher';
import JobScheduler from './job_scheduler';

const { expect } = chai;
chai.use(sinonChai);

describe('ConditionalDeferredAutomationActionDispatcher', () => {
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
      conditions: [
        { type: 'some-condition', delay: 500 },
        { type: 'another-condition', delay: 2000 }
      ]
    };
    const events = [{ payload: { recipient: { id: 123 } } }, { payload: { recipient: { id: 567 } } }];

    beforeEach(() => {
      sinon.stub(AutomationActionDispatcher.prototype, 'fetchAutomationSender').resolves(sender);
      sinon.stub(JobScheduler, 'performLater').resolves(true);
    });
    afterEach(() => {
      AutomationActionDispatcher.prototype.fetchAutomationSender.restore();
      JobScheduler.performLater.restore();
    });

    it('schedules a check conditions job with the correct delay', async () => {
      const dispatcher = new ConditionalDeferredAutomationActionDispatcher(automationAction, events);
      await dispatcher.dispatch();
      expect(JobScheduler.performLater).to.have.been.calledWith('ScheduleEmailsIfConditionsMet', 2000, { automationAction, events });
    });
  });
});
