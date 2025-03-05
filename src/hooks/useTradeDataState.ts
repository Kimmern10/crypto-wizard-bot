
import { useState } from 'react';

export const useTradeDataState = () => {
  const [currentBalance, setCurrentBalance] = useState<Record<string, number>>({
    USD: 10000,
    BTC: 0.5,
    ETH: 5.0
  });
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [lastTickerData, setLastTickerData] = useState<Record<string, any>>({});
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastConnectionEvent, setLastConnectionEvent] = useState<string>('');

  return {
    currentBalance,
    setCurrentBalance,
    activePositions,
    setActivePositions,
    tradeHistory,
    setTradeHistory,
    lastTickerData,
    setLastTickerData,
    connectionStatus,
    setConnectionStatus,
    lastConnectionEvent,
    setLastConnectionEvent
  };
};
