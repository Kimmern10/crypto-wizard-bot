
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import ChartStats from './ChartStats';
import { ChartState } from './types';

interface ChartHeaderProps {
  chartState: ChartState;
  selectedPair: string;
  availablePairs: string[];
  onPairChange: (value: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const ChartHeader: React.FC<ChartHeaderProps> = ({
  chartState,
  selectedPair,
  availablePairs,
  onPairChange,
  onRefresh,
  refreshing
}) => {
  return (
    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="flex flex-col space-y-1">
        <CardTitle className="text-base font-medium">Live Price Chart</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={selectedPair} onValueChange={onPairChange}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Select pair" />
            </SelectTrigger>
            <SelectContent>
              {availablePairs.map(pair => (
                <SelectItem key={pair} value={pair}>{pair}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ChartStats chartState={chartState} selectedPair={selectedPair} />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={onRefresh} 
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Refresh data"
          disabled={refreshing}
        >
          <RefreshCw className={cn(
            "h-4 w-4",
            refreshing && "animate-spin"
          )} />
        </button>
      </div>
    </div>
  );
};

export default ChartHeader;
