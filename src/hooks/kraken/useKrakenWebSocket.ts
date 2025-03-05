
import { useCallback } from 'react';
import { getKrakenWebSocket, getConnectionStatus } from '@/utils/websocket/krakenWebSocketManager';

export const useKrakenWebSocket = () => {
  const subscribeToTicker = useCallback((pair: string) => {
    // Get the true connection status including demo mode
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) {
      console.log(`Cannot subscribe to ${pair}: WebSocket not connected`);
      return;
    }
    
    const ws = getKrakenWebSocket();
    ws.send({
      event: "subscribe",
      pair: [pair],
      subscription: {
        name: "ticker"
      }
    });
    
    console.log(`Subscribed to ticker updates for ${pair} (Demo mode: ${isDemoMode})`);
  }, []);
  
  const unsubscribeFromTicker = useCallback((pair: string) => {
    // Get the true connection status including demo mode
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) {
      console.log(`Cannot unsubscribe from ${pair}: WebSocket not connected`);
      return;
    }
    
    const ws = getKrakenWebSocket();
    ws.send({
      event: "unsubscribe",
      pair: [pair],
      subscription: {
        name: "ticker"
      }
    });
    
    console.log(`Unsubscribed from ticker updates for ${pair} (Demo mode: ${isDemoMode})`);
  }, []);
  
  return {
    subscribeToTicker,
    unsubscribeFromTicker
  };
};
