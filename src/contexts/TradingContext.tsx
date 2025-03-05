
import { createContext, ReactNode } from 'react';
import { TradingContextType } from '@/types/tradingContextTypes';

// Create the context with undefined as initial value
const TradingContext = createContext<TradingContextType | undefined>(undefined);

// The provider component will be defined in TradingProvider.tsx
export default TradingContext;
