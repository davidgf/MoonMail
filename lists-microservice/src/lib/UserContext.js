import FunctionsClient from './FunctionsClient';

async function byApiKey(apiKey) {
  const result = await FunctionsClient.execute(process.env.GET_USER_CONTEXT_FUNCTION, { apiKey });
  if (!result || !result.id) throw new Error('Cant validate the apiKey');
  return result;
}

export default {
  byApiKey
};
