
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, ArrowDownUp, ChevronsUpDown, Brain, BadgeAlert } from 'lucide-react';
import { useTradingContext } from '@/hooks/useTradingContext';

const StrategySelector: React.FC = () => {
  const { 
    selectedStrategy, 
    setSelectedStrategy, 
    isRunning,
    availableStrategies
  } = useTradingContext();

  const selectedStrategyDetails = availableStrategies.find(strategy => strategy.id === selectedStrategy);

  return (
    <div className="space-y-3">
      <Label>Select Strategy</Label>
      <Select 
        value={selectedStrategy} 
        onValueChange={setSelectedStrategy}
        disabled={isRunning}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a strategy" />
        </SelectTrigger>
        <SelectContent>
          {availableStrategies.map(strategy => (
            <SelectItem key={strategy.id} value={strategy.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {strategy.id === 'trend_following' && <TrendingUp className="h-4 w-4" />}
                {strategy.id === 'mean_reversion' && <ArrowDownUp className="h-4 w-4" />}
                {strategy.id === 'breakout' && <ChevronsUpDown className="h-4 w-4" />}
                {strategy.id === 'ml_adaptive' && <Brain className="h-4 w-4" />}
                <span>{strategy.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedStrategyDetails && (
        <div className="mt-2 bg-secondary/50 p-3 rounded-md flex gap-2 text-sm">
          {selectedStrategyDetails.id === 'trend_following' && <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
          {selectedStrategyDetails.id === 'mean_reversion' && <ArrowDownUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
          {selectedStrategyDetails.id === 'breakout' && <ChevronsUpDown className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
          {selectedStrategyDetails.id === 'ml_adaptive' && <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
          <div>
            <p className="font-medium">{selectedStrategyDetails.name}</p>
            <p className="text-muted-foreground mt-1">{selectedStrategyDetails.description}</p>
            <div className="flex items-center gap-1 mt-2">
              <BadgeAlert className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">Risk Level: {selectedStrategyDetails.riskLevel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategySelector;
