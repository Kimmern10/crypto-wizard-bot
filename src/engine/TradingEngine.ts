import { BaseStrategy, MarketData, StrategySignal } from '@/strategies/BaseStrategy';
import { OrderParams } from '@/types/trading';
import { toast } from 'sonner';

interface Position {
  pair: string;
  entryPrice: number;
  volume: number;
  entryTime: Date;
  stopLoss: number | null;
  takeProfit: number | null;
  isBuy: boolean;
}

interface TradingEngineConfig {
  onOrderExecute: (order: OrderParams) => Promise<any>;
  getBalance: () => Record<string, number>;
  maxConcurrentTrades: number;
  dryRun: boolean;
}

/**
 * TradingEngine is responsible for executing trading strategies
 * and handling order execution, risk management, and position tracking
 */
export class TradingEngine {
  private strategy: BaseStrategy;
  private isRunning: boolean = false;
  private openPositions: Map<string, Position> = new Map();
  private config: TradingEngineConfig;
  private marketData: Record<string, MarketData[]> = {};
  private lastUpdate: Record<string, Date> = {};
  private tradingIntervalId: NodeJS.Timeout | null = null;
  
  constructor(strategy: BaseStrategy, config: TradingEngineConfig) {
    this.strategy = strategy;
    this.config = config;
  }
  
  /**
   * Set the current strategy
   */
  public setStrategy(strategy: BaseStrategy): void {
    this.strategy = strategy;
  }
  
  /**
   * Update market data for a specific pair
   */
  public updateMarketData(pair: string, data: MarketData): void {
    if (!this.marketData[pair]) {
      this.marketData[pair] = [];
    }
    
    // Add new data
    this.marketData[pair].push(data);
    
    // Keep only the last 100 data points to prevent memory leaks
    if (this.marketData[pair].length > 100) {
      this.marketData[pair] = this.marketData[pair].slice(-100);
    }
    
    this.lastUpdate[pair] = new Date();
  }
  
  /**
   * Start the trading engine
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Trading engine already running');
      return;
    }
    
    console.log('Starting trading engine with strategy:', this.strategy.name);
    this.isRunning = true;
    
    // Start main trading loop
    this.tradingIntervalId = setInterval(() => {
      this.evaluatePositions();
    }, 5000); // Evaluate every 5 seconds
    
    toast.success(`Started trading with ${this.strategy.name} strategy`);
  }
  
  /**
   * Stop the trading engine
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('Trading engine already stopped');
      return;
    }
    
    console.log('Stopping trading engine');
    this.isRunning = false;
    
    if (this.tradingIntervalId) {
      clearInterval(this.tradingIntervalId);
      this.tradingIntervalId = null;
    }
    
    toast.info(`Stopped trading with ${this.strategy.name} strategy`);
  }
  
  /**
   * Check if the engine is currently running
   */
  public isEngineRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Get all open positions
   */
  public getOpenPositions(): Position[] {
    return Array.from(this.openPositions.values());
  }
  
  /**
   * Evaluate all trading pairs for signals
   */
  private evaluatePositions(): void {
    if (!this.isRunning) return;
    
    // Process each pair with available market data
    Object.entries(this.marketData).forEach(([pair, data]) => {
      // Skip if we haven't received updates in the last minute
      const lastUpdateTime = this.lastUpdate[pair];
      if (!lastUpdateTime || (new Date().getTime() - lastUpdateTime.getTime() > 60000)) {
        return;
      }
      
      // Check existing position for the pair
      const existingPosition = this.openPositions.get(pair);
      
      if (existingPosition) {
        // Evaluate exit signals if we have an open position
        this.evaluateExitSignal(pair, existingPosition, data);
      } else {
        // Only evaluate new entry if we haven't reached max concurrent trades
        if (this.openPositions.size < this.config.maxConcurrentTrades) {
          this.evaluateEntrySignal(pair, data);
        }
      }
    });
  }
  
  /**
   * Evaluate if we should enter a new position
   */
  private evaluateEntrySignal(pair: string, data: MarketData[]): void {
    if (!this.isRunning || data.length < 2) return;
    
    // Calculate signal using the strategy
    const signal = this.strategy.calculateBuySignal(data);
    
    // Check if signal is strong enough to act upon
    if (signal.action === 'buy' && signal.confidence >= 0.7) {
      const latestPrice = data[data.length - 1].close;
      const availableBalance = this.config.getBalance()['USD'] || 0;
      
      // Calculate position size based on risk
      const positionSize = this.strategy.calculatePositionSize(
        availableBalance,
        latestPrice,
        data
      );
      
      // Calculate actual volume to trade
      const volume = positionSize / latestPrice;
      
      // Execute the order
      const orderParams: OrderParams = {
        pair,
        type: 'buy',
        ordertype: 'market',
        volume: volume.toFixed(6) // Format to appropriate precision
      };
      
      // Execute order or simulate in dry run mode
      if (this.config.dryRun) {
        console.log('DRY RUN: Would execute buy order:', orderParams);
        this.simulateOrderExecution(orderParams, latestPrice);
      } else {
        this.executeOrder(orderParams, latestPrice);
      }
    }
  }
  
