
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
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  options.signal = controller.signal;
  
  try {
    // Send request to Kraken API
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
      throw new Error(`Invalid JSON response from Kraken: ${responseText.substring(0, 100)}...`);
    }
    
    return { data: responseData, status: response.status };
  } catch (error) {
    // Check if it's an abort error (timeout)
    if (error.name === 'AbortError') {
      console.error('Request to Kraken API timed out');
      throw new Error('Request timed out');
    }
    
    console.error('Network error sending request to Kraken:', error);
    throw new Error('Network error calling Kraken API: ' + error.message);
  } finally {
    // Ensure timeout is cleared in all cases
    clearTimeout(timeoutId);
  }
};

// Build the full API URL
export const buildApiUrl = (path: string): string => {
  return `${API_URL}/${API_VERSION}/${path}`;
};

// Map Kraken errors to appropriate HTTP status codes
export const mapErrorToStatusCode = (errorMsg: string): number => {
  if (errorMsg.includes('Invalid key') || errorMsg.includes('Invalid signature') || 
      errorMsg.includes('Invalid nonce') || errorMsg.includes('Permission denied')) {
    return 403; // Forbidden / authentication error
  } else if (errorMsg.includes('Rate limit exceeded')) {
    return 429; // Too many requests
  } else if (errorMsg.includes('Unknown asset pair')) {
    return 400; // Bad request
  } else if (errorMsg.includes('Service unavailable')) {
    return 503; // Service unavailable
  }
  
  return 500; // Default to 500 for unknown errors
};
