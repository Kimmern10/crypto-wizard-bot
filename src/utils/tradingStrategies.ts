
export interface StrategyParams {
  riskLevel: number; // 0-100
  positionSize: number; // % of available funds
  takeProfitPercentage: number;
  stopLossPercentage: number;
  useMachineLearning: boolean;
}

export interface MarketData {
  pair: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  previousClose: number;
  historicalPrices: number[];
  historicalVolumes: number[];
}

export interface TradeSignal {
  type: 'buy' | 'sell' | 'hold';
  pair: string;
  price: number;
  confidence: number; // 0-100%
  reason: string;
}

// Abstract base class for all trading strategies
export abstract class TradingStrategy {
  protected params: StrategyParams;
  
  constructor(params: StrategyParams) {
    this.params = params;
  }
  
  abstract analyze(data: MarketData): TradeSignal;
  
  // Helper methods available to all strategies
  protected calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    const recentPrices = prices.slice(prices.length - period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }
  
  protected calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return this.calculateSMA(prices, prices.length);
    }
    
    const k = 2 / (period + 1);
    const yesterday = prices[prices.length - 2];
    const emaYesterday = this.calculateEMA(prices.slice(0, -1), period);
    return (prices[prices.length - 1] * k) + (emaYesterday * (1 - k));
  }
  
  protected calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length <= period) {
      return 50; // Default to neutral if not enough data
    }
    
    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    // Get gains and losses
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
    
    // Calculate average gain and loss
    const avgGain = this.calculateSMA(gains.slice(-period), period);
    const avgLoss = this.calculateSMA(losses.slice(-period), period);
    
    if (avgLoss === 0) {
      return 100; // No losses means RSI is 100
    }
    
    // Calculate RSI
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
}

// Trend Following Strategy Implementation
export class TrendFollowingStrategy extends TradingStrategy {
  analyze(data: MarketData): TradeSignal {
    // Get short and long term moving averages
    const shortTermEMA = this.calculateEMA(data.historicalPrices, 9);
    const longTermEMA = this.calculateEMA(data.historicalPrices, 21);
    
    // Calculate RSI
    const rsi = this.calculateRSI(data.historicalPrices);
    
    // Determine trade direction based on moving average crossovers
    let type: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 50;
    let reason = '';
    
    if (shortTermEMA > longTermEMA) {
      // Uptrend
      if (rsi < 70) { // Not overbought
        type = 'buy';
        confidence = 60 + (10 * (shortTermEMA - longTermEMA) / longTermEMA);
        reason = 'Uptrend detected with EMA crossover';
      } else {
        type = 'hold';
        reason = 'Uptrend detected but market is overbought';
      }
    } else if (shortTermEMA < longTermEMA) {
      // Downtrend
      if (rsi > 30) { // Not oversold
        type = 'sell';
        confidence = 60 + (10 * (longTermEMA - shortTermEMA) / longTermEMA);
        reason = 'Downtrend detected with EMA crossover';
      } else {
        type = 'hold';
        reason = 'Downtrend detected but market is oversold';
      }
    } else {
      type = 'hold';
      reason = 'No clear trend direction';
    }
    
    // Adjust confidence based on risk level
    confidence = Math.min(95, confidence * (0.5 + (this.params.riskLevel / 200)));
    
    return {
      type,
      pair: data.pair,
      price: data.price,
      confidence,
      reason
    };
  }
}

// Mean Reversion Strategy Implementation
export class MeanReversionStrategy extends TradingStrategy {
  analyze(data: MarketData): TradeSignal {
    // Calculate Bollinger Bands
    const period = 20;
    const sma = this.calculateSMA(data.historicalPrices, period);
    
    // Calculate standard deviation
    const recentPrices = data.historicalPrices.slice(-period);
    const sumSquaredDiff = recentPrices.reduce((sum, price) => {
      const diff = price - sma;
      return sum + (diff * diff);
    }, 0);
    const stdDev = Math.sqrt(sumSquaredDiff / period);
    
    // Calculate Bollinger Bands
    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    
    // Determine trade signal based on price relation to bands
    let type: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 50;
    let reason = '';
    
    const currentPrice = data.price;
    const rsi = this.calculateRSI(data.historicalPrices);
    
    if (currentPrice > upperBand) {
      // Price is above upper band - potential sell signal
      type = 'sell';
      const deviation = (currentPrice - upperBand) / stdDev;
      confidence = 60 + Math.min(30, 15 * deviation);
      reason = 'Price above upper Bollinger Band';
    } else if (currentPrice < lowerBand) {
      // Price is below lower band - potential buy signal
      type = 'buy';
      const deviation = (lowerBand - currentPrice) / stdDev;
      confidence = 60 + Math.min(30, 15 * deviation);
      reason = 'Price below lower Bollinger Band';
    } else {
      // Price is within bands
      const percentPosition = (currentPrice - lowerBand) / (upperBand - lowerBand);
      if (percentPosition < 0.3 && rsi < 40) {
        type = 'buy';
        confidence = 50 + (50 * (1 - percentPosition));
        reason = 'Price near lower Bollinger Band with low RSI';
      } else if (percentPosition > 0.7 && rsi > 60) {
        type = 'sell';
        confidence = 50 + (50 * percentPosition);
        reason = 'Price near upper Bollinger Band with high RSI';
      } else {
        type = 'hold';
        reason = 'Price within normal Bollinger Band range';
      }
    }
    
    // Adjust confidence based on risk level
    confidence = Math.min(95, confidence * (0.5 + (this.params.riskLevel / 200)));
    
    return {
      type,
      pair: data.pair,
      price: currentPrice,
      confidence,
      reason
    };
  }
}

