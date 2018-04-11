import AutomationActionDispatcher from './AutomationActionDispatcher';
import EmailScheduler from './email_scheduler';
import ConditionsEvaluator from './ConditionsEvaluator';

export default class ConditionalAutomationActionDispatcher extends AutomationActionDispatcher {
  constructor(automationAction = {}, events = []) {
    super(automationAction, events);
  }

  getDispatchableEvents() {
    return Promise.filter(this.events, evt => ConditionsEvaluator.areMet(this.automationAction.conditions, evt));
  }

  dispatch() {
    return this.fetchAutomationSender()
      .then(sender => this.buildEmails(sender))
      .then(emails => EmailScheduler.scheduleBatch(emails));
  }
}
