
import { BaseStrategy, BaseStrategyConfig, MarketData, StrategySignal } from './BaseStrategy';

/**
 * Mean Reversion Strategy
 * 
 * This strategy is based on the principle that prices tend to revert to their mean.
 * It looks for overbought/oversold conditions to enter counter-trend positions.
 */
export class MeanReversionStrategy extends BaseStrategy {
  private period: number;
  private overboughtThreshold: number;
  private oversoldThreshold: number;
  
  constructor(config: BaseStrategyConfig) {
    super(config);
    
    // Default settings for RSI
    this.period = 14;
    this.overboughtThreshold = 70;
    this.oversoldThreshold = 30;
  }
  
  /**
   * Set custom RSI parameters
   */
  public setRsiParameters(period: number, overbought: number, oversold: number): void {
    this.period = period;
    this.overboughtThreshold = overbought;
    this.oversoldThreshold = oversold;
  }
  
  /**
   * Calculate Relative Strength Index (RSI)
   */
  private calculateRSI(prices: number[]): number {
    if (prices.length < this.period + 1) {
      return 50; // Not enough data, return neutral RSI
    }
    
    const deltas = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = deltas.map(delta => delta > 0 ? delta : 0);
    const losses = deltas.map(delta => delta < 0 ? Math.abs(delta) : 0);
    
    // Calculate average gains and losses
    const avgGain = gains.slice(-this.period).reduce((sum, gain) => sum + gain, 0) / this.period;
    const avgLoss = losses.slice(-this.period).reduce((sum, loss) => sum + loss, 0) / this.period;
    
    if (avgLoss === 0) {
      return 100; // No losses, RSI = 100 (extremely overbought)
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { 
    upper: number, 
    middle: number, 
    lower: number 
  } {
    if (prices.length < period) {
      return {
        upper: prices[prices.length - 1] * 1.05,
        middle: prices[prices.length - 1],
        lower: prices[prices.length - 1] * 0.95
      };
    }
    
    const sliced = prices.slice(-period);
    
    // Calculate SMA (middle band)
    const sma = sliced.reduce((sum, price) => sum + price, 0) / period;
    
    // Calculate standard deviation
    const variance = sliced.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }
  
  /**
   * Populate indicators for mean reversion strategy
   */
  public populateIndicators(marketData: MarketData[]): MarketData[] {
    if (marketData.length < this.period) {
      return marketData;
    }
    
    // Extract close prices
    const closePrices = marketData.map(data => data.close);
    
    // Calculate indicators for each candle
    return marketData.map((data, index) => {
      const availablePrices = closePrices.slice(0, index + 1);
      const rsi = this.calculateRSI(availablePrices);
      const bollingerBands = this.calculateBollingerBands(availablePrices);
      
      // Add custom indicator properties
      return {
        ...data,
        rsi,
        bollingerUpper: bollingerBands.upper,
        bollingerMiddle: bollingerBands.middle,
        bollingerLower: bollingerBands.lower
      };
    });
  }
  
  /**
   * Calculate buy signal based on mean reversion logic
   */
  public calculateBuySignal(marketData: MarketData[]): StrategySignal {
    if (marketData.length < this.period) {
      return {
        action: 'hold',
        pair: marketData[0]?.pair || 'unknown',
        confidence: 0,
        reason: 'Insufficient data for RSI calculation'
      };
    }
    
    // Get data with indicators
    const dataWithIndicators = this.populateIndicators(marketData);
    const current = dataWithIndicators[dataWithIndicators.length - 1];
    
    // Check if price is below lower Bollinger Band
    const isBelowLowerBand = current.close < (current as any).bollingerLower;
    
    // Check if RSI is oversold
    const isOversold = (current as any).rsi < this.oversoldThreshold;
    
    if (isOversold && isBelowLowerBand) {
      // Strong buy signal when both conditions are met
      return {
        action: 'buy',
        pair: current.pair,
        confidence: 0.9,
        reason: 'Price below lower Bollinger Band and RSI oversold'
      };
    } else if (isOversold) {
      // Moderate buy signal when only RSI is oversold
      return {
        action: 'buy',
        pair: current.pair,
        confidence: 0.7,
        reason: 'RSI oversold'
      };
    } else if (isBelowLowerBand) {
      // Weaker buy signal when only price is below lower band
      return {
        action: 'buy',
        pair: current.pair,
        confidence: 0.6,
        reason: 'Price below lower Bollinger Band'
      };
    }
    
    return {
      action: 'hold',
      pair: current.pair,
      confidence: 0,
      reason: 'No mean reversion buy signal'
    };
  }
  
  /**
   * Calculate sell signal based on mean reversion logic
   */
  public calculateSellSignal(marketData: MarketData[], entryPrice: number): StrategySignal {
    if (marketData.length < this.period) {
      return {
        action: 'hold',
        pair: marketData[0]?.pair || 'unknown',
        confidence: 0,
        reason: 'Insufficient data for RSI calculation'
      };
    }
    
    // Get data with indicators
    const dataWithIndicators = this.populateIndicators(marketData);
    const current = dataWithIndicators[dataWithIndicators.length - 1];
    
    // Check if price is above upper Bollinger Band
    const isAboveUpperBand = current.close > (current as any).bollingerUpper;
    
    // Check if RSI is overbought
    const isOverbought = (current as any).rsi > this.overboughtThreshold;
    
    // Calculate profit/loss
    const pnlPercent = (current.close - entryPrice) / entryPrice;
    
    // Stop loss check
    if (pnlPercent <= -Math.abs(this.stoploss)) {
      return {
        action: 'sell',
        pair: current.pair,
        confidence: 1.0,
        reason: `Stop loss triggered: ${(pnlPercent * 100).toFixed(2)}%`
      };
    }
    
    // Take profit based on ROI settings
    for (const [durationStr, threshold] of Object.entries(this.minimal_roi)) {
      const durationMinutes = parseInt(durationStr, 10);
      
      // If profit exceeds threshold for the time period, sell
      if (pnlPercent >= threshold) {
        return {
          action: 'sell',
          pair: current.pair,
          confidence: 0.8,
          reason: `ROI target reached: ${(pnlPercent * 100).toFixed(2)}%`
        };
      }
    }
    
    if (isOverbought && isAboveUpperBand) {
      // Strong sell signal when both conditions are met
      return {
        action: 'sell',
        pair: current.pair,
        confidence: 0.9,
        reason: 'Price above upper Bollinger Band and RSI overbought'
      };
    } else if (isOverbought) {
      // Moderate sell signal when only RSI is overbought
      return {
        action: 'sell',
        pair: current.pair,
        confidence: 0.7,
        reason: 'RSI overbought'
      };
    } else if (isAboveUpperBand) {
      // Weaker sell signal when only price is above upper band
      return {
        action: 'sell',
        pair: current.pair,
        confidence: 0.6,
        reason: 'Price above upper Bollinger Band'
      };
    }
    
    return {
      action: 'hold',
      pair: current.pair,
      confidence: 0,
      reason: 'No mean reversion sell signal'
    };
  }
}