// Breakout Strategy Implementation
export class BreakoutStrategy extends TradingStrategy {
  analyze(data: MarketData): TradeSignal {
    // Identify recent high and low levels
    const period = 14; // Look back period
    const recentPrices = data.historicalPrices.slice(-period);
    
    if (recentPrices.length < period) {
      return {
        type: 'hold',
        pair: data.pair,
        price: data.price,
        confidence: 0,
        reason: 'Insufficient historical data'
      };
    }
    
    const recentHigh = Math.max(...recentPrices);
    const recentLow = Math.min(...recentPrices);
    
    // Check for breakout conditions
    const currentPrice = data.price;
    let type: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 50;
    let reason = '';
    
    // Volume factor - higher volume increases confidence
    const averageVolume = this.calculateSMA(data.historicalVolumes, period);
    const volumeFactor = data.volume / averageVolume;
    
    // Breakout thresholds (adjust based on volatility)
    const priceRange = recentHigh - recentLow;
    const highBreakoutThreshold = recentHigh + (priceRange * 0.02);
    const lowBreakoutThreshold = recentLow - (priceRange * 0.02);
    
    if (currentPrice > highBreakoutThreshold) {
      // Potential bullish breakout
      type = 'buy';
      const breakoutStrength = (currentPrice - recentHigh) / priceRange;
      confidence = 60 + Math.min(30, breakoutStrength * 100);
      reason = 'Bullish breakout above recent high';
      
      // Adjust for volume
      if (volumeFactor > 1.5) {
        confidence += 10;
        reason += ' with strong volume';
      }
    } else if (currentPrice < lowBreakoutThreshold) {
      // Potential bearish breakout
      type = 'sell';
      const breakoutStrength = (recentLow - currentPrice) / priceRange;
      confidence = 60 + Math.min(30, breakoutStrength * 100);
      reason = 'Bearish breakout below recent low';
      
      // Adjust for volume
      if (volumeFactor > 1.5) {
        confidence += 10;
        reason += ' with strong volume';
      }
    } else {
      // No breakout
      type = 'hold';
      reason = 'No significant breakout detected';
    }
    
    // Adjust confidence based on risk level
    confidence = Math.min(95, confidence * (0.5 + (this.params.riskLevel / 200)));
    
    return {
      type,
      pair: data.pair,
      price: currentPrice,
      confidence,
      reason
    };
  }
}

// ML Adaptive Strategy - would integrate with ML models in a real implementation
export class MLAdaptiveStrategy extends TradingStrategy {
  analyze(data: MarketData): TradeSignal {
    // In a real implementation, this would use trained ML models
    // For demonstration, we'll implement a blend of other strategies
    
    // Get signals from other strategies
    const trendFollowing = new TrendFollowingStrategy(this.params);
    const meanReversion = new MeanReversionStrategy(this.params);
    const breakout = new BreakoutStrategy(this.params);
    
    const trendSignal = trendFollowing.analyze(data);
    const reversionSignal = meanReversion.analyze(data);
    const breakoutSignal = breakout.analyze(data);
    
    // Determine current market regime (trending vs ranging)
    const isMarketTrending = this.isMarketTrending(data.historicalPrices);
    
    let finalSignal: TradeSignal;
    
    if (isMarketTrending) {
      // In trending markets, prioritize trend following and breakout strategies
      if (breakoutSignal.confidence > 70) {
        finalSignal = breakoutSignal;
        finalSignal.reason = 'ML Adaptive: ' + finalSignal.reason;
      } else {
        finalSignal = trendSignal;
        finalSignal.reason = 'ML Adaptive: ' + finalSignal.reason;
      }
    } else {
      // In ranging markets, prioritize mean reversion strategy
      finalSignal = reversionSignal;
      finalSignal.reason = 'ML Adaptive: ' + finalSignal.reason;
    }
    
    // Add some randomness to simulate ML optimization
    if (this.params.useMachineLearning) {
      finalSignal.confidence *= (0.9 + Math.random() * 0.2);
      finalSignal.confidence = Math.min(95, finalSignal.confidence);
    }
    
    return finalSignal;
  }
  
  // Helper method to determine if market is trending
  private isMarketTrending(prices: number[]): boolean {
    if (prices.length < 20) return false;
    
    // Calculate directional movement
    let upMoves = 0;
    let downMoves = 0;
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i-1]) {
        upMoves++;
      } else if (prices[i] < prices[i-1]) {
        downMoves++;
      }
    }
    
    // Calculate ADX-like measure
    const totalMoves = upMoves + downMoves;
    const directionalStrength = Math.abs(upMoves - downMoves) / totalMoves;
    
    // If directional strength is high, market is trending
    return directionalStrength > 0.3;
  }
}

// Factory function to create strategy based on selected type
export const createStrategy = (
  type: string, 
  params: StrategyParams
): TradingStrategy => {
  switch (type) {
    case 'trend_following':
      return new TrendFollowingStrategy(params);
    case 'mean_reversion':
      return new MeanReversionStrategy(params);
    case 'breakout':
      return new BreakoutStrategy(params);
    case 'ml_adaptive':
      return new MLAdaptiveStrategy(params);
    default:
      return new TrendFollowingStrategy(params);
  }
};
