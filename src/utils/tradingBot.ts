
import { toast } from 'sonner';
import { OrderParams } from '@/types/trading';

declare global {
  interface Window {
    botInterval: number | undefined;
  }
}

export const startTradingBot = (
  isRunning: boolean, 
  selectedStrategy: string,
  sendOrder: (params: OrderParams) => Promise<any>,
  fetchBalance: () => Promise<any>,
  fetchOpenPositions: () => Promise<any>,
  fetchTradeHistory: () => Promise<any>
) => {
  if (!sendOrder) {
    toast.error('Trading API not available');
    return;
  }
  
  console.log(`Trading bot started with strategy: ${selectedStrategy}`);
  
  const botInterval = setInterval(() => {
    if (!isRunning) {
      clearInterval(botInterval);
      return;
    }
    
    console.log(`Bot executing strategy: ${selectedStrategy}`);
    
    if (Math.random() > 0.95) {
      const orderType = Math.random() > 0.5 ? 'buy' : 'sell';
      const exampleOrder: OrderParams = {
        pair: 'XBT/USD',
        type: orderType as 'buy' | 'sell',
        ordertype: 'market',
        volume: '0.001'
      };
      
      console.log('Trading bot preparing to place order:', exampleOrder);
      
      sendOrder(exampleOrder)
        .then(() => {
          toast.success(`${exampleOrder.type.toUpperCase()} order placed for ${exampleOrder.volume} ${exampleOrder.pair}`);
          fetchBalance();
          fetchOpenPositions();
          fetchTradeHistory();
        })
        .catch(error => {
          console.error('Order failed:', error);
          toast.error(`Order failed: ${error.message || 'Unknown error'}`);
        });
    }
  }, 10000);
  
  window.botInterval = botInterval;
};

export const stopTradingBot = () => {
  if (window.botInterval) {
    clearInterval(window.botInterval);
    console.log('Trading bot stopped');
  }
};
