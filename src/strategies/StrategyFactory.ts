
import { StrategyParams } from '@/types/trading';
import { BaseStrategy } from './BaseStrategy';
import { TrendFollowingStrategy } from './TrendFollowingStrategy';
import { MeanReversionStrategy } from './MeanReversionStrategy';

// Default configuration for strategies
const defaultStrategyConfig = {
  minimal_roi: {
    "0": 0.05,    // 5% profit after 0 minutes
    "30": 0.03,   // 3% profit after 30 minutes
    "60": 0.02    // 2% profit after 60 minutes
  },
  stoploss: -0.05,  // 5% stop loss
  trailing_stop: false,
  trailing_stop_positive: 0.01,
  trailing_stop_positive_offset: 0.02,
  trailing_only_offset_is_reached: true
};

/**
 * Factory class for creating trading strategies
 */
export class StrategyFactory {
  /**
   * Create a strategy based on the provided strategy ID
   */
  public static createStrategy(
    strategyId: string,
    params: StrategyParams
  ): BaseStrategy {
    switch (strategyId) {
      case 'trend_following':
        return new TrendFollowingStrategy({
          name: 'Trend Following',
          description: 'Follow the market trend and enter trades in the direction of the trend',
          params,
          ...defaultStrategyConfig
        });
        
      case 'mean_reversion':
        return new MeanReversionStrategy({
          name: 'Mean Reversion',
          description: 'Enter trades when the price deviates significantly from historical averages',
          params,
          ...defaultStrategyConfig,
          // Customizations specific to mean reversion
          minimal_roi: {
            "0": 0.03,   // 3% profit is enough for mean reversion
            "30": 0.02,  // 2% profit after 30 minutes
            "60": 0.01   // 1% profit after 60 minutes
          },
        });
      
      // Add more strategy implementations as needed
        
      default:
        // Fallback to trend following if unknown strategy
        console.warn(`Unknown strategy ID: ${strategyId}, defaulting to Trend Following`);
        return new TrendFollowingStrategy({
          name: 'Trend Following',
          description: 'Follow the market trend and enter trades in the direction of the trend',
          params,
          ...defaultStrategyConfig
        });
    }
  }
  
  /**
   * Get available strategy options
   */
  public static getAvailableStrategies() {
    return [
      {
        id: 'trend_following',
        name: 'Trend Following',
        description: 'Follow the market trend and enter trades in the direction of the trend',
        riskLevel: 'Medium'
      },
      {
        id: 'mean_reversion',
        name: 'Mean Reversion',
        description: 'Enter trades when the price deviates significantly from historical averages',
        riskLevel: 'Medium-High'
      },
      // Add more strategies as they are implemented
    ];
  }
}
