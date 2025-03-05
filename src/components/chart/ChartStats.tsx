
import React from 'react';
import { ChartState } from './types';
import { formatPrice } from './chartUtils';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface ChartStatsProps {
  chartState: ChartState;
  selectedPair: string;
}

const ChartStats: React.FC<ChartStatsProps> = ({ chartState, selectedPair }) => {
  return (
    <>
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
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
    </>
  );
};

export default ChartStats;
