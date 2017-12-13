import Promise from 'bluebird';
import { Recipient } from 'moonmail-models';
import Joi from 'joi';
import moment from 'moment';
import omitEmpty from 'omit-empty';
import base64url from 'base64-url';
import chunkArray from '../lib/utils/chunkArray';


// TODO: Improve me, extract changes to the upstream mm-model
export default class RecipientModel extends Recipient {
  static get createSchema() {
    return Joi.object({
      listId: Joi.string().required(),
      userId: Joi.string().required(),
      id: Joi.string().required(),
      email: Joi.string().required().email(),
      subscriptionOrigin: Joi.string().valid(Object.values(RecipientModel.subscriptionOrigins)).required(),
      isConfirmed: Joi.boolean().when('status', { is: RecipientModel.statuses.awaitingConfirmation, then: Joi.only(false).default(false), otherwise: Joi.only(true).default(true) }),
      status: Joi.string().valid(RecipientModel.statuses.subscribed, RecipientModel.statuses.awaitingConfirmation).required(),
      metadata: Joi.object().pattern(/^\S+$/, Joi.required()),
      systemMetadata: Joi.object().pattern(/^\S+$/, Joi.required())
    });
  }

  static get updateSchema() {
    return Joi.object({
      status: Joi.string().valid(Object.values(RecipientModel.statuses)),
      isConfirmed: Joi.boolean(),
      metadata: Joi.object().pattern(/^\S+$/, Joi.required())
    });
  }

  // TODO: Move me to MM-models
  static validate(schema, recipient, options = {}) {
    if (!schema) return Promise.resolve(recipient);
    return Joi.validate(recipient, schema, options);
  }

  static buildId(recipient) {
    return base64url.encode(recipient.email);
  }

  static buildGlobalId({ listId, recipientId, recipient }) {
    const idBuilder = (lId, recptId) => `${lId}-${recptId}`;
    if (recipient) return idBuilder(recipient.listId, recipient.id);
    return idBuilder(listId, recipientId);
  }

  static async find(hash, range, options = {}) {
    const result = await this.get(hash, range, options);
    if (Object.keys(result).length === 0) return Promise.reject(new Error('Item not found'));
    return result;
  }

  // To be ported to the upstream Model
  static update(params, hash, range) {
    return this.validate(this.updateSchema, params)
      .then(() => super.update(params, hash, range));
  }

  static create(item) {
    const toSaveItem = omitEmpty(Object.assign({}, { id: this.buildId(item), createdAt: moment().unix() }, item));
    return this.validate(this.createSchema, toSaveItem)
      .then(() => this.save(toSaveItem))
      .then(() => toSaveItem);
  }

  static save(item) {
    return super.save(item);
  }

  static batchCreate(items) {
    return this.saveAll(items);
  }

  // TODO: Improve me, retry only unprocessed items
  // Improve error and probably move it to saveBatch
  static saveAll(items) {
    if (items.length === 0) return Promise.resolve({});
    const itemsToSave = items.map(item => Object.assign({}, { id: this.buildId(item), createdAt: moment().unix() }, item));
    return super.saveAll(itemsToSave)
      .then((data) => {
        if (data.UnprocessedItems) {
          if (Object.keys(data.UnprocessedItems).length > 0) return Promise.reject(new Error('Unprocessed items'));
        }
        return data;
      });
  }

  static saveBatch(items) {
    return Promise.resolve(chunkArray(items, 25))
      .then(itemsChunks => Promise.map(itemsChunks, itms => this.saveAll(itms), { concurrency: 1 }));
  }
}

