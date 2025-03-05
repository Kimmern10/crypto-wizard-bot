
import { supabase } from '@/integrations/supabase/client';
import { TickerData } from '@/types/websocketTypes';

// Function to simulate ticker data for demo purposes
export const simulateDemoTickerData = (
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
) => {
  // Fetch market data from a public API if available
  const fetchMarketPrices = async () => {
    try {
      // Example of using Edge Function to fetch price data
      const { data, error } = await supabase.functions.invoke('kraken-proxy', {
        body: {
          path: 'public/Ticker',
          method: 'GET',
          isPrivate: false,
          data: {
            pair: 'XXBTZUSD,XETHZUSD,XRPZUSD,DOTZUSD,ADAZUSD'
          }
        }
      });
      
      if (error) {
        console.error('Error fetching market prices:', error);
        return null;
      }
      
      console.log('Fetched market prices from API:', data);
      return data.result;
    } catch (error) {
      console.error('Failed to fetch market prices:', error);
      return null;
    }
  };
  
  // Initialize demo data
  const demoData: Record<string, TickerData> = {
    'XBT/USD': {
      pair: 'XBT/USD',
      c: ['36750.50', '0.05'],
      v: ['1250.45', '5430.87'],
      p: ['36725.75', '36650.30'],
      t: ['12500', '35000'],
      l: ['36500.00', '36300.00'],
      h: ['37000.00', '37200.00'],
      o: ['36600.00', '36500.00'],
      timestamp: new Date().toISOString()
    },
    'ETH/USD': {
      pair: 'ETH/USD',
      c: ['2470.25', '0.5'],
      v: ['15000.45', '42000.87'],
      p: ['2465.75', '2455.30'],
      t: ['22500', '65000'],
      l: ['2450.00', '2430.00'],
      h: ['2490.00', '2510.00'],
      o: ['2460.00', '2450.00'],
      timestamp: new Date().toISOString()
    },
    'XRP/USD': {
      pair: 'XRP/USD',
      c: ['0.5125', '1000'],
      v: ['2500000', '7800000'],
      p: ['0.5100', '0.5080'],
      t: ['3500', '12000'],
      l: ['0.5050', '0.5020'],
      h: ['0.5200', '0.5250'],
      o: ['0.5150', '0.5100'],
      timestamp: new Date().toISOString()
    },
    'DOT/USD': {
      pair: 'DOT/USD',
      c: ['5.75', '500'],
      v: ['350000', '980000'],
      p: ['5.70', '5.65'],
      t: ['2800', '9500'],
      l: ['5.60', '5.55'],
      h: ['5.85', '5.90'],
      o: ['5.80', '5.75'],
      timestamp: new Date().toISOString()
    },
    'ADA/USD': {
      pair: 'ADA/USD',
      c: ['0.35', '10000'],
      v: ['1500000', '4200000'],
      p: ['0.348', '0.345'],
      t: ['3200', '11000'],
      l: ['0.342', '0.340'],
      h: ['0.355', '0.360'],
      o: ['0.350', '0.348'],
      timestamp: new Date().toISOString()
    }
  };
  
  // Update with actual market prices if available
  fetchMarketPrices().then(prices => {
    if (prices) {
      // Mapping from Kraken API symbols to our symbols
      const symbolMap: Record<string, string> = {
        'XXBTZUSD': 'XBT/USD',
        'XETHZUSD': 'ETH/USD',
        'XRPZUSD': 'XRP/USD',
        'DOTZUSD': 'DOT/USD',
        'ADAZUSD': 'ADA/USD'
      };
      
      // Update demo data with actual prices
      Object.entries(prices).forEach(([apiSymbol, tickerData]: [string, any]) => {
        const symbol = symbolMap[apiSymbol] || apiSymbol;
        if (demoData[symbol]) {
          demoData[symbol].c[0] = tickerData.c[0];
          demoData[symbol].h[0] = tickerData.h[0];
          demoData[symbol].l[0] = tickerData.l[0];
          demoData[symbol].o[0] = tickerData.o[0];
          console.log(`Updated demo data for ${symbol} with real market price: ${tickerData.c[0]}`);
        }
      });
      
      // Update state with the updated data
      setLastTickerData(prev => ({
        ...prev,
        ...demoData
      }));
    }
  });
  
  // Update ticker data with demo values
  setLastTickerData(prev => ({
    ...prev,
    ...demoData
  }));
  
  // Simulate price updates every 10 seconds
  const updateInterval = setInterval(() => {
    Object.keys(demoData).forEach(pair => {
      const currentPrice = parseFloat(demoData[pair].c[0]);
      const change = (Math.random() * 0.02 - 0.01) * currentPrice; // -1% to +1%
      const newPrice = (currentPrice + change).toFixed(2);
      
      demoData[pair].c[0] = newPrice;
      demoData[pair].timestamp = new Date().toISOString();
      
      console.log(`Demo data update: ${pair} = ${newPrice}`);
    });
    
    setLastTickerData(prev => ({
      ...prev,
      ...demoData
    }));
  }, 10000);
  
  // Fetch actual market prices once a minute
  const marketUpdateInterval = setInterval(() => {
    fetchMarketPrices().then(prices => {
      if (prices) {
        // Mapping from Kraken API symbols to our symbols
        const symbolMap: Record<string, string> = {
          'XXBTZUSD': 'XBT/USD',
          'XETHZUSD': 'ETH/USD',
          'XRPZUSD': 'XRP/USD',
          'DOTZUSD': 'DOT/USD',
          'ADAZUSD': 'ADA/USD'
        };
        
        // Update demo data with actual prices
        Object.entries(prices).forEach(([apiSymbol, tickerData]: [string, any]) => {
          const symbol = symbolMap[apiSymbol] || apiSymbol;
          if (demoData[symbol]) {
            demoData[symbol].c[0] = tickerData.c[0];
            demoData[symbol].h[0] = tickerData.h[0];
            demoData[symbol].l[0] = tickerData.l[0];
            demoData[symbol].o[0] = tickerData.o[0];
            console.log(`Updated demo data for ${symbol} with real market price: ${tickerData.c[0]}`);
          }
        });
        
        // Update state with the updated data
        setLastTickerData(prev => ({
          ...prev,
          ...demoData
        }));
      }
    });
  }, 60000); // Every minute
  
  return () => {
    clearInterval(updateInterval);
    clearInterval(marketUpdateInterval);
  };
};
