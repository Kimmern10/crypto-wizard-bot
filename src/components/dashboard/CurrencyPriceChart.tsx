
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';

interface CurrencyPriceChartProps {
  tickerData: Record<string, any>;
  demoMode: boolean;
}

const CurrencyPriceChart: React.FC<CurrencyPriceChartProps> = ({
  tickerData,
  demoMode
}) => {
  const [selectedPair, setSelectedPair] = useState<string>('XBT/USD');
  const [chartData, setChartData] = useState<any[]>([]);

  // Generate mock data for demo mode or when real data is not available
  const generateMockData = () => {
    const mockData = [];
    const basePrice = Math.random() * 10000 + 30000; // Random starting price between 30000-40000
    
    for (let i = 0; i < 24; i++) {
      const volatility = Math.random() * 0.02 - 0.01; // Random price change between -1% and +1%
      const price = basePrice * (1 + volatility * i);
      
      mockData.push({
        time: `${i}:00`,
        price: parseFloat(price.toFixed(2))
      });
    }
    
    return mockData;
  };

  // Update chart data when ticker data or selected pair changes
  useEffect(() => {
    // If we have real ticker data and not in demo mode
    if (Object.keys(tickerData).length > 0 && !demoMode) {
      // In a real app, this would fetch historical data for the selected pair
      // For now, we'll use mock data even with real ticker data since historical data isn't available
      setChartData(generateMockData());
    } else {
      // Use mock data for demo mode
      setChartData(generateMockData());
    }
  }, [tickerData, selectedPair, demoMode]);

  // Get available pairs from ticker data
  const availablePairs = Object.keys(tickerData).length > 0 
    ? Object.keys(tickerData) 
    : ['XBT/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD'];

  // Get current price for the selected pair
  const currentPrice = tickerData[selectedPair]?.c?.[0] 
    ? parseFloat(tickerData[selectedPair].c[0]) 
    : chartData.length > 0 ? chartData[chartData.length - 1].price : 0;

  // Calculate price change from open
  const openPrice = tickerData[selectedPair]?.o?.[0]
    ? parseFloat(tickerData[selectedPair].o[0])
    : chartData.length > 0 ? chartData[0].price : 0;
    
  const priceChange = currentPrice - openPrice;
  const priceChangePercent = openPrice !== 0 ? (priceChange / openPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <Card className="glass-card animate-slide-up h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Price Chart</CardTitle>
            <div className="flex items-baseline mt-1">
              <span className="text-2xl font-bold mr-2">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{priceChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          
          <ToggleGroup type="single" value={selectedPair} onValueChange={(value) => value && setSelectedPair(value)} className="flex-wrap">
            {availablePairs.slice(0, 4).map(pair => (
              <ToggleGroupItem key={pair} value={pair} size="sm" className="text-xs px-2 py-1">
                {pair}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      
      <CardContent>
        {demoMode && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md p-2 mb-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Using simulated price data in demo mode. Connect your API for real-time data.
            </p>
          </div>
        )}
        
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" opacity={0.3} />
              <XAxis 
                dataKey="time"
                tick={{ fontSize: 10 }}
                tickMargin={5}
                stroke="var(--muted-foreground)"
                tickFormatter={(value) => value}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickMargin={5}
                stroke="var(--muted-foreground)"
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price']}
                labelFormatter={(label) => `Time: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  borderRadius: '0.375rem'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="var(--primary)" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrencyPriceChart;
