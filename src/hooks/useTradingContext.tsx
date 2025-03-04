
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { WebSocketManager, getKrakenWebSocket } from '@/utils/websocketManager';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { startTradingBot, stopTradingBot } from '@/utils/tradingBot';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { TradingContextType } from '@/types/trading';

const TradingContext = createContext<TradingContextType | undefined>(undefined);

interface TradingProviderProps {
  children: ReactNode;
}

export const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
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

  const {
    apiKey,
    apiSecret,
    isApiConfigured,
    isApiKeyModalOpen,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal
  } = useApiCredentials(connectToKraken);

  const krakenApi = useKrakenApi({ apiKey, apiSecret });

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
      
      const cleanup = setupWebSocket(
        ws,
        setConnectionStatus,
        setLastConnectionEvent,
        setLastTickerData
      );
      
      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
        if (wsManager) {
          // Fix the error by safely checking if disconnect exists before calling it
          if (wsManager.disconnect && typeof wsManager.disconnect === 'function') {
            wsManager.disconnect();
          }
        }
      };
    }
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

  const toggleRunning = () => {
    if (!isRunning && isConnected) {
      setIsRunning(true);
      toast.success('Trading bot started');
      startTradingBot(
        true,
        selectedStrategy,
        krakenApi.sendOrder,
        krakenApi.fetchBalance,
        krakenApi.fetchOpenPositions,
        krakenApi.fetchTradeHistory
      );
    } else if (isRunning) {
      setIsRunning(false);
      toast.info('Trading bot stopped');
      stopTradingBot();
    } else {
      toast.error('Please connect to the Kraken API first');
    }
  };

  const value: TradingContextType = {
    apiKey,
    apiSecret,
    isApiConfigured,
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
