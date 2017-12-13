import Joi from 'joi';
import RecipientModel from './RecipientModel';

const listRecipientImported = 'lists.recipientImported';
const listRecipientCreated = 'lists.recipientCreated';
const listRecipientUpdated = 'lists.recipientUpdated';
const listRecipientDeleted = 'lists.recipientDeleted';

const eventSchemas = {
  [listRecipientImported]: {
    schema: Joi.object({
      type: listRecipientImported,
      payload: Joi.object({
        recipient: Joi.object({
          email: Joi.string().required().email(),
          listId: Joi.string().required(),
          userId: Joi.string().required(),
          metadata: Joi.object().pattern(/^\S+$/, Joi.any())
        }).required(),
        totalRecipients: Joi.number().required(),
        recipientIndex: Joi.number().required(),
        importId: Joi.string().required()
      }).required()
    })
  },
  [listRecipientCreated]: {
    schema: Joi.object({
      type: listRecipientCreated,
      payload: Joi.object({
        recipient: {
          listId: Joi.string().required(),
          userId: Joi.string().required(),
          email: Joi.string().required().email(),
          subscriptionOrigin: Joi.string().valid(Object.values(RecipientModel.subscriptionOrigins)),
          isConfirmed: Joi.boolean().when('status', { is: RecipientModel.statuses.awaitingConfirmation, then: Joi.only(false).default(false), otherwise: Joi.only(true).default(true) }),
          status: Joi.string().valid(RecipientModel.statuses.subscribed, RecipientModel.statuses.awaitingConfirmation).required(),
          metadata: Joi.object().pattern(/^\S+$/, Joi.required())
          // systemMetadata: Joi.object().pattern(/^\S+$/, Joi.any())
        }
      }).required()
    })
  },
  [listRecipientUpdated]: {
    schema: Joi.object({
      type: listRecipientUpdated,
      payload: Joi.object({
        listId: Joi.string().required(),
        userId: Joi.string().required(),
        id: Joi.string().required(),
        data: Joi.object({
          status: Joi.string().valid(Object.values(RecipientModel.statuses)),
          isConfirmed: Joi.boolean().when('status', { is: RecipientModel.statuses.awaitingConfirmation, then: Joi.only(false).default(false), otherwise: Joi.only(true).default(true) }),
          metadata: Joi.object().pattern(/^\S+$/, Joi.required())
        }).required()
      }).required()
    })
  },
  [listRecipientDeleted]: {
    schema: Joi.object({
      type: listRecipientDeleted,
      payload: Joi.object({
        listId: Joi.string().required(),
        userId: Joi.string().required(),
        id: Joi.string().required()
      })
    })
  }
};

const validate = event => Joi.validate(event, eventSchemas[event.type].schema);

const isValid = (event) => {
  try {
    const result = validate(event);
    return !result.error;
  } catch (err) {
    return false;
  }
};

function buildRecipientCreatedEvent({ listId, userId, recipient }) {
  return validate({
    type: listRecipientCreated,
    payload: { recipient: Object.assign({}, recipient, { listId, userId }) }
  });
}

function buildRecipientDeleteEvent({ listId, userId, id }) {
  return validate({
    type: listRecipientUpdated,
    payload: { listId, userId, id }
  });
}

function buildRecipientUpdatedEvent({ listId, userId, id, data }) {
  return validate({
    type: listRecipientUpdated,
    payload: { listId, userId, id, data }
  });
}

export default {
  listRecipientImported,
  listRecipientCreated,
  listRecipientUpdated,
  listRecipientDeleted,
  isValid,
  validate,
  buildRecipientCreatedEvent,
  buildRecipientDeleteEvent,
  buildRecipientUpdatedEvent
};
