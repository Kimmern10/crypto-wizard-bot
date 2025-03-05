
import { useState, useEffect, useCallback, useRef } from 'react';

export const useTradeDataState = () => {
  // Core data states
  const [currentBalance, setCurrentBalance] = useState<Record<string, number>>({
    USD: 10000,
    BTC: 0.5,
    ETH: 5.0
  });
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [lastTickerData, setLastTickerData] = useState<Record<string, any>>({});
  
  // UI/UX states
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastConnectionEvent, setLastConnectionEvent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorState, setErrorState] = useState<string | null>(null);
  
  // Performance tracking
  const [dailyChangePercent, setDailyChangePercent] = useState<number>(0.0);
  const [overallProfitLoss, setOverallProfitLoss] = useState<number>(0.0);
  
  // Data refresh tracking
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null);
  
  // Reference to avoid potential stale closures in callbacks
  const stateRef = useRef({
    activePositions,
    tradeHistory
  });
  
  // Update ref whenever the actual state changes
  useEffect(() => {
    stateRef.current = {
      activePositions,
      tradeHistory
    };
  }, [activePositions, tradeHistory]);
  
  // Calculate daily change percent from ticker data
  const updateDailyChangePercent = useCallback((tickerData: Record<string, any>) => {
    if (tickerData['XBT/USD']?.p?.[1]) {
      setDailyChangePercent(parseFloat(tickerData['XBT/USD'].p[1]));
    }
  }, []);
  
  // Wrapper for setLastTickerData to also update performance metrics
  const updateLastTickerData = useCallback((updateFn: (prev: Record<string, any>) => Record<string, any>) => {
    setLastTickerData(prev => {
      const newData = updateFn(prev);
      updateDailyChangePercent(newData);
      return newData;
    });
  }, [updateDailyChangePercent]);
  
  // Calculate overall P&L based on positions and trade history
  const updateOverallProfitLoss = useCallback(() => {
    let totalPnL = 0;
    
    // Add P&L from active positions
    stateRef.current.activePositions.forEach(position => {
      if (position.pnl) {
        totalPnL += position.pnl;
      }
    });
    
    // Calculate closed P&L from trade history (improved calculation)
    // Only consider trades from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTrades = stateRef.current.tradeHistory.filter(trade => 
      new Date(trade.time) > thirtyDaysAgo
    );
    
    let tradePnL = 0;
    
    // Track buys and sells by pair to calculate realized P&L
    const pairBalances: Record<string, {
      bought: number;
      boughtCost: number;
      sold: number;
      soldValue: number;
    }> = {};
    
    // First pass - build up trade data by pair
    recentTrades.forEach(trade => {
      if (!pairBalances[trade.pair]) {
        pairBalances[trade.pair] = {
          bought: 0,
          boughtCost: 0,
          sold: 0,
          soldValue: 0
        };
      }
      
      const tradeValue = trade.price * trade.volume;
      
      if (trade.type === 'buy') {
        pairBalances[trade.pair].bought += trade.volume;
        pairBalances[trade.pair].boughtCost += tradeValue + trade.fee;
      } else if (trade.type === 'sell') {
        pairBalances[trade.pair].sold += trade.volume;
        pairBalances[trade.pair].soldValue += tradeValue - trade.fee;
      }
    });
    
    // Second pass - calculate P&L by pair
    Object.values(pairBalances).forEach(pair => {
      // Calculate realized P&L for complete trades
      const realizedVolume = Math.min(pair.bought, pair.sold);
      if (realizedVolume > 0) {
        const avgBuyCost = pair.boughtCost / pair.bought * realizedVolume;
        const avgSellValue = pair.soldValue / pair.sold * realizedVolume;
        tradePnL += avgSellValue - avgBuyCost;
      }
    });
    
    totalPnL += tradePnL;
    setOverallProfitLoss(totalPnL);
  }, []);
  
  // Update stats when positions or trade history changes
  useEffect(() => {
    updateOverallProfitLoss();
  }, [activePositions, tradeHistory, updateOverallProfitLoss]);
  
  // Error handling - clear errors after a timeout
  useEffect(() => {
    if (errorState) {
      const timer = setTimeout(() => {
        setErrorState(null);
      }, 60000); // Clear error after 1 minute
      
      return () => clearTimeout(timer);
    }
  }, [errorState]);

  return {
    // Core data
    currentBalance,
    setCurrentBalance,
    activePositions,
    setActivePositions,
    tradeHistory,
    setTradeHistory,
    lastTickerData,
    setLastTickerData: updateLastTickerData,
    
    // UI/UX state
    connectionStatus,
    setConnectionStatus,
    lastConnectionEvent,
    setLastConnectionEvent,
    isLoading,
    setIsLoading,
    loadingMessage,
    setLoadingMessage,
    errorState,
    setErrorState,
    
    // Performance metrics
    dailyChangePercent,
    setDailyChangePercent,
    overallProfitLoss,
    setOverallProfitLoss,
    
    // Data refresh tracking
    lastDataRefresh,
    setLastDataRefresh,
    
    // Helper methods
    updateOverallProfitLoss
  };
};
