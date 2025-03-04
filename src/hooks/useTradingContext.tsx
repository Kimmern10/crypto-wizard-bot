
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

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
    BTC: 0.25,
    ETH: 2.5,
    USD: 10000,
  });
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  // Load saved API credentials from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('krakenApiKey');
    const savedApiSecret = localStorage.getItem('krakenApiSecret');
    
    if (savedApiKey && savedApiSecret) {
      setApiKey(savedApiKey);
      setApiSecret(savedApiSecret);
      simulateConnection(savedApiKey, savedApiSecret);
    }
  }, []);

  // Simulate connection to Kraken API
  const simulateConnection = (key: string, secret: string) => {
    if (key && secret) {
      setIsConnected(true);
      toast.success('Connected to Kraken API');
      
      // Simulate fetching mock data
      setTimeout(() => {
        // Mock trade history data
        const mockTradeHistory = [
          { id: '1', pair: 'BTC/USD', type: 'buy', price: 36420.50, volume: 0.15, time: new Date(Date.now() - 86400000 * 3).toISOString() },
          { id: '2', pair: 'ETH/USD', type: 'sell', price: 2451.75, volume: 1.2, time: new Date(Date.now() - 86400000 * 2).toISOString() },
          { id: '3', pair: 'BTC/USD', type: 'buy', price: 35980.25, volume: 0.1, time: new Date(Date.now() - 86400000).toISOString() },
        ];
        
        // Mock active positions
        const mockPositions = [
          { id: '1', pair: 'BTC/USD', entryPrice: 36420.50, currentPrice: 36750.20, amount: 0.15, pnl: 49.45, pnlPercentage: 0.9 },
        ];
        
        setTradeHistory(mockTradeHistory);
        setActivePositions(mockPositions);
      }, 1000);
    }
  };
  
  // Set API credentials and save to localStorage
  const setApiCredentials = (key: string, secret: string) => {
    setApiKey(key);
    setApiSecret(secret);
    localStorage.setItem('krakenApiKey', key);
    localStorage.setItem('krakenApiSecret', secret);
    simulateConnection(key, secret);
  };
  
  // Clear API credentials from state and localStorage
  const clearApiCredentials = () => {
    setApiKey('');
    setApiSecret('');
    localStorage.removeItem('krakenApiKey');
    localStorage.removeItem('krakenApiSecret');
    setIsConnected(false);
    toast.info('API credentials cleared');
  };
  
  const showApiKeyModal = () => setIsApiKeyModalOpen(true);
  const hideApiKeyModal = () => setIsApiKeyModalOpen(false);
  
  const toggleRunning = () => {
    if (!isRunning && isConnected) {
      setIsRunning(true);
      toast.success('Trading bot started');
    } else if (isRunning) {
      setIsRunning(false);
      toast.info('Trading bot stopped');
    } else {
      toast.error('Please connect to the Kraken API first');
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
    tradeHistory
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
