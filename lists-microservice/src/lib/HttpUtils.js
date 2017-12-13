import omitEmpty from 'omit-empty';

const errors = {
  invalidToken: {
    message: 'Missing or invalid JWT',
    statusCode: 401
  },
  invalidApiKey: {
    message: 'Invalid API Key',
    statusCode: 401
  },
  missingParameters: {
    message: 'Missing parameters',
    statusCode: 400
  },
  notAuthorized: {
    message: 'You are not authorized to perform this action',
    statusCode: 403
  },
  internalServerError: {
    message: 'Internal Server Error',
    statusCode: 500
  },
  serviceUnavailable: {
    message: 'Upstream service unavailable',
    statusCode: 503
  }
};

function apiErrorHandler(err, fn) {
  const apiError = getApiError(err);
  return fn(null, apiError);
}

function getApiError(error) {
  if (error.message === 'invalid token' || error.message === 'jwt expired') return errors.invalidToken;
  if (error.message === 'Missing required parameters') return errors.missingParameters;
  if (error.message.match(/apiKey/)) return errors.notAuthorized;
  if (error.isJoi) {
    return {
      message: Object.assign({}, { name: error.name, details: error.details }),
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
