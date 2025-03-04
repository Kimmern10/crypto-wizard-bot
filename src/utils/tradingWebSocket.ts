
import { toast } from 'sonner';
import { WebSocketManager, WebSocketMessage } from '@/utils/websocketManager';

export const setupWebSocket = (
  wsManager: WebSocketManager, 
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
) => {
  wsManager.connect()
    .then(() => {
      setConnectionStatus('Connected to WebSocket');
      setLastConnectionEvent(`Connected at ${new Date().toLocaleTimeString()}`);
      toast.success('Connected to Kraken WebSocket');
      
      const pairs = ['XBT/USD', 'ETH/USD', 'XRP/USD'];
      pairs.forEach(pair => {
        wsManager.send({
          method: 'subscribe',
          params: {
            name: 'ticker',
            pair: [pair]
          }
        });
      });
      
      const unsubscribe = wsManager.subscribe((message: WebSocketMessage) => {
        console.log('Received WebSocket message:', message);
        
        if (message.type === 'ticker') {
          setLastTickerData(prev => ({
            ...prev,
            [message.data.pair]: message.data
          }));
        } else if (message.type === 'systemStatus') {
          setConnectionStatus(`System Status: ${message.data.status}`);
          setLastConnectionEvent(`Status update at ${new Date().toLocaleTimeString()}`);
        }
      });
      
      return () => {
        unsubscribe();
        wsManager.disconnect();
      };
    })
    .catch(error => {
      console.error('WebSocket connection failed:', error);
      setConnectionStatus('WebSocket connection failed');
      setLastConnectionEvent(`Failed at ${new Date().toLocaleTimeString()}`);
      toast.error('Failed to connect to Kraken WebSocket');
    });
};
