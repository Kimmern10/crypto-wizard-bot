
import { toast } from 'sonner';
import { OrderParams } from '@/types/trading';

// Define types for trading strategies
interface StrategyParams {
  riskLevel: number;
  positionSize: number;
  takeProfitEnabled: boolean;
  stopLossEnabled: boolean;
  takeProfitPercentage: number;
  stopLossPercentage: number;
  useMlOptimization: boolean;
}

// Trading bot instance control
declare global {
  interface Window {
    botInterval: NodeJS.Timeout | undefined;
    botStatus: {
      isRunning: boolean;
      lastExecutionTime: number;
      trades: any[];
      errors: any[];
    };
  }
}

// Initialize bot status if it doesn't exist
if (typeof window !== 'undefined' && !window.botStatus) {
  window.botStatus = {
    isRunning: false,
    lastExecutionTime: 0,
    trades: [],
    errors: []
  };
}

// Helper function to log bot activity
const logBotActivity = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
  console.log(`[Trading Bot] ${message}`);
  if (type === 'error') {
    console.error(`[Trading Bot] ${message}`);
    if (window.botStatus) {
      window.botStatus.errors.push({
        timestamp: new Date().toISOString(),
        message
      });
    }
  }
};

export const startTradingBot = (
  isRunning: boolean, 
  selectedStrategy: string,
  sendOrder: (params: OrderParams) => Promise<any>,
  fetchBalance: () => Promise<any>,
  fetchOpenPositions: () => Promise<any>,
  fetchTradeHistory: () => Promise<any>,
  strategyParams?: Partial<StrategyParams>
) => {
  if (!sendOrder) {
    toast.error('Trading API not available');
    logBotActivity('Trading API not available', 'error');
    return;
  }
  
  if (window.botStatus) {
    window.botStatus.isRunning = true;
  }
  
  // Default strategy parameters
  const params: StrategyParams = {
    riskLevel: 50, // Medium risk (0-100)
    positionSize: 5, // 5% of available funds
    takeProfitEnabled: true,
    stopLossEnabled: true,
    takeProfitPercentage: 3.5,
    stopLossPercentage: 2.5,
    useMlOptimization: true,
    ...strategyParams
  };
  
  logBotActivity(`Trading bot started with strategy: ${selectedStrategy}`);
  console.log('Strategy parameters:', params);
  
  // Implement different trading logic based on strategy
  const executeStrategy = async (strategy: string) => {
    try {
      // Fetch latest account data
      const balance = await fetchBalance();
      const positions = await fetchOpenPositions();
      
      if (!balance) {
        throw new Error('Failed to fetch balance data');
      }
      
      // Basic trading decision based on strategy
      let shouldTrade = false;
      let orderType: 'buy' | 'sell' = 'buy';
      
      // Currently this is just a simulation - in a real system, 
      // this would implement actual technical analysis
      switch (strategy) {
        case 'trend_following':
          // Simulate trend detection (this would be replaced with actual technical analysis)
          const mockTrend = Math.random() > 0.7;
          shouldTrade = mockTrend;
          orderType = Math.random() > 0.6 ? 'buy' : 'sell';
          break;
          
        case 'mean_reversion':
          // Simulate mean reversion signal
          const mockDeviation = Math.random() > 0.8;
          shouldTrade = mockDeviation;
          // In mean reversion we often sell when price is high and buy when low
          orderType = Math.random() > 0.5 ? 'sell' : 'buy';
          break;
          
        case 'breakout':
          // Simulate breakout detection
          const mockBreakout = Math.random() > 0.9;
          shouldTrade = mockBreakout;
          orderType = Math.random() > 0.5 ? 'buy' : 'sell';
          break;
          
        case 'ml_adaptive':
          // Simulate ML-based decision
          const mockMlSignal = Math.random() > 0.85;
          shouldTrade = mockMlSignal;
          orderType = Math.random() > 0.5 ? 'buy' : 'sell';
          break;
          
        default:
          logBotActivity(`Unknown strategy: ${strategy}`, 'error');
          shouldTrade = false;
      }
      
      // Execute trade if signal is generated
      if (shouldTrade) {
        // Calculate position size based on available balance and risk parameters
        const availableUSD = balance.USD || 0;
        const tradeAmount = Math.min(
          availableUSD * (params.positionSize / 100),
          1000 // Hard limit for safety
        );
        
        if (tradeAmount < 10) {
          logBotActivity('Trade amount too small, skipping trade', 'info');
          return;
        }
        
        // Convert to BTC volume (simplified)
        const btcPrice = 36000; // In a real system, this would come from ticker data
        const volume = (tradeAmount / btcPrice).toFixed(6);
        
        const exampleOrder: OrderParams = {
          pair: 'XBT/USD',
          type: orderType,
          ordertype: 'market',
          volume: volume
        };
        
        logBotActivity(`Preparing to place order: ${orderType} ${volume} XBT/USD`, 'info');
        
        // In a real trading system, we would execute the order here
        if (Math.random() > 0.7) { // Simulate partial failure for testing
          await sendOrder(exampleOrder)
            .then((result) => {
              logBotActivity(`Order placed successfully: ${orderType} ${volume} XBT/USD`, 'success');
              toast.success(`${exampleOrder.type.toUpperCase()} order placed for ${exampleOrder.volume} ${exampleOrder.pair}`);
              
              // Record trade in bot status
              if (window.botStatus) {
                window.botStatus.trades.push({
                  timestamp: new Date().toISOString(),
                  type: orderType,
                  pair: 'XBT/USD',
                  volume,
                  status: 'success'
                });
              }
              
              // Refresh account data
              fetchBalance();
              fetchOpenPositions();
              fetchTradeHistory();
            })
            .catch((error) => {
              logBotActivity(`Order failed: ${error.message || 'Unknown error'}`, 'error');
              toast.error(`Order failed: ${error.message || 'Unknown error'}`);
            });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown trading bot error';
      logBotActivity(`Strategy execution error: ${errorMessage}`, 'error');
      toast.error(`Trading bot error: ${errorMessage}`);
    }
    
    // Update last execution time
    if (window.botStatus) {
      window.botStatus.lastExecutionTime = Date.now();
    }
  };
  
  // Run the strategy every minute with some initial jitter
  const initialDelay = Math.random() * 5000;
  setTimeout(() => {
    executeStrategy(selectedStrategy);
    
    const botInterval = setInterval(() => {
      if (!window.botStatus?.isRunning) {
        clearInterval(botInterval);
        return;
      }
      
      executeStrategy(selectedStrategy);
    }, 60000); // Run every minute
    
    window.botInterval = botInterval;
  }, initialDelay);
};

export const stopTradingBot = () => {
  if (window.botInterval) {
    clearInterval(window.botInterval);
    window.botInterval = undefined;
  }
  
  if (window.botStatus) {
    window.botStatus.isRunning = false;
  }
  
  logBotActivity('Trading bot stopped');
};

// Function to get bot status for monitoring
export const getBotStatus = () => {
  return window.botStatus || {
    isRunning: false,
    lastExecutionTime: 0,
    trades: [],
    errors: []
  };
};
