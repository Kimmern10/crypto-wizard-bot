
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradingContext } from '@/hooks/useTradingContext';
import { getKrakenWebSocket, getConnectionStatus, type WebSocketMessage } from '@/utils/websocketManager';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceDataPoint {
  time: string;
  price: number;
  volume?: number;
}

interface ChartState {
  data: PriceDataPoint[];
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

const initialTimeRanges = ['1H', '6H', '24H', '7D'];
const defaultPairs = ['XBT/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD', 'DOT/USD', 'ADA/USD'];

const LiveChart: React.FC = () => {
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
  
  const updateChartWithTickerData = (tickerData: any, pair: string) => {
    if (!tickerData || !tickerData.c || !tickerData.c[0]) {
      console.warn('Invalid ticker data received:', tickerData);
      return;
    }
    
    const currentPrice = parseFloat(tickerData.c[0]);
    const currentVolume = parseFloat(tickerData.v?.[1] || '0');
    const timestamp = new Date();
    
    const newDataPoint: PriceDataPoint = {
      time: timestamp.toLocaleTimeString(),
      price: currentPrice,
      volume: currentVolume
    };
    
    const collection = dataCollectionRef.current;
    const now = Date.now();
    
    initialTimeRanges.forEach(range => {
      let timeWindow: number;
      
      switch(range) {
        case '1H': timeWindow = 60 * 60 * 1000; break;
        case '6H': timeWindow = 6 * 60 * 60 * 1000; break;
        case '24H': timeWindow = 24 * 60 * 60 * 1000; break;
        case '7D': timeWindow = 7 * 24 * 60 * 60 * 1000; break;
        default: timeWindow = 24 * 60 * 60 * 1000;
      }
      
      // Add new data point to this time range
      collection.dataByTimeRange[range].push({...newDataPoint});
      
      // Filter out data points that are outside of the time window
      collection.dataByTimeRange[range] = collection.dataByTimeRange[range]
        .filter(point => {
          const timeComponents = point.time.split(':');
          const hours = parseInt(timeComponents[0]);
          const minutes = parseInt(timeComponents[1]);
          const secondsWithAmPm = timeComponents[2];
          
          // Handle AM/PM format if present
          let seconds = 0;
          let isPM = false;
          
          if (secondsWithAmPm.includes(' ')) {
            const [sec, ampm] = secondsWithAmPm.split(' ');
            seconds = parseInt(sec);
            isPM = ampm.toUpperCase() === 'PM';
          } else {
            seconds = parseInt(secondsWithAmPm);
          }
          
          const pointDate = new Date();
          pointDate.setHours(
            isPM && hours < 12 ? hours + 12 : hours,
            minutes,
            seconds
          );
          
          return now - pointDate.getTime() < timeWindow;
        });
      
      // Limit the number of data points to prevent memory issues
      if (collection.dataByTimeRange[range].length > collection.maxDataPoints) {
        collection.dataByTimeRange[range] = collection.dataByTimeRange[range].slice(
          collection.dataByTimeRange[range].length - collection.maxDataPoints
        );
      }
    });
    
    // Calculate statistics for the current time range
    const dataForRange = collection.dataByTimeRange[activeTimeRange];
    if (dataForRange.length > 0) {
      const firstPrice = dataForRange[0]?.price || currentPrice;
      const priceChange = currentPrice - firstPrice;
      const priceChangePercent = (priceChange / firstPrice) * 100;
      
      const pricesInRange = dataForRange.map(d => d.price);
      const highPrice = Math.max(...pricesInRange, 0);
      const lowPrice = Math.min(...pricesInRange, Infinity);
      
      const totalVolume = dataForRange
        .reduce((sum, point) => sum + (point.volume || 0), 0);
      
      setChartState({
        data: [...dataForRange],
        lastPrice: currentPrice,
        priceChange,
        priceChangePercent,
        highPrice,
        lowPrice: lowPrice === Infinity ? 0 : lowPrice,
        volume: totalVolume
      });
    }
  };
  
  // Set up WebSocket subscription when selected pair changes
  useEffect(() => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) {
      console.log('No WebSocket connection, generating demo data');
      setSubscriptionStatus('disconnected');
      generateDemoData(selectedPair);
      return;
    }
    
    console.log(`Setting up subscription for ${selectedPair} (Demo mode: ${isDemoMode})`);
    setSubscriptionStatus('subscribing');
    
    const wsManager = getKrakenWebSocket();
    
    // Handler for all WebSocket messages
    const handleTickerUpdate = (message: WebSocketMessage) => {
      if (message.type === 'ticker' && message.data.pair === selectedPair) {
        updateChartWithTickerData(message.data, selectedPair);
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
      updateChartWithTickerData(lastTickerData[selectedPair], selectedPair);
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
  }, [isConnected, selectedPair, lastTickerData]);
  
  // Update chart when time range changes
  useEffect(() => {
    const dataForRange = dataCollectionRef.current.dataByTimeRange[activeTimeRange];
    
    if (dataForRange.length > 0) {
      const currentPrice = dataForRange[dataForRange.length - 1].price;
      const firstPrice = dataForRange[0].price;
      const priceChange = currentPrice - firstPrice;
      const priceChangePercent = (priceChange / firstPrice) * 100;
      
      const pricesInRange = dataForRange.map(d => d.price);
      const highPrice = Math.max(...pricesInRange, 0);
      const lowPrice = Math.min(...pricesInRange, Infinity);
      
      const totalVolume = dataForRange
        .reduce((sum, point) => sum + (point.volume || 0), 0);
      
      setChartState({
        data: [...dataForRange],
        lastPrice: currentPrice,
        priceChange,
        priceChangePercent,
        highPrice,
        lowPrice: lowPrice === Infinity ? 0 : lowPrice,
        volume: totalVolume
      });
    }
  }, [activeTimeRange]);
  
  // Function to generate demo data when not connected
  const generateDemoData = (pair: string) => {
    console.log(`Generating demo data for ${pair}`);
    
    const collection = dataCollectionRef.current;
    initialTimeRanges.forEach(range => {
      collection.dataByTimeRange[range] = [];
    });
    
    const basePrices: Record<string, number> = {
      'XBT/USD': 36750,
      'ETH/USD': 2470,
      'XRP/USD': 0.52,
      'SOL/USD': 148.25,
      'DOT/USD': 7.20,
      'ADA/USD': 0.45
    };
    
    const basePrice = basePrices[pair] || 1000;
    const volatility = basePrice * 0.03;
    
    initialTimeRanges.forEach(range => {
      let points: number;
      let timeIncrement: number;
      
      switch(range) {
        case '1H': 
          points = 60; 
          timeIncrement = 60 * 1000;
          break;
        case '6H': 
          points = 72; 
          timeIncrement = 5 * 60 * 1000;
          break;
        case '24H': 
          points = 96; 
          timeIncrement = 15 * 60 * 1000;
          break;
        case '7D': 
          points = 168; 
          timeIncrement = 60 * 60 * 1000;
          break;
        default: 
          points = 100;
          timeIncrement = 15 * 60 * 1000;
      }
      
      let currentPrice = basePrice;
      let currentVolume = basePrice * 10;
      const trend = Math.random() > 0.5 ? 1 : -1;
      
      const now = Date.now();
      
      for (let i = 0; i < points; i++) {
        const pointTime = new Date(now - (points - i) * timeIncrement);
        
        const noise = (Math.random() - 0.5) * volatility;
        const trendComponent = (i / points) * trend * (volatility * 2);
        currentPrice = basePrice + noise + trendComponent;
        
        currentVolume = basePrice * 10 * (0.5 + Math.random());
        
        collection.dataByTimeRange[range].push({
          time: pointTime.toLocaleTimeString(),
          price: currentPrice,
          volume: currentVolume
        });
      }
    });
    
    const dataForRange = collection.dataByTimeRange[activeTimeRange];
    const currentPrice = dataForRange[dataForRange.length - 1].price;
    const firstPrice = dataForRange[0].price;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = (priceChange / firstPrice) * 100;
    
    const pricesInRange = dataForRange.map(d => d.price);
    const highPrice = Math.max(...pricesInRange, 0);
    const lowPrice = Math.min(...pricesInRange, Infinity);
    const totalVolume = dataForRange.reduce((sum, point) => sum + (point.volume || 0), 0);
    
    setChartState({
      data: [...dataForRange],
      lastPrice: currentPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice,
      volume: totalVolume
    });
  };
  
  // Helper function to format prices based on magnitude
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
  };
  
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
        generateDemoData(selectedPair);
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
  
