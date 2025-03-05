
import { useState, useEffect, useCallback, useRef } from 'react';
import { TradingEngine } from '@/engine/TradingEngine';
import { StrategyFactory } from '@/strategies/StrategyFactory';
import { BaseStrategy } from '@/strategies/BaseStrategy';
import { useKrakenApi } from './useKrakenApi';
import { StrategyParams, OrderParams } from '@/types/trading';
import { processTickerData } from '@/utils/marketDataProcessor';
import { WebSocketMessage } from '@/types/websocketTypes';

interface UseTradingEngineProps {
  apiKey: string;
  apiSecret: string;
  selectedStrategy: string;
  strategyParams: StrategyParams;
  lastTickerData: Record<string, any>;
  dryRunMode: boolean;
}

export const useTradingEngine = ({
  apiKey,
  apiSecret,
  selectedStrategy,
  strategyParams,
  lastTickerData,
  dryRunMode
}: UseTradingEngineProps) => {
  const [strategy, setStrategy] = useState<BaseStrategy | null>(null);
  const [engine, setEngine] = useState<TradingEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastTickerRef = useRef<Record<string, any>>({});
  
  // Initialize Kraken API
  const {
    isConnected,
    isLoading,
    error,
    sendOrder,
    fetchBalance,
    subscribeToTicker
  } = useKrakenApi({
    apiKey,
    apiSecret
  });
  
  // Create and configure strategy object when selected strategy changes
  useEffect(() => {
    if (!selectedStrategy) return;
    
    const newStrategy = StrategyFactory.createStrategy(selectedStrategy, strategyParams);
    setStrategy(newStrategy);
    
    console.log(`Strategy updated to: ${newStrategy.name}`);
    
    // Update engine if it exists
    if (engine && newStrategy) {
      engine.setStrategy(newStrategy);
    }
  }, [selectedStrategy, strategyParams, engine]);
  
  // Initialize trading engine
  useEffect(() => {
    if (!strategy || !isConnected) return;
    
    // Only create the engine once or when strategy is updated
    if (!engine) {
      const balanceGetter = async () => {
        const balance = await fetchBalance();
        return balance || { USD: 10000, BTC: 0.5, ETH: 5 }; // Use mock data if fetch fails
      };
      
      const newEngine = new TradingEngine(strategy, {
        onOrderExecute: sendOrder,
        getBalance: () => ({ USD: 10000, BTC: 0.5, ETH: 5 }), // Temporary mock data
        maxConcurrentTrades: 3,
        dryRun: dryRunMode
      });
      
      setEngine(newEngine);
      setIsInitialized(true);
      
      console.log('Trading engine initialized');
    } else {
      // Just update the strategy if engine already exists
      engine.setStrategy(strategy);
    }
    
    return () => {
      if (engine && engine.isEngineRunning()) {
        engine.stop();
      }
    };
  }, [strategy, isConnected, sendOrder, fetchBalance, engine, dryRunMode]);
  
  // Process ticker data to update the engine
  useEffect(() => {
    if (!engine || !isInitialized) return;
    
    // Find any new ticker data
    const newData = Object.keys(lastTickerData).filter(pair => 
      lastTickerData[pair] !== lastTickerRef.current[pair]
    );
    
    // Process new data
    newData.forEach(pair => {
      const message: WebSocketMessage = {
        type: 'ticker',
        data: lastTickerData[pair]
      };
      
      const marketData = processTickerData(message);
      if (marketData) {
        engine.updateMarketData(pair, marketData);
      }
    });
    
    // Update reference
    lastTickerRef.current = { ...lastTickerData };
  }, [lastTickerData, engine, isInitialized]);
  
  // Control engine start/stop
  const startEngine = useCallback(() => {
    if (engine && isInitialized) {
      engine.start();
      return true;
    }
    return false;
  }, [engine, isInitialized]);
  
  const stopEngine = useCallback(() => {
    if (engine) {
      engine.stop();
      return true;
    }
    return false;
  }, [engine]);
  
  // Get engine status
  const isEngineRunning = useCallback(() => {
    if (engine) {
      return engine.isEngineRunning();
    }
    return false;
  }, [engine]);
  
  // Get open positions
  const getOpenPositions = useCallback(() => {
    if (engine) {
      return engine.getOpenPositions();
    }
    return [];
  }, [engine]);
  
  return {
    strategy,
    isInitialized,
    startEngine,
    stopEngine,
    isEngineRunning,
    getOpenPositions,
    error
  };
};
