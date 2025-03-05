
import { BaseStrategy, BaseStrategyConfig, MarketData, StrategySignal } from './BaseStrategy';

/**
 * Trend Following Strategy
 * 
 * This strategy follows market trends by analyzing price movements
 * and entering trades in the direction of the established trend.
 */
export class TrendFollowingStrategy extends BaseStrategy {
  private shortPeriod: number;
  private longPeriod: number;
  
  constructor(config: BaseStrategyConfig) {
    super(config);
    
    // Default periods for trend detection
    this.shortPeriod = 10;
    this.longPeriod = 30;
  }
  
  /**
   * Set custom periods for the strategy
   */
  public setPeriods(shortPeriod: number, longPeriod: number): void {
    this.shortPeriod = shortPeriod;
    this.longPeriod = longPeriod;
  }
  
  /**
   * Calculate moving average for a specific period
   */
  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    const relevantPrices = prices.slice(prices.length - period);
    return relevantPrices.reduce((sum, price) => sum + price, 0) / period;
  }
  
  /**
   * Populate indicators needed for trend following strategy
   */
  public populateIndicators(marketData: MarketData[]): MarketData[] {
    if (marketData.length < 2) {
      return marketData;
    }
    
    // Extract close prices
    const closePrices = marketData.map(data => data.close);
    
    // Calculate moving averages and add to market data
    return marketData.map((data, index) => {
      const availablePrices = closePrices.slice(0, index + 1);
      
      // Add custom indicator properties
      return {
        ...data,
        shortMA: this.calculateMA(availablePrices, this.shortPeriod),
        longMA: this.calculateMA(availablePrices, this.longPeriod)
      };
    });
  }
  
  /**
   * Calculate buy signal based on trend following logic
   */
  public calculateBuySignal(marketData: MarketData[]): StrategySignal {
    if (marketData.length < 2) {
      return {
        action: 'hold',
        pair: marketData[0]?.pair || 'unknown',
        confidence: 0,
        reason: 'Insufficient data'
      };
    }
    
    // Get data with indicators
    const dataWithIndicators = this.populateIndicators(marketData);
    const current = dataWithIndicators[dataWithIndicators.length - 1];
    const previous = dataWithIndicators[dataWithIndicators.length - 2];
    
    // Check for trend following conditions
    const isShortAboveLong = (current as any).shortMA > (current as any).longMA;
    const wasShortBelowLong = (previous as any).shortMA < (previous as any).longMA;
    
    // Golden cross (short MA crosses above long MA)
    if (isShortAboveLong && wasShortBelowLong) {
      return {
        action: 'buy',
        pair: current.pair,
        confidence: 0.8,
        reason: 'Golden cross detected'
      };
    }
    
    // Uptrend continuation
    if (isShortAboveLong && current.close > previous.close) {
      const priceChangePercent = (current.close - previous.close) / previous.close;
      const momentum = Math.min(priceChangePercent * 100, 0.5);
      
      return {
        action: 'buy',
        pair: current.pair,
        confidence: 0.5 + momentum,
        reason: 'Uptrend continuation'
      };
    }
    
    return {
      action: 'hold',
      pair: current.pair,
      confidence: 0,
      reason: 'No buy signal'
    };
  }
  
  /**
   * Calculate sell signal based on trend following logic
   */
  public calculateSellSignal(marketData: MarketData[], entryPrice: number): StrategySignal {
    if (marketData.length < 2) {
      return {
        action: 'hold',
        pair: marketData[0]?.pair || 'unknown',
        confidence: 0,
        reason: 'Insufficient data'
      };
    }
    
    // Get data with indicators
    const dataWithIndicators = this.populateIndicators(marketData);
    const current = dataWithIndicators[dataWithIndicators.length - 1];
    const previous = dataWithIndicators[dataWithIndicators.length - 2];
    
    // Check for trend reversal conditions
    const isShortBelowLong = (current as any).shortMA < (current as any).longMA;
    const wasShortAboveLong = (previous as any).shortMA > (previous as any).longMA;
    
    // Death cross (short MA crosses below long MA)
    if (isShortBelowLong && wasShortAboveLong) {
      return {
        action: 'sell',
        pair: current.pair,
        confidence: 0.8,
        reason: 'Death cross detected'
      };
    }
    
    // Calculate profit/loss
    const pnlPercent = (current.close - entryPrice) / entryPrice;
    
    // Take profit based on ROI settings
    for (const [durationStr, threshold] of Object.entries(this.minimal_roi)) {
      const durationMinutes = parseInt(durationStr, 10);
      
      // If profit exceeds threshold for the time period, sell
      if (pnlPercent >= threshold) {
        return {
          action: 'sell',
          pair: current.pair,
          confidence: 0.7,
          reason: `ROI target reached: ${(pnlPercent * 100).toFixed(2)}%`
        };
      }
    }
    
    // Check stop loss
    if (pnlPercent <= -Math.abs(this.stoploss)) {
      return {
        action: 'sell',
        pair: current.pair,
        confidence: 1.0,
        reason: `Stop loss triggered: ${(pnlPercent * 100).toFixed(2)}%`
      };
    }
    
    return {
      action: 'hold',
      pair: current.pair,
      confidence: 0,
      reason: 'No sell signal'
    };
  }
}
