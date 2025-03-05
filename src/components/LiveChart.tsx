
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradingContext } from '@/hooks/useTradingContext';
import { getKrakenWebSocket, type WebSocketMessage } from '@/utils/websocketManager';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Clock, Activity, RefreshCw } from 'lucide-react';
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

const LiveChart: React.FC = () => {
  // Trading context for connection status
  const { isConnected, lastTickerData } = useTradingContext();
  
  // State for the selected currency pair
  const [selectedPair, setSelectedPair] = useState<string>('XBT/USD');
  const [availablePairs, setAvailablePairs] = useState<string[]>(['XBT/USD', 'ETH/USD', 'XRP/USD', 'DOT/USD', 'ADA/USD']);
  const [activeTimeRange, setActiveTimeRange] = useState<string>(initialTimeRanges[1]);
  
  // Chart data state
  const [chartState, setChartState] = useState<ChartState>({
    data: [],
    lastPrice: 0,
    priceChange: 0,
    priceChangePercent: 0,
    highPrice: 0,
    lowPrice: Infinity,
    volume: 0
  });
  
  // Refs to track data collection
  const dataCollectionRef = useRef<{
    isActive: boolean;
    startTime: number;
    maxDataPoints: number;
    dataByTimeRange: Record<string, PriceDataPoint[]>;
  }>({
    isActive: false,
    startTime: Date.now(),
    maxDataPoints: 300, // Max points to show on chart
    dataByTimeRange: initialTimeRanges.reduce((acc, range) => ({...acc, [range]: []}), {})
  });
  
  // Function to update chart with new ticker data
  const updateChartWithTickerData = (tickerData: any, pair: string) => {
    if (!tickerData || !tickerData.c || !tickerData.c[0]) {
      return;
    }
    
    const currentPrice = parseFloat(tickerData.c[0]);
    const currentVolume = parseFloat(tickerData.v[1] || '0');
    const timestamp = new Date();
    
    // Add new data point
    const newDataPoint: PriceDataPoint = {
      time: timestamp.toLocaleTimeString(),
      price: currentPrice,
      volume: currentVolume
    };
    
    // Update data for each time range
    const collection = dataCollectionRef.current;
    const now = Date.now();
    
    // Process data for each time range
    initialTimeRanges.forEach(range => {
      let timeWindow: number;
      
      switch(range) {
        case '1H': timeWindow = 60 * 60 * 1000; break;
        case '6H': timeWindow = 6 * 60 * 60 * 1000; break;
        case '24H': timeWindow = 24 * 60 * 60 * 1000; break;
        case '7D': timeWindow = 7 * 24 * 60 * 60 * 1000; break;
        default: timeWindow = 24 * 60 * 60 * 1000;
      }
      
      // Add new point to this time range
      collection.dataByTimeRange[range].push(newDataPoint);
      
      // Filter out data older than the time window
      collection.dataByTimeRange[range] = collection.dataByTimeRange[range]
        .filter(point => {
          const pointTime = new Date(timestamp);
          pointTime.setHours(
            parseInt(point.time.split(':')[0]),
            parseInt(point.time.split(':')[1]),
            parseInt(point.time.split(':')[2].split(' ')[0])
          );
          return now - pointTime.getTime() < timeWindow;
        });
      
      // Limit data points if needed
      if (collection.dataByTimeRange[range].length > collection.maxDataPoints) {
        collection.dataByTimeRange[range] = collection.dataByTimeRange[range].slice(
          collection.dataByTimeRange[range].length - collection.maxDataPoints
        );
      }
    });
    
    // Calculate metrics for display
    const firstPrice = collection.dataByTimeRange[activeTimeRange][0]?.price || currentPrice;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = (priceChange / firstPrice) * 100;
    
    // Find high and low prices in the current range
    const pricesInRange = collection.dataByTimeRange[activeTimeRange].map(d => d.price);
    const highPrice = Math.max(...pricesInRange, 0);
    const lowPrice = Math.min(...pricesInRange, Infinity);
    
    // Calculate total volume in the current range
    const totalVolume = collection.dataByTimeRange[activeTimeRange]
      .reduce((sum, point) => sum + (point.volume || 0), 0);
    
    // Update chart state
    setChartState({
      data: [...collection.dataByTimeRange[activeTimeRange]],
      lastPrice: currentPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice: lowPrice === Infinity ? 0 : lowPrice,
      volume: totalVolume
    });
  };
  
  // Set up WebSocket subscription for the selected pair
  useEffect(() => {
    if (!isConnected) {
      // Generate some initial demo data if not connected
      generateDemoData(selectedPair);
      return;
    }
    
    console.log(`Setting up subscription for ${selectedPair}`);
    
    // Get WebSocket instance
    const wsManager = getKrakenWebSocket();
    
    // Create a handler for ticker updates
    const handleTickerUpdate = (message: WebSocketMessage) => {
      if (message.type === 'ticker' && message.data.pair === selectedPair) {
        updateChartWithTickerData(message.data, selectedPair);
      }
    };
    
    // Subscribe to ticker updates for the selected pair
    const unsubscribe = wsManager.subscribe(handleTickerUpdate);
    
    // Subscribe to ticker for the selected pair
    wsManager.send({
      method: 'subscribe',
      params: {
        name: 'ticker',
        pair: [selectedPair]
      }
    });
    
    // Check if we have existing data for this pair in lastTickerData
    if (lastTickerData && lastTickerData[selectedPair]) {
      updateChartWithTickerData(lastTickerData[selectedPair], selectedPair);
    }
    
    // Mark data collection as active
    dataCollectionRef.current.isActive = true;
    dataCollectionRef.current.startTime = Date.now();
    
    // Cleanup function to unsubscribe when component unmounts or pair changes
    return () => {
      unsubscribe();
      wsManager.send({
        method: 'unsubscribe',
        params: {
          name: 'ticker',
          pair: [selectedPair]
        }
      });
    };
  }, [isConnected, selectedPair, lastTickerData]);
  
  // Handle time range changes
  useEffect(() => {
    // When time range changes, update chart data to show that range
    setChartState(prev => ({
      ...prev,
      data: [...dataCollectionRef.current.dataByTimeRange[activeTimeRange]]
    }));
    
    // Recalculate metrics for the new time range
    if (dataCollectionRef.current.dataByTimeRange[activeTimeRange].length > 0) {
      const dataForRange = dataCollectionRef.current.dataByTimeRange[activeTimeRange];
      const currentPrice = dataForRange[dataForRange.length - 1].price;
      const firstPrice = dataForRange[0].price;
      const priceChange = currentPrice - firstPrice;
      const priceChangePercent = (priceChange / firstPrice) * 100;
      
      // Find high and low prices in the current range
      const pricesInRange = dataForRange.map(d => d.price);
      const highPrice = Math.max(...pricesInRange, 0);
      const lowPrice = Math.min(...pricesInRange, Infinity);
      
      // Calculate total volume in the current range
      const totalVolume = dataForRange
        .reduce((sum, point) => sum + (point.volume || 0), 0);
      
      setChartState(prev => ({
        ...prev,
        lastPrice: currentPrice,
        priceChange,
        priceChangePercent,
        highPrice,
        lowPrice: lowPrice === Infinity ? 0 : lowPrice,
        volume: totalVolume
      }));
    }
  }, [activeTimeRange]);
  
  // Function to generate demo data if not connected
  const generateDemoData = (pair: string) => {
    console.log(`Generating demo data for ${pair}`);
    
    // Clear existing demo data
    const collection = dataCollectionRef.current;
    initialTimeRanges.forEach(range => {
      collection.dataByTimeRange[range] = [];
    });
    
    // Generate some reasonable base prices for different pairs
    const basePrices: Record<string, number> = {
      'XBT/USD': 36750,
      'ETH/USD': 2470,
      'XRP/USD': 0.52,
      'DOT/USD': 7.20,
      'ADA/USD': 0.45
    };
    
    const basePrice = basePrices[pair] || 1000;
    const volatility = basePrice * 0.03; // 3% volatility
    
    // Generate demo data for each time range
    initialTimeRanges.forEach(range => {
      let points: number;
      let timeIncrement: number;
      
      switch(range) {
        case '1H': 
          points = 60; 
          timeIncrement = 60 * 1000; // 1 minute
          break;
        case '6H': 
          points = 72; 
          timeIncrement = 5 * 60 * 1000; // 5 minutes
          break;
        case '24H': 
          points = 96; 
          timeIncrement = 15 * 60 * 1000; // 15 minutes
          break;
        case '7D': 
          points = 168; 
          timeIncrement = 60 * 60 * 1000; // 1 hour
          break;
        default: 
          points = 100;
          timeIncrement = 15 * 60 * 1000;
      }
      
      // Create a slightly trending series of prices with some randomness
      let currentPrice = basePrice;
      let currentVolume = basePrice * 10; // Base volume
      const trend = Math.random() > 0.5 ? 1 : -1; // Random trend direction
      
      const now = Date.now();
      
      // Generate data points
      for (let i = 0; i < points; i++) {
        // Move backwards in time from now
        const pointTime = new Date(now - (points - i) * timeIncrement);
        
        // Add some randomness to the price, with a slight trend
        const noise = (Math.random() - 0.5) * volatility;
        const trendComponent = (i / points) * trend * (volatility * 2);
        currentPrice = basePrice + noise + trendComponent;
        
        // Add some randomness to volume too
        currentVolume = basePrice * 10 * (0.5 + Math.random());
        
        // Add the data point
        collection.dataByTimeRange[range].push({
          time: pointTime.toLocaleTimeString(),
          price: currentPrice,
          volume: currentVolume
        });
      }
    });
    
    // Update chart with the demo data for the active range
    const dataForRange = collection.dataByTimeRange[activeTimeRange];
    const currentPrice = dataForRange[dataForRange.length - 1].price;
    const firstPrice = dataForRange[0].price;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = (priceChange / firstPrice) * 100;
    
    // Calculate high, low and volume
    const pricesInRange = dataForRange.map(d => d.price);
    const highPrice = Math.max(...pricesInRange, 0);
    const lowPrice = Math.min(...pricesInRange, Infinity);
    const totalVolume = dataForRange.reduce((sum, point) => sum + (point.volume || 0), 0);
    
    // Update chart state with the demo data
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
  
  // Format price for display with appropriate decimal places
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
  };
  
  // Function to handle refresh button click
  const handleRefresh = () => {
    if (!isConnected) {
      toast.warning("Ikke tilkoblet WebSocket. Kan ikke hente nye data.");
      return;
    }
    
    // Request fresh data from WebSocket for the current pair
    const wsManager = getKrakenWebSocket();
    
    // Unsubscribe and resubscribe to get fresh data
    wsManager.send({
      method: 'unsubscribe',
      params: {
        name: 'ticker',
        pair: [selectedPair]
      }
    });
    
    setTimeout(() => {
      wsManager.send({
        method: 'subscribe',
        params: {
          name: 'ticker',
          pair: [selectedPair]
        }
      });
      toast.success(`Oppdaterer data for ${selectedPair}`);
    }, 300);
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
          >
            <RefreshCw className="h-4 w-4" />
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
                    isAnimationActive={false} // Disable animation for live updates
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
