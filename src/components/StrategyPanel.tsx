
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTradingContext } from '@/hooks/useTradingContext';
import { 
  Play, 
  Square, 
  Sliders, 
  ChevronsUpDown, 
  Brain, 
  TrendingUp, 
  ArrowDownUp, 
  BadgeAlert, 
  RefreshCw,
  ServerCrash
} from 'lucide-react';
import { toast } from 'sonner';

const strategyOptions = [
  {
    id: 'trend_following',
    name: 'Trend Following',
    description: 'Follow the market trend and enter trades in the direction of the trend',
    icon: TrendingUp,
    riskLevel: 'Medium'
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Enter trades when the price deviates significantly from historical averages',
    icon: ArrowDownUp,
    riskLevel: 'Medium-High'
  },
  {
    id: 'breakout',
    name: 'Breakout Strategy',
    description: 'Enter trades when price breaks through significant support or resistance levels',
    icon: ChevronsUpDown,
    riskLevel: 'High'
  },
  {
    id: 'ml_adaptive',
    name: 'ML Adaptive',
    description: 'Use machine learning to dynamically optimize strategy parameters',
    icon: Brain,
    riskLevel: 'Variable'
  }
];

const StrategyPanel: React.FC = () => {
  const { 
    selectedStrategy, 
    setSelectedStrategy, 
    isRunning, 
    toggleRunning,
    isConnected,
    strategyParams,
    updateStrategyParams,
    refreshData,
    connectionStatus
  } = useTradingContext();
  
  const selectedStrategyDetails = strategyOptions.find(strategy => strategy.id === selectedStrategy);
  const isDemoMode = connectionStatus.toLowerCase().includes('demo') || 
                    connectionStatus.toLowerCase().includes('cors');

  const handleRiskLevelChange = (value: number[]) => {
    updateStrategyParams({ riskLevel: value[0] });
  };

  const handlePositionSizeChange = (value: number[]) => {
    updateStrategyParams({ positionSize: value[0] });
  };

  const handleRefreshData = () => {
    refreshData();
    toast.success('Data refreshed');
  };

  const handleRunButtonClick = () => {
    if (isDemoMode && !isRunning) {
      toast.info('Starting trading bot in demo mode', {
        description: 'Orders will be simulated and no real trades will be executed',
        duration: 5000
      });
    }
    
    toggleRunning();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Trading Strategy
            </CardTitle>
            <CardDescription>Configure and activate your trading strategy</CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {isDemoMode && (
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ServerCrash className="h-3 w-3" />
                Demo Mode
              </span>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefreshData}
              disabled={!isConnected}
              className="h-8 w-8"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              onClick={handleRunButtonClick}
              disabled={!isConnected}
              className="flex items-center gap-1"
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4" /> Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
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
              {strategyOptions.map(strategy => (
                <SelectItem key={strategy.id} value={strategy.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <strategy.icon className="h-4 w-4" />
                    <span>{strategy.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedStrategyDetails && (
            <div className="mt-2 bg-secondary/50 p-3 rounded-md flex gap-2 text-sm">
              <selectedStrategyDetails.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
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
        
        <div className="space-y-6 pt-2">
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
      </CardContent>
    </Card>
  );
};

export default StrategyPanel;
