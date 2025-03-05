
// Kraken API configuration
export const API_URL = 'https://api.kraken.com';
export const API_VERSION = '0';

// Rate limiting configuration
export const RATE_LIMITS = {
  // Limits per IP address
  ip: {
    perMinute: 30,
    perHour: 300
  },
  // Limits per user ID
  user: {
    perMinute: 60,
    perHour: 600
  }
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;
