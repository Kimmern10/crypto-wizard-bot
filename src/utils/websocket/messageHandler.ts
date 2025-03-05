
import { WebSocketMessage } from '@/types/websocketTypes';
import { toast } from 'sonner';

/**
 * Processes incoming WebSocket messages
 */
export const handleWebSocketMessage = (
  message: WebSocketMessage,
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
): void => {
  try {
    if (message.type === 'ticker') {
      // Update ticker data in state
      setLastTickerData(prev => ({
        ...prev,
        [message.data.pair]: {
          ...message.data,
          timestamp: new Date().toISOString()
        }
      }));
      
      console.log(`Received ticker data for ${message.data.pair}`);
    } else if (message.type === 'systemStatus') {
      console.log('Received system status:', message.data);
      setConnectionStatus(`System Status: ${message.data.status}`);
      setLastConnectionEvent(`Status update at ${new Date().toLocaleTimeString()}`);
    } else if (message.type === 'heartbeat') {
      console.log('Received heartbeat');
    } else if (message.type === 'error') {
      console.error('WebSocket error message:', message.data);
      setConnectionStatus(`Error: ${message.data.errorMessage || 'Unknown error'}`);
      setLastConnectionEvent(`Error at ${new Date().toLocaleTimeString()}`);
      toast.error(`WebSocket error: ${message.data.errorMessage || 'Unknown error'}`);
    } else if (message.type === 'connectionStatus') {
      console.log('Connection status change:', message.data);
      setConnectionStatus(message.data.message || message.data.status);
      setLastConnectionEvent(`Status change at ${new Date().toLocaleTimeString()}`);
    } else if (message.type === 'modeChange') {
      console.log('Mode change:', message.data);
      setConnectionStatus(`Demo Mode (${message.data.reason})`);
      setLastConnectionEvent(`Mode change at ${new Date().toLocaleTimeString()}`);
    } else {
      console.log('Received other message type:', message.type, message.data);
    }
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
  }
};
