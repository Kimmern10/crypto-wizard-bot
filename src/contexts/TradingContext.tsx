
import React, { createContext, useState, useContext } from 'react';
import { OrderParams } from '@/types/krakenApiTypes';
import { User } from '@supabase/supabase-js';

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
  setApiCredentials: (apiKey: string, apiSecret: string) => Promise<boolean>;
  clearApiCredentials: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  restartConnection: () => Promise<void>;
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
  availableStrategies: {
    id: string;
    name: string;
    description: string;
    riskLevel: string;
  }[];
  dryRunMode: boolean;
  toggleDryRunMode: () => void;
  isInitialDataFetched: boolean;
  lastDataRefresh: Date | null;
  isRefreshing: boolean;
  dailyChangePercent: number;
  overallProfitLoss: number;
  isAuthenticated: boolean;
  user: User | null;
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
  setApiCredentials: async () => false,
  clearApiCredentials: async () => false,
  refreshData: async () => {},
  restartConnection: async () => {},
  sendOrder: async () => ({}),
  currentBalance: { USD: 0, BTC: 0, ETH: 0 },
  activePositions: [],
  tradeHistory: [],
  selectedStrategy: 'momentum',
  setSelectedStrategy: () => {},
  isRunning: false,
  toggleRunning: () => {},
  strategyParams: {},
  updateStrategyParams: () => {},
  availableStrategies: [
    {
      id: 'trend_following',
      name: 'Trend Following',
      description: 'Follows market trends using momentum indicators',
      riskLevel: 'Medium'
    },
    {
      id: 'mean_reversion',
      name: 'Mean Reversion',
      description: 'Capitalizes on price deviations from historical average',
      riskLevel: 'Medium-High'
    },
    {
      id: 'breakout',
      name: 'Breakout',
      description: 'Identifies and trades price breakouts from consolidation',
      riskLevel: 'High'
    },
    {
      id: 'ml_adaptive',
      name: 'ML Adaptive',
      description: 'Uses machine learning to adapt to changing market conditions',
      riskLevel: 'Medium-High'
    }
  ],
  dryRunMode: false,
  toggleDryRunMode: () => {},
  isInitialDataFetched: false,
  lastDataRefresh: null,
  isRefreshing: false,
  dailyChangePercent: 0,
  overallProfitLoss: 0,
  isAuthenticated: false,
  user: null
};

const TradingContext = createContext<TradingContextType>(defaultTradingContext);

export default TradingContext;

export const useTradingContext = () => useContext(TradingContext);
