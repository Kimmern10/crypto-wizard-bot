
import { useContext } from 'react';
import TradingContext from '@/contexts/TradingContext';
import { TradingProvider } from '@/providers/TradingProvider';

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
};

export { TradingProvider };
