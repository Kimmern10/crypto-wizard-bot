
import { WebSocketMessage } from '@/types/websocketTypes';
import { toast } from 'sonner';

/**
 * Processes incoming WebSocket messages
 */
export const handleWebSocketMessage = (
  message: WebSocketMessage,
  setSubscriptionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  updateChartData?: (updateFn: (prev: any) => any) => void
): void => {
  try {
    // Match message type to the appropriate handler
    switch (message.type) {
      case 'ticker':
        handleTickerMessage(message, updateChartData);
        break;
      case 'systemStatus':
        handleSystemStatusMessage(message, setSubscriptionStatus, setLastConnectionEvent);
        break;
      case 'heartbeat':
        console.log('Received heartbeat');
        break;
      case 'pong':
        handlePongMessage(setLastConnectionEvent);
        break;
      case 'error':
        handleErrorMessage(message, setSubscriptionStatus, setLastConnectionEvent);
        break;
      case 'connectionStatus':
        handleConnectionStatusMessage(message, setSubscriptionStatus, setLastConnectionEvent);
        break;
      case 'modeChange':
        handleModeChangeMessage(message, setSubscriptionStatus, setLastConnectionEvent);
        break;
      case 'subscriptionStatus':
        handleSubscriptionStatusMessage(message, setLastConnectionEvent);
        break;
      default:
        console.log('Received other message type:', message.type, message.data);
    }
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
  }
};

// Helper functions to handle specific message types
function handleTickerMessage(
  message: WebSocketMessage,
  updateChartData?: (updateFn: (prev: any) => any) => void
): void {
  // Validate ticker data
  if (!message.data || !message.data.pair || !message.data.c || !message.data.c[0]) {
    console.warn('Received invalid ticker data:', message);
    return;
  }
  
  // Call the chart data update function if provided
  if (updateChartData) {
    updateChartData((prev) => prev);
  }
  
  console.log(`Received ticker data for ${message.data.pair}`);
}

function handleSystemStatusMessage(
  message: WebSocketMessage,
  setSubscriptionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void
): void {
  console.log('Received system status:', message.data);
  setSubscriptionStatus(`System Status: ${message.data.status}`);
  setLastConnectionEvent(`Status update at ${new Date().toLocaleTimeString()}`);
}

function handlePongMessage(
  setLastConnectionEvent: (event: string) => void
): void {
  console.log('Received pong response');
  setLastConnectionEvent(`Heartbeat at ${new Date().toLocaleTimeString()}`);
}

function handleErrorMessage(
  message: WebSocketMessage,
  setSubscriptionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void
): void {
  console.error('WebSocket error message:', message.data);
  setSubscriptionStatus(`Error: ${message.data.errorMessage || 'Unknown error'}`);
  setLastConnectionEvent(`Error at ${new Date().toLocaleTimeString()}`);
  toast.error(`WebSocket error: ${message.data.errorMessage || 'Unknown error'}`);
}

function handleConnectionStatusMessage(
  message: WebSocketMessage,
  setSubscriptionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void
): void {
  console.log('Connection status change:', message.data);
  setSubscriptionStatus(message.data.message || message.data.status);
  setLastConnectionEvent(`Status change at ${new Date().toLocaleTimeString()}`);
}

function handleModeChangeMessage(
  message: WebSocketMessage,
  setSubscriptionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void
): void {
  console.log('Mode change:', message.data);
  setSubscriptionStatus(`Demo Mode (${message.data.reason})`);
  setLastConnectionEvent(`Mode change at ${new Date().toLocaleTimeString()}`);
}

function handleSubscriptionStatusMessage(
  message: WebSocketMessage,
  setLastConnectionEvent: (event: string) => void
): void {
  console.log('Subscription status:', message.data);
  
  if (message.data.status === 'subscribed') {
    const pairs = Array.isArray(message.data.pair) 
      ? message.data.pair.join(', ') 
      : message.data.pair;
    setLastConnectionEvent(`Subscribed to ${pairs} at ${new Date().toLocaleTimeString()}`);
  } else if (message.data.status === 'unsubscribed') {
    const pairs = Array.isArray(message.data.pair) 
      ? message.data.pair.join(', ') 
      : message.data.pair;
    setLastConnectionEvent(`Unsubscribed from ${pairs} at ${new Date().toLocaleTimeString()}`);
  } else if (message.data.status === 'error') {
    console.error('Subscription error:', message.data);
    setLastConnectionEvent(`Subscription error at ${new Date().toLocaleTimeString()}`);
    toast.error(`Subscription error: ${message.data.errorMessage || 'Unknown error'}`);
  }
}
