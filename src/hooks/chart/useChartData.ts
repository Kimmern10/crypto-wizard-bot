
import { useState, useEffect, useRef } from 'react';
import { PriceDataPoint, ChartState } from '@/components/chart/types';
import { useTradingContext } from '@/hooks/useTradingContext';
import { getKrakenWebSocket, getConnectionStatus } from '@/utils/websocketManager';
import { toast } from 'sonner';
import { generateDemoData, updateChartWithTickerData, updateChartForTimeRange } from '@/components/chart/chartUtils';
import { handleWebSocketMessage } from '@/utils/websocket/messageHandler';

const initialTimeRanges = ['1H', '6H', '24H', '7D'];
const defaultPairs = ['XBT/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD', 'DOT/USD', 'ADA/USD'];

interface UseChartDataReturn {
  chartState: ChartState;
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
  availablePairs: string[];
  activeTimeRange: string;
  setActiveTimeRange: (range: string) => void;
  subscriptionStatus: string;
  refreshingChart: boolean;
  handleRefresh: () => void;
  connectionStatus: {
    isConnected: boolean;
    isDemoMode: boolean;
  };
  timeRanges: string[];
}

export function useChartData(): UseChartDataReturn {
  const { isConnected, lastTickerData, connectionStatus, restartConnection } = useTradingContext();
  
  const [selectedPair, setSelectedPair] = useState<string>('XBT/USD');
  const [availablePairs] = useState<string[]>(defaultPairs);
  const [activeTimeRange, setActiveTimeRange] = useState<string>(initialTimeRanges[1]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('initializing');
  const [refreshingChart, setRefreshingChart] = useState<boolean>(false);
  const [lastConnectionEvent, setLastConnectionEvent] = useState<string>('');
  
  const [chartState, setChartState] = useState<ChartState>({
    data: [],
    lastPrice: 0,
    priceChange: 0,
    priceChangePercent: 0,
    highPrice: 0,
    lowPrice: Infinity,
    volume: 0
  });
  
  const dataCollectionRef = useRef<{
    isActive: boolean;
    startTime: number;
    maxDataPoints: number;
    dataByTimeRange: Record<string, PriceDataPoint[]>;
  }>({
    isActive: false,
    startTime: Date.now(),
    maxDataPoints: 300,
    dataByTimeRange: initialTimeRanges.reduce((acc, range) => ({...acc, [range]: []}), {})
  });
  
  const wsSubscriptionRef = useRef<(() => void) | null>(null);
  const currentPairRef = useRef<string>(selectedPair);
  
  // Update the ref when selectedPair changes
  useEffect(() => {
    currentPairRef.current = selectedPair;
  }, [selectedPair]);
  
  // Set up WebSocket subscription when selected pair changes
  useEffect(() => {
    console.log(`Setting up chart data for ${selectedPair}`);
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    // Clean up previous subscription if exists
    if (wsSubscriptionRef.current) {
      console.log(`Cleaning up previous subscription for ${currentPairRef.current}`);
      wsSubscriptionRef.current();
      wsSubscriptionRef.current = null;
    }
    
    if (!wsConnected && !isDemoMode) {
      console.log('No WebSocket connection, generating demo data');
      setSubscriptionStatus('disconnected');
      generateDemoData(selectedPair, activeTimeRange, setChartState, dataCollectionRef);
      return;
    }
    
    console.log(`Setting up subscription for ${selectedPair} (Demo mode: ${isDemoMode})`);
    setSubscriptionStatus('subscribing');
    
    const wsManager = getKrakenWebSocket();
    
    // Handler for all WebSocket messages
    const handleTickerUpdate = (message: any) => {
      // Use the centralized message handler
      handleWebSocketMessage(
        message, 
        setSubscriptionStatus,
        setLastConnectionEvent,
        (updateFn) => {
          if (message.type === 'ticker' && message.data?.pair === currentPairRef.current) {
            updateChartWithTickerData(message.data, currentPairRef.current, activeTimeRange, dataCollectionRef, setChartState);
            setSubscriptionStatus('active');
          }
        }
      );
    };
    
    // Subscribe to WebSocket messages
    wsSubscriptionRef.current = wsManager.subscribe(handleTickerUpdate);
    
    // Request subscription to the selected pair
    wsManager.send({
      event: "subscribe",
      pair: [selectedPair],
      subscription: {
        name: "ticker"
      }
    });
    
    // Use any existing data we might have
    if (lastTickerData && lastTickerData[selectedPair]) {
      updateChartWithTickerData(lastTickerData[selectedPair], selectedPair, activeTimeRange, dataCollectionRef, setChartState);
    }
    
    dataCollectionRef.current.isActive = true;
    dataCollectionRef.current.startTime = Date.now();
    
    // Cleanup: unsubscribe from messages and ticker
    return () => {
      if (wsSubscriptionRef.current) {
        wsSubscriptionRef.current();
        wsSubscriptionRef.current = null;
      }
      
      wsManager.send({
        event: "unsubscribe",
        pair: [selectedPair],
        subscription: {
          name: "ticker"
        }
      });
    };
  }, [selectedPair, activeTimeRange]);
  
  // Update chart when time range changes
  useEffect(() => {
    updateChartForTimeRange(activeTimeRange, dataCollectionRef, setChartState);
  }, [activeTimeRange]);
  
  // Function to refresh chart data
  const handleRefresh = async () => {
    setRefreshingChart(true);
    
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) {
      try {
        // Try to restart the connection
        await restartConnection();
        toast.success("WebSocket connection restarted");
      } catch (error) {
        console.error("Failed to restart connection:", error);
        toast.error("Could not connect to WebSocket");
        generateDemoData(selectedPair, activeTimeRange, setChartState, dataCollectionRef);
      }
      setRefreshingChart(false);
      return;
    }
    
    const wsManager = getKrakenWebSocket();
    
    setSubscriptionStatus('resubscribing');
    
    // Safely unsubscribe first
    wsManager.send({
      event: "unsubscribe",
      pair: [selectedPair],
      subscription: {
        name: "ticker"
      }
    });
    
    // Wait a brief moment before resubscribing
    setTimeout(() => {
      wsManager.send({
        event: "subscribe",
        pair: [selectedPair],
        subscription: {
          name: "ticker"
        }
      });
      
      toast.success(`Refreshing chart data for ${selectedPair}`);
      setRefreshingChart(false);
    }, 500);
  };

  const wsStatus = getConnectionStatus();
  
  return {
    chartState,
    selectedPair,
    setSelectedPair,
    availablePairs,
    activeTimeRange,
    setActiveTimeRange,
    subscriptionStatus,
    refreshingChart,
    handleRefresh,
    connectionStatus: wsStatus,
    timeRanges: initialTimeRanges
  };
}