  /**
   * Evaluate if we should exit an existing position
   */
  private evaluateExitSignal(pair: string, position: Position, data: MarketData[]): void {
    if (!this.isRunning || data.length < 2) return;
    
    const latestData = data[data.length - 1];
    const currentPrice = latestData.close;
    
    // Check stop loss
    if (position.stopLoss !== null && 
        this.strategy.isStopLossHit(currentPrice, position.stopLoss, position.isBuy)) {
      this.closePosition(pair, currentPrice, 'Stop loss triggered');
      return;
    }
    
    // Check take profit
    if (position.takeProfit !== null && 
        this.strategy.isTakeProfitHit(currentPrice, position.takeProfit, position.isBuy)) {
      this.closePosition(pair, currentPrice, 'Take profit reached');
      return;
    }
    
    // Calculate signal using the strategy
    const signal = this.strategy.calculateSellSignal(data, position.entryPrice);
    
    // Check if signal is strong enough to act upon
    if (signal.action === 'sell' && signal.confidence >= 0.7) {
      this.closePosition(pair, currentPrice, signal.reason);
    }
  }
  
  /**
   * Close an existing position
   */
  private closePosition(pair: string, currentPrice: number, reason: string): void {
    const position = this.openPositions.get(pair);
    if (!position) return;
    
    const orderParams: OrderParams = {
      pair,
      type: 'sell',
      ordertype: 'market',
      volume: position.volume.toFixed(6) // Format to appropriate precision
    };
    
    // Execute order or simulate in dry run mode
    if (this.config.dryRun) {
      console.log(`DRY RUN: Would close position for ${pair} at ${currentPrice}. Reason: ${reason}`);
      this.simulateOrderExecution(orderParams, currentPrice);
    } else {
      // Execute real order
      this.executeOrder(orderParams, currentPrice, reason);
    }
    
    // Remove position from tracking
    this.openPositions.delete(pair);
  }
  
  /**
   * Execute an order
   */
  private async executeOrder(orderParams: OrderParams, price: number, reason: string = ''): Promise<void> {
    try {
      console.log(`Executing ${orderParams.type} order for ${orderParams.volume} ${orderParams.pair}. Reason: ${reason}`);
      
      const result = await this.config.onOrderExecute(orderParams);
      
      if (result) {
        // If buy order, track the position
        if (orderParams.type === 'buy') {
          const stopLoss = this.strategy.calculateStopLoss(price, true);
          const takeProfit = this.strategy.calculateTakeProfit(price, true);
          
          // Track the new position
          this.openPositions.set(orderParams.pair, {
            pair: orderParams.pair,
            entryPrice: price,
            volume: parseFloat(orderParams.volume),
            entryTime: new Date(),
            stopLoss,
            takeProfit,
            isBuy: true
          });
          
          toast.success(`Bought ${orderParams.volume} ${orderParams.pair} at ${price}`);
        } else {
          // Sell order
          toast.success(`Sold ${orderParams.volume} ${orderParams.pair} at ${price}. Reason: ${reason}`);
        }
      } else {
        console.error('Order execution failed with null result');
        toast.error(`Order execution failed for ${orderParams.pair}`);
      }
    } catch (error) {
      console.error('Error executing order:', error);
      toast.error(`Error executing order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Simulate order execution for dry run mode
   */
  private simulateOrderExecution(orderParams: OrderParams, price: number): void {
    if (orderParams.type === 'buy') {
      const stopLoss = this.strategy.calculateStopLoss(price, true);
      const takeProfit = this.strategy.calculateTakeProfit(price, true);
      
      // Track the new position
      this.openPositions.set(orderParams.pair, {
        pair: orderParams.pair,
        entryPrice: price,
        volume: parseFloat(orderParams.volume),
        entryTime: new Date(),
        stopLoss,
        takeProfit,
        isBuy: true
      });
      
      toast.success(`[SIMULATION] Bought ${orderParams.volume} ${orderParams.pair} at ${price}`);
    } else {
      // Sell order
      toast.success(`[SIMULATION] Sold ${orderParams.volume} ${orderParams.pair} at ${price}`);
    }
  }
}
