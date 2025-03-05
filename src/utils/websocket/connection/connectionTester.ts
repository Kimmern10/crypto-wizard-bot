
import { toast } from 'sonner';

/**
 * Checks if a WebSocket connection is possible
 */
export const checkWebSocketConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing WebSocket connection to Kraken...');
    
    return new Promise((resolve) => {
      // Test connection with increased timeout and better error handling
      const ws = new WebSocket('wss://ws.kraken.com');
      
      // Set a timeout in case the connection hangs
      const timeout = setTimeout(() => {
        console.warn('WebSocket connection test timed out');
        try {
          ws.close();
        } catch (e) {
          // Ignore close errors
        }
        resolve(false);
      }, 7000);  // Increased timeout for slower connections
      
      ws.onopen = () => {
        console.log('WebSocket connection test successful');
        clearTimeout(timeout);
        // Send a ping to verify connection is working
        try {
          ws.send(JSON.stringify({ event: 'ping' }));
          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 300);
        } catch (error) {
          console.error('Error sending ping during connection test:', error);
          ws.close();
          resolve(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket connection test error:', error);
        clearTimeout(timeout);
        try {
          ws.close();
        } catch (e) {
          // Ignore close errors
        }
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Error in WebSocket connection check:', error);
    return false;
  }
};

/**
 * Checks if there are CORS restrictions
 */
export const checkCorsRestrictions = async (): Promise<boolean> => {
  try {
    console.log('Testing CORS restrictions with Kraken API...');
    
    // Try to make a simple GET request to Kraken public API
    const response = await fetch('https://api.kraken.com/0/public/Time', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Important: Do not use no-cors mode so we can detect CORS errors
    });
    
    // If we get here without error, CORS is allowed
    console.log('CORS check successful:', response.status);
    return false;
  } catch (error) {
    // If we get an error, it's likely due to CORS restrictions
    console.error('CORS check failed:', error);
    return true;
  }
};
