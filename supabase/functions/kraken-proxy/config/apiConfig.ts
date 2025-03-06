
// Kraken API configuration

// API base URL
export const API_URL = "https://api.kraken.com";

// API version
export const API_VERSION = "0";

// Request timeout in milliseconds (10 seconds)
export const REQUEST_TIMEOUT = 10000;

// Maximum retries for failed requests
export const MAX_RETRIES = 2;

// Delay between retries in milliseconds
export const RETRY_DELAY = 1000;

// Rate limits configuration
export const RATE_LIMITS = {
  ip: {
    requests: 30,
    window: 60 // 60 seconds window
  },
  user: {
    requests: 20,
    window: 60 // 60 seconds window
  }
};
