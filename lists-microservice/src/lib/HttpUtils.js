import omitEmpty from 'omit-empty';

const errors = {
  invalidToken: {
    body: { message: 'Missing or invalid JWT' },
    statusCode: 401
  },
  invalidApiKey: {
    body: { message: 'Invalid API Key' },
    statusCode: 401
  },
  missingParameters: {
    body: { message: 'Missing parameters' },
    statusCode: 400
  },
  notAuthorized: {
    body: { message: 'You are not authorized to perform this action' },
    statusCode: 403
  },
  notFound: {
    body: { message: 'Resource not found' },
    statusCode: 404
  },
  internalServerError: {
    body: { message: 'Internal Server Error' },
    statusCode: 500
  },
  serviceUnavailable: {
    body: { message: 'Upstream service unavailable' },
    statusCode: 503
  }
};

function apiErrorHandler(err, fn) {
  const apiError = getApiError(err);
  const apiGatewayError = Object.assign({}, apiError, { body: JSON.stringify(apiError.body) });
  return fn(null, apiGatewayError);
}

function getApiError(error) {
  if (error.message === 'invalid token' || error.message === 'jwt expired') return errors.invalidToken;
  if (error.message === 'Missing required parameters') return errors.missingParameters;
  if (error.statusCode === 404 || error.displayName === 'NotFound') return errors.notFound;
  if (error.message.match(/apiKey/)) return errors.notAuthorized;
  if (error.isJoi) {
    const errorMessages = error.details.map(e => e.message);
    return {
      body: { name: error.name, message: errorMessages.join(';') },
      statusCode: 422
    };
  }
  return errors.internalServerError;
}

function buildApiResponse({ statusCode, body = {}, headers = {} }, callback) {
  const response = {
    statusCode,
    headers: omitEmpty(Object.assign({}, {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
    }, headers)),
    body: JSON.stringify(body)
  };
  callback(null, response);
}

export default {
  apiErrorHandler,
  buildApiResponse
};
