
import { useState, useEffect, useRef } from 'react';
import { PriceDataPoint, ChartState } from '@/components/chart/types';
import { useTradingContext } from '@/hooks/useTradingContext';
import { getKrakenWebSocket, getConnectionStatus, type WebSocketMessage } from '@/utils/websocketManager';
import { toast } from 'sonner';
import { generateDemoData, updateChartWithTickerData, updateChartForTimeRange } from '@/components/chart/chartUtils';

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
  const [availablePairs, setAvailablePairs] = useState<string[]>(defaultPairs);
  const [activeTimeRange, setActiveTimeRange] = useState<string>(initialTimeRanges[1]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('initializing');
  const [refreshingChart, setRefreshingChart] = useState<boolean>(false);
  
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
  
  // Set up WebSocket subscription when selected pair changes
  useEffect(() => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
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
    const handleTickerUpdate = (message: WebSocketMessage) => {
      if (message.type === 'ticker' && message.data.pair === selectedPair) {
        updateChartWithTickerData(message.data, selectedPair, activeTimeRange, dataCollectionRef, setChartState);
        setSubscriptionStatus('active');
      } else if (message.type === 'subscriptionStatus') {
        if (message.data.status === 'subscribed' && message.data.pair === selectedPair) {
          setSubscriptionStatus('active');
          console.log(`Successfully subscribed to ${selectedPair}`);
        } else if (message.data.status === 'error') {
          setSubscriptionStatus('error');
          console.error(`Subscription error for ${selectedPair}:`, message.data.errorMessage || 'Unknown error');
          toast.error(`Subscription error: ${message.data.errorMessage || 'Unknown error'}`);
        }
      } else if (message.type === 'error') {
        setSubscriptionStatus('error');
        console.error('WebSocket error:', message.data);
      } else if (message.type === 'connectionStatus' && message.data.status === 'disconnected') {
        setSubscriptionStatus('disconnected');
      }
    };
    
    // Subscribe to WebSocket messages
    const unsubscribe = wsManager.subscribe(handleTickerUpdate);
    
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
      unsubscribe();
      wsManager.send({
        event: "unsubscribe",
        pair: [selectedPair],
        subscription: {
          name: "ticker"
        }
      });
    };
  }, [isConnected, selectedPair, lastTickerData, activeTimeRange]);
  
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
