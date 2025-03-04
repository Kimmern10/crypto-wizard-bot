
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
        
        // For demo purposes, let's simulate some ticker data if none is received after a timeout
        let hasReceivedData = false;
        
        setTimeout(() => {
          if (!hasReceivedData && wsManager.isConnected()) {
            console.log('No real ticker data received yet, simulating demo data...');
            
            // Simulate ticker data for demonstration
            simulateDemoTickerData(setLastTickerData);
          }
        }, 5000);
        
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
              
              hasReceivedData = true;
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
        
        // After several failed attempts, simulate ticker data for demo purposes
        if (reconnectCount >= 3) {
          console.log('Multiple connection attempts failed, simulating demo data...');
          setConnectionStatus('Demo Mode (Connection failed)');
          simulateDemoTickerData(setLastTickerData);
        }
        
        // Attempt to reconnect after a delay
        setTimeout(connectAndSubscribe, 5000);
      });
  };
  
  // Function to simulate ticker data for demo purposes
  const simulateDemoTickerData = (
    setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
  ) => {
    const demoData = {
      'XBT/USD': {
        c: ['36750.50', '0.05'],
        v: ['1250.45', '5430.87'],
        p: ['36725.75', '36650.30'],
        t: ['12500', '35000'],
        l: ['36500.00', '36300.00'],
        h: ['37000.00', '37200.00'],
        o: ['36600.00', '36500.00'],
        timestamp: new Date().toISOString()
      },
      'ETH/USD': {
        c: ['2470.25', '0.5'],
        v: ['15000.45', '42000.87'],
        p: ['2465.75', '2455.30'],
        t: ['22500', '65000'],
        l: ['2450.00', '2430.00'],
        h: ['2490.00', '2510.00'],
        o: ['2460.00', '2450.00'],
        timestamp: new Date().toISOString()
      },
      'XRP/USD': {
        c: ['0.5125', '1000'],
        v: ['2500000', '7800000'],
        p: ['0.5100', '0.5080'],
        t: ['3500', '12000'],
        l: ['0.5050', '0.5020'],
        h: ['0.5200', '0.5250'],
        o: ['0.5150', '0.5100'],
        timestamp: new Date().toISOString()
      },
      'DOT/USD': {
        c: ['5.75', '500'],
        v: ['350000', '980000'],
        p: ['5.70', '5.65'],
        t: ['2800', '9500'],
        l: ['5.60', '5.55'],
        h: ['5.85', '5.90'],
        o: ['5.80', '5.75'],
        timestamp: new Date().toISOString()
      },
      'ADA/USD': {
        c: ['0.35', '10000'],
        v: ['1500000', '4200000'],
        p: ['0.348', '0.345'],
        t: ['3200', '11000'],
        l: ['0.342', '0.340'],
        h: ['0.355', '0.360'],
        o: ['0.350', '0.348'],
        timestamp: new Date().toISOString()
      }
    };
    
    // Update ticker data with demo values
    setLastTickerData(prev => ({
      ...prev,
      ...demoData
    }));
    
    // Simulate price updates every 10 seconds
    const updateInterval = setInterval(() => {
      Object.keys(demoData).forEach(pair => {
        const currentPrice = parseFloat(demoData[pair].c[0]);
        const change = (Math.random() * 0.02 - 0.01) * currentPrice; // -1% to +1%
        const newPrice = (currentPrice + change).toFixed(2);
        
        demoData[pair].c[0] = newPrice;
        demoData[pair].timestamp = new Date().toISOString();
        
        console.log(`Demo data update: ${pair} = ${newPrice}`);
      });
      
      setLastTickerData(prev => ({
        ...prev,
        ...demoData
      }));
    }, 10000);
    
    return () => clearInterval(updateInterval);
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
