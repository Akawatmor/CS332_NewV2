// Error Handler Utility for SalePoint Solution
// Filters and masks backend errors to provide user-friendly messages

/**
 * Maps technical error messages to user-friendly messages
 */
const ERROR_MESSAGES = {
  // Network and connectivity errors
  NETWORK_ERROR: 'Connection failed. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Service temporarily unavailable. Please try again later.',
  
  // Authentication errors
  AUTH_ERROR: 'Authentication failed. Please log in again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  
  // Data validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested item was not found.',
  DUPLICATE_ERROR: 'This item already exists.',
  
  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  DATABASE_ERROR: 'Data service temporarily unavailable. Please try again later.',
  INTERNAL_ERROR: 'Service temporarily unavailable. Please try again later.'
};

/**
 * Technical error patterns that should be masked
 */
const TECHNICAL_ERROR_PATTERNS = [
  /internal server error/i,
  /database.*error/i,
  /connection.*failed/i,
  /lambda.*error/i,
  /dynamodb/i,
  /cognito/i,
  /aws.*error/i,
  /stack trace/i,
  /at.*\.(js|ts):\d+/i,
  /error.*code.*\d{3,}/i,
  /mysql.*error/i,
  /sql.*error/i,
  /timeout.*exceeded/i,
  /permission.*denied/i,
  /access.*denied/i,
  /invalid.*token/i,
  /expired.*token/i,
  /malformed.*request/i,
  /serialization.*error/i,
  /deserialization.*error/i
];

/**
 * HTTP status code to user-friendly message mapping
 */
const STATUS_MESSAGES = {
  400: ERROR_MESSAGES.VALIDATION_ERROR,
  401: ERROR_MESSAGES.AUTH_ERROR,
  403: ERROR_MESSAGES.PERMISSION_ERROR,
  404: ERROR_MESSAGES.NOT_FOUND,
  408: ERROR_MESSAGES.TIMEOUT_ERROR,
  409: ERROR_MESSAGES.DUPLICATE_ERROR,
  429: 'Too many requests. Please wait a moment and try again.',
  500: ERROR_MESSAGES.INTERNAL_ERROR,
  502: ERROR_MESSAGES.SERVER_ERROR,
  503: ERROR_MESSAGES.SERVER_ERROR,
  504: ERROR_MESSAGES.TIMEOUT_ERROR
};

/**
 * Determines if an error message contains technical details that should be hidden
 * @param {string} message - The error message to check
 * @returns {boolean} - True if the message contains technical details
 */
function containsTechnicalDetails(message) {
  if (!message || typeof message !== 'string') return false;
  
  return TECHNICAL_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Extracts user-friendly error message from technical error
 * @param {string} message - The technical error message
 * @returns {string} - User-friendly error message
 */
function extractUserFriendlyMessage(message) {
  if (!message) return ERROR_MESSAGES.UNKNOWN_ERROR;
  
  const lowerMessage = message.toLowerCase();
  
  // Check for specific error types
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (lowerMessage.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }
  
  if (lowerMessage.includes('auth') || lowerMessage.includes('token')) {
    return ERROR_MESSAGES.AUTH_ERROR;
  }
  
  if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
    return ERROR_MESSAGES.PERMISSION_ERROR;
  }
  
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return ERROR_MESSAGES.VALIDATION_ERROR;
  }
  
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return ERROR_MESSAGES.NOT_FOUND;
  }
  
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
    return ERROR_MESSAGES.DUPLICATE_ERROR;
  }
  
  if (lowerMessage.includes('database') || lowerMessage.includes('sql')) {
    return ERROR_MESSAGES.DATABASE_ERROR;
  }
  
  // Default to generic error
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Main error handler function - processes API errors and returns user-friendly messages
 * @param {Error|Object} error - The error object from API call
 * @returns {Object} - Processed error with user-friendly message
 */
export function handleApiError(error) {
  console.error('API Error (detailed for debugging):', error);
  
  // Network error (no response)
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        message: ERROR_MESSAGES.TIMEOUT_ERROR,
        type: 'timeout',
        status: null
      };
    }
    
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      type: 'network',
      status: null
    };
  }
  
  // HTTP error with response
  const { status, data } = error.response;
  let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
  
  // Check for status-specific messages first
  if (STATUS_MESSAGES[status]) {
    errorMessage = STATUS_MESSAGES[status];
  } else {
    // Try to extract message from response
    let responseMessage = '';
    
    if (data) {
      if (typeof data === 'string') {
        responseMessage = data;
      } else if (data.message) {
        responseMessage = data.message;
      } else if (data.error) {
        responseMessage = typeof data.error === 'string' ? data.error : data.error.message;
      } else if (data.errorMessage) {
        responseMessage = data.errorMessage;
      }
    }
    
    // Check if the response message contains technical details
    if (responseMessage && !containsTechnicalDetails(responseMessage)) {
      // Safe to show the response message
      errorMessage = responseMessage;
    } else if (responseMessage) {
      // Contains technical details, extract user-friendly message
      errorMessage = extractUserFriendlyMessage(responseMessage);
    }
  }
  
  return {
    message: errorMessage,
    type: 'api',
    status: status,
    originalError: process.env.NODE_ENV === 'development' ? error : undefined
  };
}

/**
 * Handles form validation errors
 * @param {Object} validationErrors - Validation errors object
 * @returns {string} - User-friendly validation error message
 */
export function handleValidationError(validationErrors) {
  if (!validationErrors || typeof validationErrors !== 'object') {
    return ERROR_MESSAGES.VALIDATION_ERROR;
  }
  
  const errorKeys = Object.keys(validationErrors);
  if (errorKeys.length === 0) {
    return ERROR_MESSAGES.VALIDATION_ERROR;
  }
  
  // Return the first validation error message
  const firstError = validationErrors[errorKeys[0]];
  return typeof firstError === 'string' ? firstError : ERROR_MESSAGES.VALIDATION_ERROR;
}

/**
 * Creates an error object for display in UI components
 * @param {string} message - Error message
 * @param {string} type - Error type (error, warning, info)
 * @returns {Object} - Error object for UI display
 */
export function createErrorForDisplay(message, type = 'error') {
  return {
    message: message || ERROR_MESSAGES.UNKNOWN_ERROR,
    type: type,
    timestamp: new Date().toISOString()
  };
}

/**
 * Logs errors for debugging while showing user-friendly messages
 * @param {string} context - Context where error occurred
 * @param {Error} error - The original error
 * @param {Object} additionalInfo - Additional debugging information
 */
export function logError(context, error, additionalInfo = {}) {
  console.error(`Error in ${context}:`, {
    error: error,
    message: error?.message,
    status: error?.response?.status,
    data: error?.response?.data,
    additionalInfo: additionalInfo,
    timestamp: new Date().toISOString()
  });
}

// Export error message constants for use in components
export { ERROR_MESSAGES };