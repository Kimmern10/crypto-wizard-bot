
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CurrencyPriceChartProps {
  tickerData: Record<string, any>;
  demoMode?: boolean;
}

// Generate sample chart data when in demo mode or missing data
const generateDemoData = (basePrice: number, dataPoints: number = 24) => {
  const data = [];
  let currentPrice = basePrice;
  
  for (let i = 0; i < dataPoints; i++) {
    // Add some random variation to price
    const change = (Math.random() - 0.5) * basePrice * 0.01;
    currentPrice = currentPrice + change;
    
    data.push({
      time: new Date(Date.now() - (dataPoints - i) * 3600000).toLocaleTimeString(),
      price: currentPrice.toFixed(2)
    });
  }
  
  return data;
};

const CurrencyPriceChart: React.FC<CurrencyPriceChartProps> = ({ 
  tickerData,
  demoMode = false
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState('BTC/USD');
  
  // Get price from ticker data or use defaults
  const btcPrice = tickerData['XBT/USD']?.c?.[0] ? parseFloat(tickerData['XBT/USD'].c[0]) : 36750;
  const ethPrice = tickerData['ETH/USD']?.c?.[0] ? parseFloat(tickerData['ETH/USD'].c[0]) : 2470;
  
  // Generate demo data based on current price
  const btcData = generateDemoData(btcPrice);
  const ethData = generateDemoData(ethPrice);
  
  // Select appropriate data based on currency
  const chartData = selectedCurrency === 'BTC/USD' ? btcData : ethData;
  const currentPrice = selectedCurrency === 'BTC/USD' ? btcPrice : ethPrice;
  
  return (
    <Card className="col-span-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Price Chart</CardTitle>
            <CardDescription>
              {demoMode ? 'Demo data - for illustration only' : '24 hour price movement'}
            </CardDescription>
          </div>
          <div className="text-2xl font-bold">
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="BTC/USD" onValueChange={setSelectedCurrency}>
          <TabsList className="mb-4">
            <TabsTrigger value="BTC/USD">BTC/USD</TabsTrigger>
            <TabsTrigger value="ETH/USD">ETH/USD</TabsTrigger>
          </TabsList>
          
          <TabsContent value="BTC/USD" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={btcData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} tickFormatter={() => ''} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  activeDot={{ r: 6 }}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="ETH/USD" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ethData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} tickFormatter={() => ''} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#8b5cf6"
                  activeDot={{ r: 6 }}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CurrencyPriceChart;
