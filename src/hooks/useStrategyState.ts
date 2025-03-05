
import { useState } from 'react';
import { StrategyParams } from '@/types/trading';

export const useStrategyState = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('trend_following');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    riskLevel: 25,
    positionSize: 10,
    takeProfitEnabled: true,
    stopLossEnabled: true,
    takeProfitPercentage: 5,
    stopLossPercentage: 3,
    useMlOptimization: false
  });

  // Toggle running state for strategy
  const toggleRunning = () => {
    setIsRunning(prev => !prev);
  };

  // Update strategy parameters
  const updateStrategyParams = (params: Partial<StrategyParams>) => {
    setStrategyParams(prev => ({ ...prev, ...params }));
  };

  return {
    selectedStrategy,
    setSelectedStrategy,
    isRunning,
    toggleRunning,
    strategyParams,
    updateStrategyParams
  };
};
