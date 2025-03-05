
import { StrategyParams } from '@/types/trading';

export interface StrategySignal {
  action: 'buy' | 'sell' | 'hold';
  pair: string;
  confidence: number;
  reason: string;
}

export interface MarketData {
  pair: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
  bid?: number;
  ask?: number;
}

export interface BaseStrategyConfig {
  name: string;
  description: string;
  params: StrategyParams;
  minimal_roi: Record<string, number>;
  stoploss: number;
  trailing_stop: boolean;
  trailing_stop_positive?: number;
  trailing_stop_positive_offset?: number;
  trailing_only_offset_is_reached?: boolean;
}

/**
 * Base class for all trading strategies
 * Inspired by Freqtrade's strategy architecture
 */
export abstract class BaseStrategy {
  public readonly name: string;
  public readonly description: string;
  protected params: StrategyParams;
  protected minimal_roi: Record<string, number>;
  protected stoploss: number;
  protected trailing_stop: boolean;
  protected trailing_stop_positive?: number;
  protected trailing_stop_positive_offset?: number;
  protected trailing_only_offset_is_reached?: boolean;
  
  constructor(config: BaseStrategyConfig) {
    this.name = config.name;
    this.description = config.description;
    this.params = config.params;
    this.minimal_roi = config.minimal_roi;
    this.stoploss = config.stoploss;
    this.trailing_stop = config.trailing_stop;
    this.trailing_stop_positive = config.trailing_stop_positive;
    this.trailing_stop_positive_offset = config.trailing_stop_positive_offset;
    this.trailing_only_offset_is_reached = config.trailing_only_offset_is_reached;
  }

  /**
   * Update strategy parameters
   */
  public updateParams(newParams: Partial<StrategyParams>): void {
    this.params = { ...this.params, ...newParams };
  }

  /**
   * Get strategy parameters
   */
  public getParams(): StrategyParams {
    return { ...this.params };
  }

  /**
   * Get strategy configuration including risk settings
   */
  public getConfig(): BaseStrategyConfig {
    return {
      name: this.name,
      description: this.description,
      params: this.params,
      minimal_roi: this.minimal_roi,
      stoploss: this.stoploss,
      trailing_stop: this.trailing_stop,
      trailing_stop_positive: this.trailing_stop_positive,
      trailing_stop_positive_offset: this.trailing_stop_positive_offset,
      trailing_only_offset_is_reached: this.trailing_only_offset_is_reached
    };
  }

  /**
   * Calculate the buy signal based on the provided market data
   * Must be implemented by each strategy
   */
  public abstract calculateBuySignal(marketData: MarketData[]): StrategySignal;

  /**
   * Calculate the sell signal based on the provided market data
   * Must be implemented by each strategy
   */
  public abstract calculateSellSignal(marketData: MarketData[], entryPrice: number): StrategySignal;

  /**
   * Analyzes current market conditions to determine optimal position size
   * Can be overridden by specific strategies for custom sizing logic
   */
  public calculatePositionSize(
    availableBalance: number, 
    currentPrice: number, 
    marketData: MarketData[]
  ): number {
    // Default implementation uses the riskLevel param
    const riskPercentage = this.params.riskLevel / 100;
    const positionSize = availableBalance * riskPercentage;
    
    // Limit position size based on positionSize param
    const maxPositionSize = availableBalance * (this.params.positionSize / 100);
    return Math.min(positionSize, maxPositionSize);
  }

  /**
   * Calculates stop loss price based on entry price
   */
  public calculateStopLoss(entryPrice: number, isBuy: boolean): number | null {
    if (!this.params.stopLossEnabled) {
      return null;
    }
    
    const stopLossPercentage = this.params.stopLossPercentage / 100;
    
    // For long positions, stop loss is below entry price
    if (isBuy) {
      return entryPrice * (1 - stopLossPercentage);
    } 
    // For short positions, stop loss is above entry price
    else {
      return entryPrice * (1 + stopLossPercentage);
    }
  }

  /**
   * Calculates take profit price based on entry price
   */
  public calculateTakeProfit(entryPrice: number, isBuy: boolean): number | null {
    if (!this.params.takeProfitEnabled) {
      return null;
    }
    
    const takeProfitPercentage = this.params.takeProfitPercentage / 100;
    
    // For long positions, take profit is above entry price
    if (isBuy) {
      return entryPrice * (1 + takeProfitPercentage);
    } 
    // For short positions, take profit is below entry price
    else {
      return entryPrice * (1 - takeProfitPercentage);
    }
  }

  /**
   * Determines if the current price has hit the stop loss level
   */
  public isStopLossHit(currentPrice: number, stopLossPrice: number, isBuy: boolean): boolean {
    if (!this.params.stopLossEnabled || !stopLossPrice) {
      return false;
    }
    
    // For long positions, stop loss is hit if price falls below stop loss price
    if (isBuy) {
      return currentPrice <= stopLossPrice;
    } 
    // For short positions, stop loss is hit if price rises above stop loss price
    else {
      return currentPrice >= stopLossPrice;
    }
  }

  /**
   * Determines if the current price has hit the take profit level
   */
  public isTakeProfitHit(currentPrice: number, takeProfitPrice: number, isBuy: boolean): boolean {
    if (!this.params.takeProfitEnabled || !takeProfitPrice) {
      return false;
    }
    
    // For long positions, take profit is hit if price rises above take profit price
    if (isBuy) {
      return currentPrice >= takeProfitPrice;
    } 
    // For short positions, take profit is hit if price falls below take profit price
    else {
      return currentPrice <= takeProfitPrice;
    }
  }

  /**
   * Populates indicators for the strategy (like moving averages, RSI, etc.)
   * Can be overridden by specific strategies for custom indicators
   */
  public populateIndicators(marketData: MarketData[]): MarketData[] {
    // Base implementation doesn't modify the data
    // Specific strategies will implement this method
    return marketData;
  }
}
