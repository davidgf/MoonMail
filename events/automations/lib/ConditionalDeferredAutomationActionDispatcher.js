import R from 'ramda';
import AutomationActionDispatcher from './AutomationActionDispatcher';
import JobScheduler from './job_scheduler';

export default class ConditionalAutomationActionDispatcher extends AutomationActionDispatcher {
  constructor(automationAction = {}, events = []) {
    super(automationAction, events);
  }

  get maxConditionsDelay() {
    const reduceMax = R.reduce((maxDelay, condition) => R.max(maxDelay, R.propOr(0, 'delay', condition)), 0);
    return R.pipe(
      R.propOr([], 'conditions'),
      reduceMax
    )(this.automationAction);
  }

  dispatch() {
    const payload = { automationAction: this.automationAction, events: this.events };
    return JobScheduler.performLater('ScheduleEmailsIfConditionsMet', this.maxConditionsDelay, payload);
  }
}
