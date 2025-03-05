
import { API_URL, API_VERSION, REQUEST_TIMEOUT } from "../config/apiConfig.ts";
import { corsHeaders } from "../utils/corsHeaders.ts";

// Service to handle communication with Kraken API
export const callKrakenApi = async (
  apiUrl: string, 
  options: RequestInit
): Promise<{ data: any; status: number }> => {
  console.log(`Sending request to: ${apiUrl}`);
  
  // Set timeout for the request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.error(`Request to ${apiUrl} timed out after ${REQUEST_TIMEOUT}ms`);
  }, REQUEST_TIMEOUT);
  
  // Attach the abort signal to the options
  options.signal = controller.signal;
  
  try {
    // Send request to Kraken API with timeout handling
    const response = await fetch(apiUrl, options);
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Parse response
    const responseText = await response.text();
    console.log(`Got response from Kraken API with status: ${response.status}`);
    
    // Only log a snippet of the response to avoid excessive logging
    const responsePreview = responseText.length > 200 
      ? `${responseText.substring(0, 200)}...` 
      : responseText;
    console.log(`Response text preview: ${responsePreview}`);
    
    // Parse JSON response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`Error parsing JSON response: ${e.message}`);
      console.error(`Response received: ${responseText.substring(0, 500)}`);
      throw new Error(`Invalid JSON response from Kraken: ${responseText.substring(0, 100)}...`);
    }
    
    // Check for Kraken errors
    if (responseData.error && responseData.error.length > 0) {
      console.warn(`Kraken API returned errors: ${JSON.stringify(responseData.error)}`);
    }
    
    return { data: responseData, status: response.status };
  } catch (error) {
    // Check if it's an abort error (timeout)
    if (error.name === 'AbortError') {
      console.error(`Request to Kraken API timed out after ${REQUEST_TIMEOUT}ms`);
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
    }
    
    // For other network errors
    console.error('Network error sending request to Kraken:', error);
    
    // Provide more detailed error message
    let errorMessage = 'Network error calling Kraken API';
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    if (error.cause) {
      errorMessage += ` (${error.cause})`;
    }
    
    throw new Error(errorMessage);
  } finally {
    // Ensure timeout is cleared in all cases
    clearTimeout(timeoutId);
  }
};

// Build the full API URL
export const buildApiUrl = (path: string): string => {
  // Sanitize path to ensure proper formatting
  const sanitizedPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_URL}/${API_VERSION}/${sanitizedPath}`;
};

// Map Kraken errors to appropriate HTTP status codes
export const mapErrorToStatusCode = (errorMsg: string): number => {
  if (!errorMsg) {
    return 500; // Default to 500 for empty error messages
  }
  
  // Authentication errors
  if (errorMsg.includes('Invalid key') || 
      errorMsg.includes('Invalid signature') || 
      errorMsg.includes('Invalid nonce') || 
      errorMsg.includes('Permission denied') ||
      errorMsg.includes('Invalid credentials')) {
    return 403; // Forbidden / authentication error
  } 
  // Rate limiting
  else if (errorMsg.includes('Rate limit exceeded')) {
    return 429; // Too many requests
  } 
  // Bad requests
  else if (errorMsg.includes('Unknown asset pair') || 
           errorMsg.includes('Invalid arguments') ||
           errorMsg.includes('Invalid order') ||
           errorMsg.includes('Unknown order')) {
    return 400; // Bad request
  } 
  // Service issues
  else if (errorMsg.includes('Service unavailable') ||
           errorMsg.includes('Temporary service issue')) {
    return 503; // Service unavailable
  }
  // Timeout issues
  else if (errorMsg.includes('timed out') ||
           errorMsg.includes('timeout')) {
    return 504; // Gateway timeout
  }
  
  // Default to 500 for unknown errors
  return 500;
};

// Utility function to validate API response
export const validateApiResponse = (data: any): boolean => {
  // Check if the data has the expected Kraken API format
  if (!data) {
    return false;
  }
  
  // All valid Kraken responses should have a 'result' property
  // Even if there's an error, it should have an 'error' array
  if (!('result' in data) && (!('error' in data) || !Array.isArray(data.error))) {
    return false;
  }
  
  return true;
};

