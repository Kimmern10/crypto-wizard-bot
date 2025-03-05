
import { useState } from 'react';

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
  
  // Calculate daily change percent from ticker data
  const updateDailyChangePercent = (tickerData: Record<string, any>) => {
    if (tickerData['XBT/USD']?.p?.[1]) {
      setDailyChangePercent(parseFloat(tickerData['XBT/USD'].p[1]));
    }
  };
  
  // Wrapper for setLastTickerData to also update performance metrics
  const updateLastTickerData = (updateFn: (prev: Record<string, any>) => Record<string, any>) => {
    setLastTickerData(prev => {
      const newData = updateFn(prev);
      updateDailyChangePercent(newData);
      return newData;
    });
  };
  
  // Calculate overall P&L based on positions and trade history
  const updateOverallProfitLoss = () => {
    let totalPnL = 0;
    
    // Add P&L from active positions
    activePositions.forEach(position => {
      if (position.pnl) {
        totalPnL += position.pnl;
      }
    });
    
    // Calculate closed P&L from trade history (simplified calculation)
    // Only consider trades from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTrades = tradeHistory.filter(trade => 
      new Date(trade.time) > thirtyDaysAgo
    );
    
    let tradePnL = 0;
    recentTrades.forEach(trade => {
      // This is a simplified P&L calculation
      const tradeValue = trade.price * trade.volume;
      if (trade.type === 'buy') {
        tradePnL -= tradeValue + trade.fee;
      } else if (trade.type === 'sell') {
        tradePnL += tradeValue - trade.fee;
      }
    });
    
    totalPnL += tradePnL;
    setOverallProfitLoss(totalPnL);
  };
  
  // Update stats when positions or trade history changes
  useState(() => {
    updateOverallProfitLoss();
  }, [activePositions, tradeHistory]);

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
