import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import ConditionsEvaluator from './ConditionsEvaluator';

const { expect } = chai;
chai.use(sinonChai);

describe('ConditionsEvaluator', () => {
  describe('#areMet', () => {
    const conditions = [{ a: 'condition' }, { another: 'condition' }];
    const event = { type: 'sometype', payload: { some: 'data' } };
    const alwaysTrueStub = { isMet: sinon.stub().returns(true) };
    const alwaysFalseStub = { isMet: sinon.stub().returns(false) };

    context('when all the conditions are met', () => {
      before(() => sinon.stub(ConditionsEvaluator.prototype, 'getEvaluator').returns(alwaysTrueStub));
      after(() => ConditionsEvaluator.prototype.getEvaluator.restore());

      it('resolves true if all the conditions are met', async () => {
        const result = await ConditionsEvaluator.areMet(conditions, event);
        expect(result).to.be.true;
        conditions.forEach(c => expect(alwaysTrueStub.isMet).to.have.been.calledWithExactly(c, event));
      });
    });

    context('when not all the conditions are met', () => {
      before(() => {
        sinon.stub(ConditionsEvaluator.prototype, 'getEvaluator')
          .onFirstCall().returns(alwaysTrueStub)
          .onSecondCall().returns(alwaysFalseStub);
      });
      after(() => ConditionsEvaluator.prototype.getEvaluator.restore());

      it('resolves false if any of the conditions is not met', async () => {
        const result = await ConditionsEvaluator.areMet(conditions, event);
        expect(result).to.be.false;
        conditions.forEach(c => expect(alwaysTrueStub.isMet).to.have.been.calledWithExactly(c, event));
      });
    });

    context('when there is an unexpected exception', () => {
      before(() => {
        sinon.stub(ConditionsEvaluator.prototype, 'isMet').throws(new Error('whoops'));
      });
      after(() => ConditionsEvaluator.prototype.isMet.restore());

      it('resolves false if any of the conditions is not met', async () => {
        const result = await ConditionsEvaluator.areMet(conditions, event);
        expect(result).to.be.false;
        conditions.forEach(c => expect(alwaysTrueStub.isMet).to.have.been.calledWithExactly(c, event));
      });
    });
  });
});
