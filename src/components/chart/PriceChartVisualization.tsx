
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceDataPoint } from './types';
import { formatPrice } from './chartUtils';

interface PriceChartVisualizationProps {
  data: PriceDataPoint[];
  timeRanges: string[];
  activeTimeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const PriceChartVisualization: React.FC<PriceChartVisualizationProps> = ({
  data,
  timeRanges,
  activeTimeRange,
  onTimeRangeChange
}) => {
  return (
    <Tabs defaultValue={activeTimeRange} onValueChange={onTimeRangeChange} className="w-full">
      <div className="px-4 pt-2">
        <TabsList className="grid w-full grid-cols-4">
          {timeRanges.map(range => (
            <TabsTrigger key={range} value={range}>{range}</TabsTrigger>
          ))}
        </TabsList>
      </div>
      
      {timeRanges.map(range => (
        <TabsContent key={range} value={range} className="h-[300px] mt-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
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
  );
};

export default PriceChartVisualization;
