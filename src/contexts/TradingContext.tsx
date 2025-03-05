import React, { createContext, useState, useContext } from 'react';
import { OrderParams } from '@/types/krakenApiTypes';

export interface TradingContextType {
  apiKey: string;
  apiSecret: string;
  isApiConfigured: boolean;
  isApiKeyModalOpen: boolean;
  isLoadingCredentials: boolean;
  isConnected: boolean;
  isLoading: boolean;
  connectionStatus: string;
  lastConnectionEvent: string;
  lastTickerData: Record<string, any>;
  error: string | null;
  connect: () => Promise<void>;
  showApiKeyModal: () => void;
  hideApiKeyModal: () => void;
  setApiCredentials: (apiKey: string, apiSecret: string) => void;
  clearApiCredentials: () => void;
  refreshData: () => Promise<void>;
  restartConnection: () => Promise<void>; // Add the missing function to the type definition
  sendOrder: (params: OrderParams) => Promise<any>;
  currentBalance: Record<string, number>;
  activePositions: any[];
  tradeHistory: any[];
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  isRunning: boolean;
  toggleRunning: () => void;
  strategyParams: Record<string, any>;
  updateStrategyParams: (params: Record<string, any>) => void;
}

const defaultTradingContext: TradingContextType = {
  apiKey: '',
  apiSecret: '',
  isApiConfigured: false,
  isApiKeyModalOpen: false,
  isLoadingCredentials: false,
  isConnected: false,
  isLoading: false,
  connectionStatus: 'Disconnected',
  lastConnectionEvent: '',
  lastTickerData: {},
  error: null,
  connect: async () => {},
  showApiKeyModal: () => {},
  hideApiKeyModal: () => {},
  setApiCredentials: () => {},
  clearApiCredentials: () => {},
  refreshData: async () => {},
  restartConnection: async () => {},
  sendOrder: async () => {},
  currentBalance: { USD: 0, BTC: 0, ETH: 0 },
  activePositions: [],
  tradeHistory: [],
  selectedStrategy: 'momentum',
  setSelectedStrategy: () => {},
  isRunning: false,
  toggleRunning: () => {},
  strategyParams: {},
  updateStrategyParams: () => {}
};

const TradingContext = createContext<TradingContextType>(defaultTradingContext);

export default TradingContext;

export const useTradingContext = () => useContext(TradingContext);
