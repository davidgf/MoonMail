import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import AggregationCountConditionEvaluator from './AggregationCountConditionEvaluator';

const { expect } = chai;
chai.use(sinonChai);

describe('AggregationCountConditionEvaluator', () => {
  describe('.isMet()', () => {
    const campaignId = 'campaign-id';
    const recipientActivity = [
      { type: 'email.opened', campaignId },
      { type: 'email.clicked', campaignId },
      { type: 'email.opened', campaignId: 123 },
      { type: 'email.opened', campaignId: 456 },
      { type: 'email.opened', campaignId: 687 }
    ];
    const recipient = { id: 'recipient-id', listId: 'list-id' };
    const event = { payload: { recipient } };

    beforeEach(() => sinon.stub(AggregationCountConditionEvaluator.prototype, 'fetchResources').resolves(recipientActivity));
    afterEach(() => AggregationCountConditionEvaluator.prototype.fetchResources.restore());

    context('when the conditions is met', () => {
      const condition = {
        type: 'aggregationCount',
        resource: 'recipient.activity',
        filters: [
          { campaignId: { eq: 'not-opened-campaign' } },
          { type: { eq: 'email.opened' } }
        ],
        count: 0,
        delay: 300
      };

      it('resolves true', async () => {
        const result = await AggregationCountConditionEvaluator.isMet(condition, event);
        expect(result).to.be.true;
      });
    });

    context('when the condition is not met', () => {
      const condition = {
        type: 'aggregationCount',
        resource: 'recipient.activity',
        filters: [
          { campaignId: { eq: campaignId } },
          { type: { eq: 'email.opened' } }
        ],
        count: 0,
        delay: 300
      };

      it('resolves false', async () => {
        const result = await AggregationCountConditionEvaluator.isMet(condition, event);
        expect(result).to.be.false;
      });
    });

    context('when there is an unexpected exception', () => {
      const condition = {
        type: 'aggregationCount',
        resource: 'recipient.activity',
        filters: [
          { campaignId: { eq: campaignId } },
          { type: { eq: 'email.opened' } }
        ],
        count: 0,
        delay: 300
      };

      it('resolves false', async () => {
        AggregationCountConditionEvaluator.prototype.fetchResources.rejects(new Error('kaboom!'));
        const result = await AggregationCountConditionEvaluator.isMet(condition, event);
        expect(result).to.be.false;
      });
    });
  });
});
