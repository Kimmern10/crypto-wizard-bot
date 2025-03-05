
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useTradingContext } from '@/hooks/useTradingContext';

const StrategyParameters: React.FC = () => {
  const { 
    isRunning,
    strategyParams,
    updateStrategyParams
  } = useTradingContext();

  const handleRiskLevelChange = (value: number[]) => {
    updateStrategyParams({ riskLevel: value[0] });
  };

  const handlePositionSizeChange = (value: number[]) => {
    updateStrategyParams({ positionSize: value[0] });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Risk Level</Label>
          <span className="text-xs text-muted-foreground">{strategyParams.riskLevel}%</span>
        </div>
        <Slider 
          value={[strategyParams.riskLevel]} 
          max={100} 
          step={1}
          onValueChange={handleRiskLevelChange}
          disabled={isRunning} 
          className="py-1"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Position Size (% of available funds)</Label>
          <span className="text-xs text-muted-foreground">{strategyParams.positionSize}%</span>
        </div>
        <Slider 
          value={[strategyParams.positionSize]} 
          max={50} 
          step={1}
          onValueChange={handlePositionSizeChange}
          disabled={isRunning} 
          className="py-1"
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Take Profit</Label>
          <div className="flex items-center space-x-2">
            <Switch 
              id="take-profit" 
              checked={strategyParams.takeProfitEnabled}
              onCheckedChange={(checked) => updateStrategyParams({ takeProfitEnabled: checked })}
              disabled={isRunning} 
            />
            <span className="text-xs text-muted-foreground">{strategyParams.takeProfitPercentage}%</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Stop Loss</Label>
          <div className="flex items-center space-x-2">
            <Switch 
              id="stop-loss" 
              checked={strategyParams.stopLossEnabled}
              onCheckedChange={(checked) => updateStrategyParams({ stopLossEnabled: checked })} 
              disabled={isRunning} 
            />
            <span className="text-xs text-muted-foreground">{strategyParams.stopLossPercentage}%</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Use Machine Learning Optimization</Label>
          <Switch 
            id="ml-optimization" 
            checked={strategyParams.useMlOptimization}
            onCheckedChange={(checked) => updateStrategyParams({ useMlOptimization: checked })} 
            disabled={isRunning} 
          />
        </div>
      </div>
    </div>
  );
};

export default StrategyParameters;
