import R from 'ramda';
//     {
//       type: 'aggregationCount',
//       resource: 'recipient.activity',
//       filters: [
//         { campaignId: { eq: sinon.match.string } },
//         { eventType: { eq: 'email.opened' } }
//       ],
//       count: 0,
//       delay: 300
//     }

export default class AggregationCountConditionEvaluator {
  static isMet(condition, event) {
    return (new AggregationCountConditionEvaluator(condition, event)).isMet();
  }

  get conditionFilters() {
    return R.propOr([], 'filters', this.condition);
  }

  constructor(condition = [], event = {}) {
    this.condition = condition;
    this.event = event;
  }

  isMet() {
    return this.fetchResources()
      .then(resources => this.applyFilters(resources))
      .then(filteredResources => (this.condition.count === filteredResources.length))
      .catch(() => false);
  }

  applyFilters(resources) {
    return R.reduce((allResources, filter) => this.applyFilter(filter, allResources), resources, this.conditionFilters);
  }

  applyFilter(filter, resources) {
    const [property, condition] = R.head(R.toPairs(filter));
    const [operator, value] = R.head(R.toPairs(condition));
    const filterFn = this.operatorsMapping(operator)(value);
    const satisfies = R.propSatisfies(filterFn, property);
    return R.filter(satisfies, resources);
  }

  operatorsMapping(operator) {
    const mapping = {
      eq: R.equals,
      gt: R.gt,
      lt: R.lt
    };
    return mapping[operator];
  }

  fetchResources() {
    return Promise.resolve('TODO: it must resolve the appropriate resources \
      according to the condition resource property');
  }
}
