
import { toast } from 'sonner';
import { WebSocketManager, WebSocketMessage } from '@/utils/websocketManager';

export const setupWebSocket = (
  wsManager: WebSocketManager, 
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
) => {
  // Log connecting status
  setConnectionStatus('Connecting to Kraken WebSocket...');
  console.log('Attempting to connect to Kraken WebSocket...');
  
  // Track reconnection attempts for UI feedback
  let reconnectCount = 0;
  
  const connectAndSubscribe = () => {
    wsManager.connect()
      .then(() => {
        setConnectionStatus('Connected to WebSocket');
        setLastConnectionEvent(`Connected at ${new Date().toLocaleTimeString()}`);
        console.log('Successfully connected to Kraken WebSocket');
        
        // Only show toast on initial connection or after multiple reconnects
        if (reconnectCount === 0 || reconnectCount > 2) {
          toast.success('Connected to Kraken WebSocket');
        }
        
        // Reset reconnect counter on successful connection
        reconnectCount = 0;
        
        // Subscribe to ticker data for multiple pairs
        const pairs = ['XBT/USD', 'ETH/USD', 'XRP/USD', 'DOT/USD', 'ADA/USD'];
        
        // Subscribe to each pair individually with a small delay
        // to avoid overwhelming the WebSocket
        pairs.forEach((pair, index) => {
          setTimeout(() => {
            if (wsManager.isConnected()) {
              console.log(`Subscribing to ${pair} ticker...`);
              wsManager.send({
                method: 'subscribe',
                params: {
                  name: 'ticker',
                  pair: [pair]
                }
              });
            } else {
              console.warn(`Cannot subscribe to ${pair}: WebSocket not connected`);
            }
          }, index * 300); // 300ms delay between subscriptions
        });
        
        // Register handler for incoming messages
        const unsubscribe = wsManager.subscribe((message: WebSocketMessage) => {
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
            } else {
              console.log('Received other message type:', message.type, message.data);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        });
        
        return unsubscribe;
      })
      .catch(error => {
        reconnectCount++;
        console.error('WebSocket connection failed:', error);
        setConnectionStatus(`WebSocket connection failed (attempt ${reconnectCount})`);
        setLastConnectionEvent(`Failed at ${new Date().toLocaleTimeString()}`);
        
        // Only show toast on initial failure or after multiple reconnects
        if (reconnectCount === 1 || reconnectCount % 3 === 0) {
          toast.error('Failed to connect to Kraken WebSocket');
        }
        
        // Attempt to reconnect after a delay
        setTimeout(connectAndSubscribe, 5000);
      });
  };
  
  // Start initial connection
  connectAndSubscribe();
  
  // Return a cleanup function
  return () => {
    try {
      if (wsManager && wsManager.isConnected()) {
        wsManager.disconnect();
        console.log('WebSocket connection closed by cleanup');
      }
    } catch (error) {
      console.error('Error during WebSocket cleanup:', error);
    }
  };
};
