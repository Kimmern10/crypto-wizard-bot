import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { getKrakenWebSocket } from '@/utils/websocketManager';

// Legg til isLoadingCredentials i TradingContextType
export interface TradingContextType {
  apiKey: string;
  apiSecret: string;
  isApiConfigured: boolean;
  isApiKeyModalOpen: boolean;
  isLoadingCredentials: boolean; // Legg til denne linjen
  isConnected: boolean;
  isLoading: boolean;
  connectionStatus: string;
  lastConnectionEvent: string;
  lastTickerData: Record<string, any>;
  error: string | null;
  connect: () => Promise<void>;
  showApiKeyModal: () => void;
  hideApiKeyModal: () => void;
  setApiCredentials: (key: string, secret: string) => void;
  clearApiCredentials: () => void;
  refreshData: () => Promise<void>;
  sendOrder: (params: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
  }) => Promise<any>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastConnectionEvent, setLastConnectionEvent] = useState<string>('');
  const [lastTickerData, setLastTickerData] = useState<Record<string, any>>({});

  // Bruk API-legitimasjonshåndtereren
  const connectToKraken = async () => {
    try {
      await krakenApi.connect();
    } catch (error) {
      console.error('Failed to connect to Kraken API:', error);
    }
  };

  const { 
    apiKey, 
    apiSecret, 
    isApiConfigured,
    isApiKeyModalOpen,
    isLoadingCredentials,
    showApiKeyModal,
    hideApiKeyModal,
    setApiCredentials,
    clearApiCredentials
  } = useApiCredentials(connectToKraken);

  // Initialiser Kraken API-tjenesten
  const krakenApi = useKrakenApi({ apiKey, apiSecret });

  // Koble til WebSocket når API er konfigurert
  useEffect(() => {
    if (isApiConfigured) {
      console.log('API is configured, setting up WebSocket...');
      const cleanup = setupWebSocket(
        getKrakenWebSocket(),
        setConnectionStatus,
        setLastConnectionEvent,
        setLastTickerData
      );
      
      return cleanup;
    }
  }, [isApiConfigured]);

  // Oppdater data
  const refreshData = async () => {
    console.log('Manually refreshing data...');
    try {
      if (krakenApi.isConnected) {
        // Implementer dataoppdatering her, f.eks. hente saldo, åpne posisjoner osv.
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  return (
    <TradingContext.Provider value={{
      apiKey,
      apiSecret,
      isApiConfigured,
      isApiKeyModalOpen,
      isLoadingCredentials,
      isConnected: krakenApi.isConnected,
      isLoading: krakenApi.isLoading,
      connectionStatus,
      lastConnectionEvent,
      lastTickerData,
      error: krakenApi.error,
      connect: krakenApi.connect,
      showApiKeyModal,
      hideApiKeyModal,
      setApiCredentials,
      clearApiCredentials,
      refreshData,
      sendOrder: krakenApi.sendOrder
    }}>
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
