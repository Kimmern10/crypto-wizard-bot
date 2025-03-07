
// Service for Kraken API proxy response handling
// This provides error messages when authentication fails

/**
 * Generates error responses for Kraken API endpoints
 * @param endpoint The API endpoint that was called
 * @param reason The reason for the error
 * @returns Error response data
 */
export const getErrorResponse = (endpoint: string, reason: string = 'authentication_required'): any => {
  console.log(`Generating error response for endpoint: ${endpoint}, reason: ${reason}`);
  
  const errorMessages = {
    'authentication_required': 'Authentication required. Please log in and configure valid API credentials.',
    'invalid_credentials': 'The provided API credentials are invalid or insufficient for this operation.',
    'permission_denied': 'Your API credentials do not have permission to access this endpoint.',
    'service_unavailable': 'The Kraken service is temporarily unavailable. Please try again later.'
  };
  
  const message = errorMessages[reason] || 'An unknown error occurred';
  
  return {
    error: [message],
    result: null
  };
};
