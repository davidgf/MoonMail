import Joi from 'joi';
import ElasticSearch from '../lib/elasticsearch';
import RecipientModel from './RecipientModel';
import stringifyObjectValues from '../lib/utils/stringifyObjectValues';

const indexName = process.env.ES_RECIPIENTS_INDEX_NAME;
const indexType = process.env.ES_RECIPIENTS_INDEX_TYPE;

const listFilterCondition = listId => ({ condition: { queryType: 'match', fieldToQuery: 'listId', searchTerm: listId }, conditionType: 'filter' });
const subscribedCondition = () => ({ condition: { queryType: 'match', fieldToQuery: 'status', searchTerm: 'subscribed' }, conditionType: 'filter' });

function conditionsSchema() {
  return Joi.array().items(Joi.object().keys({
    conditionType: Joi.string().default('filter'),
    condition: Joi.object().keys({
      queryType: Joi.string().required(),
      fieldToQuery: Joi.string().required(),
      searchTerm: Joi.any().required()
    })
  })).min(1);
}

function defaultConditions(listId) {
  return [listFilterCondition(listId)];
}

function stringifyMetadata(recipient) {
  return Object.assign({}, recipient, { metatada: stringifyObjectValues(recipient.metadata || {}) });
}

function updateRecipient(listId, recipientId, newRecipient) {
  return RecipientModel.update(newRecipient, listId, recipientId);
}

function deleteRecipient(listId, recipientId) {
  return RecipientModel.delete(listId, recipientId);
}

function createRecipient(recipient) {
  return RecipientModel.create(stringifyMetadata(recipient));
}

function createESRecipient(recipient) {
  const esId = RecipientModel.buildGlobalId(recipient);
  return RecipientModel.validate(recipient)
    .then(newRecipient => ElasticSearch.createOrUpdateDocument(indexName, indexType, esId, newRecipient));
}

function updateESRecipient(recipient) {
  return createESRecipient(recipient);
}


function deleteESRecipient(id) {
  return ElasticSearch.deleteDocument(client, indexName, indexType, id);
}

function getRecipient({ listId, recipientId }) {
  return ElasticSearch.getDocument(indexName, indexType, RecipientModel.buildGlobalId({ listId, recipientId }))
    .then(result => result._source);
}

function searchRecipientsByListAndConditions(listId, conditions, { from = 0, size = 10 }) {
  return searchRecipientsByConditions([...conditions, ...defaultConditions(listId)], { from, size });
}

function searchRecipientsByConditions(conditions, { from = 0, size = 10 }) {
  return Joi.validate(conditions, conditionsSchema())
    .then(validConditions => ElasticSearch.buildQueryFilters(validConditions).from(from).size(size))
    .then(query => ElasticSearch.search(indexName, indexType, query.build()))
    .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }));
}

export default {
  getRecipient,
  createRecipient,
  createESRecipient,
  updateRecipient,
  updateESRecipient,
  deleteRecipient,
  deleteESRecipient,
  searchRecipientsByListAndConditions
};

