import AWS from 'aws-sdk';
import AWSESConnection from 'http-aws-es';
import Elasticsearch from 'elasticsearch';
import bodyBuilder from 'bodybuilder';
import App from '../../App';

function awsCredentials() {
  return new AWS.EnvironmentCredentials('AWS');
}

const ElasticSearch = {
  getDocument(indexName, indexType, id, esClient = null) {
    const client = esClient || this.createClient({});
    App.logger().debug('ElasticSearch.get', id);
    return client.get({
      index: indexName,
      type: indexType,
      id
    });
  },

  deleteDocument(indexName, indexType, id, esClient = null) {
    const client = esClient || this.createClient({});
    return client.delete({
      index: indexName,
      type: indexType,
      id
    });
  },

  createOrUpdateDocument(indexName, indexType, id, item, esClient = null) {
    const client = esClient || this.createClient({});
    return client.index({
      index: indexName,
      type: indexType,
      id,
      body: item
    });
  },

  search(indexName, indexType, queryBody, esClient = null) {
    const client = esClient || this.createClient({});
    const esQueryRequest = {
      index: indexName,
      type: indexType,
      body: queryBody
    };
    App.logger().debug('ElasticSearch.search', JSON.stringify(esQueryRequest));
    return client.search(esQueryRequest);
  },

  // {
  //   "bool" : {
  //      "must" :     [], // ANDs (Query scope)
  //      "should" :   [], // ORs (Query scope)
  //      "must_not" : [], // NOTs (Query scope)
  //      "filter":    []  // (Filter scope) Filters: currently supports AND operations between all filters
  //   }
  // }

  // Note that to perform term queries we need to access the .keyword field instead of the raw one
  // For more details visit https://www.elastic.co/guide/en/elasticsearch/reference/5.3/multi-fields.html
  buildQueryFilters(conditions) {
    return conditions
      .filter(conditionObject => conditionObject.conditionType === 'filter') // we only support must queries for now
      .reduce((aggregatedBody, nextCondition) => {
        const fieldToQuery = nextCondition.condition.queryType.match(/term/) ? `${nextCondition.condition.fieldToQuery}.keyword` : nextCondition.condition.fieldToQuery;
        return aggregatedBody.filter(nextCondition.condition.queryType, fieldToQuery, nextCondition.condition.searchTerm);
      }, bodyBuilder());
  },

  createClient({ credentials = awsCredentials(), elasticSearchHost = process.env.ES_HOST, elasticSearchRegion = process.env.ES_REGION }) {
    this.esClient = this.client || new Elasticsearch.Client({
      hosts: elasticSearchHost,
      connectionClass: AWSESConnection,
      amazonES: {
        region: elasticSearchRegion,
        credentials
      }
    });
    return this.esClient;
  },

  esClient: null
};

export default ElasticSearch;
