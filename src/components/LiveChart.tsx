import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradingContext } from '@/hooks/useTradingContext';
import { getKrakenWebSocket, getConnectionStatus, type WebSocketMessage } from '@/utils/websocketManager';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Clock, Activity, RefreshCw, WifiOff, Wifi } from 'lucide-react';
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
  const { isConnected, lastTickerData, connectionStatus } = useTradingContext();
  
  const [selectedPair, setSelectedPair] = useState<string>('XBT/USD');
  const [availablePairs, setAvailablePairs] = useState<string[]>(['XBT/USD', 'ETH/USD', 'XRP/USD', 'DOT/USD', 'ADA/USD']);
  const [activeTimeRange, setActiveTimeRange] = useState<string>(initialTimeRanges[1]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('initializing');
  
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
      return;
    }
    
    const currentPrice = parseFloat(tickerData.c[0]);
    const currentVolume = parseFloat(tickerData.v[1] || '0');
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
      
      collection.dataByTimeRange[range].push(newDataPoint);
      
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
      
      if (collection.dataByTimeRange[range].length > collection.maxDataPoints) {
        collection.dataByTimeRange[range] = collection.dataByTimeRange[range].slice(
          collection.dataByTimeRange[range].length - collection.maxDataPoints
        );
      }
    });
    
    const firstPrice = collection.dataByTimeRange[activeTimeRange][0]?.price || currentPrice;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = (priceChange / firstPrice) * 100;
    
    const pricesInRange = collection.dataByTimeRange[activeTimeRange].map(d => d.price);
    const highPrice = Math.max(...pricesInRange, 0);
    const lowPrice = Math.min(...pricesInRange, Infinity);
    
    const totalVolume = collection.dataByTimeRange[activeTimeRange]
      .reduce((sum, point) => sum + (point.volume || 0), 0);
    
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
    
    const handleTickerUpdate = (message: WebSocketMessage) => {
      if (message.type === 'ticker' && message.data.pair === selectedPair) {
        updateChartWithTickerData(message.data, selectedPair);
        setSubscriptionStatus('active');
      } else if (message.type === 'subscriptionStatus') {
        if (message.data.status === 'subscribed' && message.data.pair === selectedPair) {
          setSubscriptionStatus('active');
        } else if (message.data.status === 'error') {
          setSubscriptionStatus('error');
          toast.error(`Subscription error: ${message.data.errorMessage || 'Unknown error'}`);
        }
      } else if (message.type === 'error') {
        setSubscriptionStatus('error');
      }
    };
    
    const unsubscribe = wsManager.subscribe(handleTickerUpdate);
    
    wsManager.send({
      event: "subscribe",
      pair: [selectedPair],
      subscription: {
        name: "ticker"
      }
    });
    
    if (lastTickerData && lastTickerData[selectedPair]) {
      updateChartWithTickerData(lastTickerData[selectedPair], selectedPair);
    }
    
    dataCollectionRef.current.isActive = true;
    dataCollectionRef.current.startTime = Date.now();
    
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
  
  useEffect(() => {
    setChartState(prev => ({
      ...prev,
      data: [...dataCollectionRef.current.dataByTimeRange[activeTimeRange]]
    }));
    
    if (dataCollectionRef.current.dataByTimeRange[activeTimeRange].length > 0) {
      const dataForRange = dataCollectionRef.current.dataByTimeRange[activeTimeRange];
      const currentPrice = dataForRange[dataForRange.length - 1].price;
      const firstPrice = dataForRange[0].price;
      const priceChange = currentPrice - firstPrice;
      const priceChangePercent = (priceChange / firstPrice) * 100;
      
      const pricesInRange = dataForRange.map(d => d.price);
      const highPrice = Math.max(...pricesInRange, 0);
      const lowPrice = Math.min(...pricesInRange, Infinity);
      
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
  
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
  };
  
  const handleRefresh = () => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) {
      toast.warning("Ikke tilkoblet WebSocket. Kan ikke hente nye data.");
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
    
    setTimeout(() => {
      wsManager.send({
        event: "subscribe",
        pair: [selectedPair],
        subscription: {
          name: "ticker"
        }
      });
      
      toast.success(`Oppdaterer data for ${selectedPair}`);
    }, 500);
  };
  
  // Function to get status indication color
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
  
  // Function to get status icon
  const StatusIcon = () => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) return <WifiOff className="h-3 w-3 mr-1" />;
    if (subscriptionStatus === 'active' || isDemoMode) return <Wifi className="h-3 w-3 mr-1" />;
    if (subscriptionStatus === 'subscribing' || subscriptionStatus === 'resubscribing') 
      return <RefreshCw className="h-3 w-3 mr-1 animate-spin" />;
    
    return <WifiOff className="h-3 w-3 mr-1" />;
  };
  
  // Function to get status text
  const getStatusText = () => {
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) return "Ikke tilkoblet";
    if (isDemoMode) return "Demo Modus";
    if (subscriptionStatus === 'active') return "Tilkoblet";
    if (subscriptionStatus === 'error') return "Tilkoblingsfeil";
    if (subscriptionStatus === 'subscribing') return "Kobler til...";
    if (subscriptionStatus === 'resubscribing') return "Oppdaterer tilkobling...";
    
    return "Ukjent status";
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
            <RefreshCw className={cn(
              "h-4 w-4",
              subscriptionStatus === 'resubscribing' && "animate-spin"
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
