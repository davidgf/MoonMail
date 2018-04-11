import AggregationCountConditionEvaluator from './AggregationCountConditionEvaluator';

export default class ConditionsEvaluator {
  static areMet(conditions, event) {
    return (new ConditionsEvaluator(conditions, event)).areMet();
  }

  constructor(conditions = [], event = {}) {
    this.conditions = conditions;
    this.event = event;
  }

  areMet() {
    return Promise.reduce(this.conditions, (areMet, condition) => (areMet && this.isMet(condition)), true).catch(() => false);
  }

  isMet(condition) {
    const evaluator = this.getEvaluator(condition);
    return evaluator.isMet(condition, this.event);
  }

  getEvaluator(condition) {
    const evaulatorsMapping = {
      aggregationCount: AggregationCountConditionEvaluator
    };
    if (evaulatorsMapping[condition.type]) return evaulatorsMapping[condition.type];
    return { isMet: () => Promise.resolve(false) };
  }
}
