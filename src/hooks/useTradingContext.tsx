import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { WebSocketManager, getKrakenWebSocket, WebSocketMessage } from '@/utils/websocketManager';
import { useKrakenApi } from '@/hooks/useKrakenApi';

interface TradingContextType {
  apiKey: string;
  apiSecret: string;
  isApiConfigured: boolean;
  isConnected: boolean;
  setApiCredentials: (key: string, secret: string) => void;
  clearApiCredentials: () => void;
  showApiKeyModal: () => void;
  hideApiKeyModal: () => void;
  isApiKeyModalOpen: boolean;
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  isRunning: boolean;
  toggleRunning: () => void;
  currentBalance: Record<string, number>;
  activePositions: any[];
  tradeHistory: any[];
  lastTickerData: Record<string, any>;
  connectionStatus: string;
  lastConnectionEvent: string;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

interface TradingProviderProps {
  children: ReactNode;
}

export const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('trend_following');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentBalance, setCurrentBalance] = useState<Record<string, number>>({
    BTC: 0,
    ETH: 0,
    USD: 0,
  });
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [lastTickerData, setLastTickerData] = useState<Record<string, any>>({});
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastConnectionEvent, setLastConnectionEvent] = useState<string>('');
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);

  const krakenApi = useKrakenApi({ apiKey, apiSecret });

  useEffect(() => {
    const savedApiKey = localStorage.getItem('krakenApiKey');
    const savedApiSecret = localStorage.getItem('krakenApiSecret');
    
    if (savedApiKey && savedApiSecret) {
      setApiKey(savedApiKey);
      setApiSecret(savedApiSecret);
    }
  }, []);

  useEffect(() => {
    if (apiKey && apiSecret) {
      connectToKraken();
    } else {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    }
  }, [apiKey, apiSecret]);

  useEffect(() => {
    if (isConnected) {
      const ws = getKrakenWebSocket();
      setWsManager(ws);
      
      ws.connect()
        .then(() => {
          setConnectionStatus('Connected to WebSocket');
          setLastConnectionEvent(`Connected at ${new Date().toLocaleTimeString()}`);
          toast.success('Connected to Kraken WebSocket');
          
          const pairs = ['XBT/USD', 'ETH/USD', 'XRP/USD'];
          pairs.forEach(pair => {
            ws.send({
              method: 'subscribe',
              params: {
                name: 'ticker',
                pair: [pair]
              }
            });
          });
          
          const unsubscribe = ws.subscribe((message: WebSocketMessage) => {
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
            ws.disconnect();
          };
        })
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          setConnectionStatus('WebSocket connection failed');
          setLastConnectionEvent(`Failed at ${new Date().toLocaleTimeString()}`);
          toast.error('Failed to connect to Kraken WebSocket');
        });
    }
    
    return () => {
      if (wsManager) {
        wsManager.disconnect();
      }
    };
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && krakenApi.isConnected) {
      krakenApi.fetchBalance()
        .then(balanceData => {
          if (balanceData) {
            setCurrentBalance(balanceData);
          }
        })
        .catch(error => {
          console.error('Failed to fetch account balance:', error);
          toast.error('Failed to fetch account balance');
        });
      
      krakenApi.fetchOpenPositions()
        .then(positionsData => {
          if (positionsData) {
            setActivePositions(positionsData);
          }
        })
        .catch(error => {
          console.error('Failed to fetch open positions:', error);
          toast.error('Failed to fetch open positions');
        });
      
      krakenApi.fetchTradeHistory()
        .then(tradesData => {
          if (tradesData) {
            setTradeHistory(tradesData);
          }
        })
        .catch(error => {
          console.error('Failed to fetch trade history:', error);
          toast.error('Failed to fetch trade history');
        });
    }
  }, [isConnected, krakenApi.isConnected]);

  const connectToKraken = async () => {
    try {
      if (krakenApi.connect) {
        await krakenApi.connect();
        setIsConnected(true);
        toast.success('Connected to Kraken API');
      }
    } catch (error) {
      console.error('Failed to connect to Kraken API:', error);
      setIsConnected(false);
      toast.error('Failed to connect to Kraken API');
    }
  };

  const setApiCredentials = (key: string, secret: string) => {
    setApiKey(key);
    setApiSecret(secret);
    localStorage.setItem('krakenApiKey', key);
    localStorage.setItem('krakenApiSecret', secret);
  };

  const clearApiCredentials = () => {
    setApiKey('');
    setApiSecret('');
    localStorage.removeItem('krakenApiKey');
    localStorage.removeItem('krakenApiSecret');
    setIsConnected(false);
    setConnectionStatus('Disconnected');
    toast.info('API credentials cleared');
  };

  const showApiKeyModal = () => setIsApiKeyModalOpen(true);
  const hideApiKeyModal = () => setIsApiKeyModalOpen(false);

  const toggleRunning = () => {
    if (!isRunning && isConnected) {
      setIsRunning(true);
      toast.success('Trading bot started');
      startTradingBot();
    } else if (isRunning) {
      setIsRunning(false);
      toast.info('Trading bot stopped');
      stopTradingBot();
    } else {
      toast.error('Please connect to the Kraken API first');
    }
  };

  const startTradingBot = () => {
    if (!krakenApi.sendOrder) {
      toast.error('Trading API not available');
      return;
    }
    
    console.log(`Trading bot started with strategy: ${selectedStrategy}`);
    
    const botInterval = setInterval(() => {
      if (!isRunning) {
        clearInterval(botInterval);
        return;
      }
      
      console.log(`Bot executing strategy: ${selectedStrategy}`);
      
      if (Math.random() > 0.95) {
        const orderType = Math.random() > 0.5 ? 'buy' : 'sell';
        const exampleOrder = {
          pair: 'XBT/USD',
          type: orderType as 'buy' | 'sell',
          ordertype: 'market',
          volume: '0.001'
        };
        
        console.log('Trading bot preparing to place order:', exampleOrder);
        
        krakenApi.sendOrder(exampleOrder)
          .then(() => {
            toast.success(`${exampleOrder.type.toUpperCase()} order placed for ${exampleOrder.volume} ${exampleOrder.pair}`);
            krakenApi.fetchBalance();
            krakenApi.fetchOpenPositions();
            krakenApi.fetchTradeHistory();
          })
          .catch(error => {
            console.error('Order failed:', error);
            toast.error(`Order failed: ${error.message || 'Unknown error'}`);
          });
      }
    }, 10000);
    
    window.botInterval = botInterval;
  };

  const stopTradingBot = () => {
    if (window.botInterval) {
      clearInterval(window.botInterval);
      console.log('Trading bot stopped');
    }
  };

  const value = {
    apiKey,
    apiSecret,
    isApiConfigured: !!(apiKey && apiSecret),
    isConnected,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal,
    isApiKeyModalOpen,
    selectedStrategy,
    setSelectedStrategy,
    isRunning,
    toggleRunning,
    currentBalance,
    activePositions,
    tradeHistory,
    lastTickerData,
    connectionStatus,
    lastConnectionEvent
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
};