  // Function to get status indication color based on connection state
  const getStatusColor = () => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) return "bg-red-100 text-red-800";
    if (isDemoMode) return "bg-amber-100 text-amber-800";
    if (subscriptionStatus === 'active') return "bg-green-100 text-green-800";
    if (subscriptionStatus === 'error') return "bg-red-100 text-red-800";
    if (subscriptionStatus === 'subscribing' || subscriptionStatus === 'resubscribing') 
      return "bg-blue-100 text-blue-800";
    
    return "bg-gray-100 text-gray-800";
  };
  
  // Function to get appropriate status icon
  const StatusIcon = () => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) return <WifiOff className="h-3 w-3 mr-1" />;
    if (subscriptionStatus === 'active' || isDemoMode) return <Wifi className="h-3 w-3 mr-1" />;
    if (subscriptionStatus === 'subscribing' || subscriptionStatus === 'resubscribing') 
      return <RefreshCw className="h-3 w-3 mr-1 animate-spin" />;
    
    return <WifiOff className="h-3 w-3 mr-1" />;
  };
  
  // Function to get user-friendly status text
  const getStatusText = () => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) return "Not connected";
    if (isDemoMode) return "Demo Mode";
    if (subscriptionStatus === 'active') return "Connected";
    if (subscriptionStatus === 'error') return "Connection error";
    if (subscriptionStatus === 'subscribing') return "Connecting...";
    if (subscriptionStatus === 'resubscribing') return "Updating connection...";
    
    return "Unknown status";
  };
  
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-1">
          <CardTitle className="text-base font-medium">Live Price Chart</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Select pair" />
              </SelectTrigger>
              <SelectContent>
                {availablePairs.map(pair => (
                  <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center">
              <span className="text-xl font-bold">${formatPrice(chartState.lastPrice)}</span>
              <span className={cn(
                "ml-2 text-sm flex items-center",
                chartState.priceChangePercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {chartState.priceChangePercent >= 0 
                  ? <ArrowUp className="h-3 w-3 mr-1" /> 
                  : <ArrowDown className="h-3 w-3 mr-1" />
                }
                {chartState.priceChangePercent >= 0 ? "+" : ""}
                {chartState.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleRefresh} 
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Refresh data"
            disabled={refreshingChart}
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              refreshingChart && "animate-spin"
            )} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="py-2 px-4 grid grid-cols-3 gap-2 text-sm border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col">
            <span className="text-muted-foreground">High</span>
            <span className="font-medium">${formatPrice(chartState.highPrice)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Low</span>
            <span className="font-medium">${formatPrice(chartState.lowPrice)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-medium">${formatPrice(chartState.volume)}</span>
          </div>
        </div>
        
        <div className={cn(
          "text-xs text-center py-1 flex items-center justify-center",
          getStatusColor()
        )}>
          <StatusIcon />
          <span>{getStatusText()}</span>
        </div>
        
        <Tabs defaultValue={activeTimeRange} onValueChange={setActiveTimeRange} className="w-full">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-4">
              {initialTimeRanges.map(range => (
                <TabsTrigger key={range} value={range}>{range}</TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {initialTimeRanges.map(range => (
            <TabsContent key={range} value={range} className="h-[300px] mt-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartState.data}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const parts = value.split(':');
                      return `${parts[0]}:${parts[1]}`;
                    }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${formatPrice(value)}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${formatPrice(value)}`, 'Price']}
                    labelFormatter={(label) => `Time: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LiveChart;
