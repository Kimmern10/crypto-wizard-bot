
import { WebSocketMessage } from '@/types/websocketTypes';
import { MarketData } from '@/strategies/BaseStrategy';

/**
 * Converts WebSocket ticker data to MarketData format
 */
export const processTickerData = (message: WebSocketMessage): MarketData | null => {
  try {
    if (message.type !== 'ticker' || !message.data) {
      return null;
    }
    
    const { pair, c, o, h, l, v, timestamp } = message.data;
    
    // Validate required fields are present
    if (!pair || !c || !o || !h || !l || !v) {
      console.warn('Missing required ticker data fields', message.data);
      return null;
    }
    
    // Kraken ticker format has arrays for some values [price, lot volume]
    const close = Array.isArray(c) ? parseFloat(c[0]) : parseFloat(c);
    const open = Array.isArray(o) ? parseFloat(o[0]) : parseFloat(o);
    const high = Array.isArray(h) ? parseFloat(h[0]) : parseFloat(h);
    const low = Array.isArray(l) ? parseFloat(l[0]) : parseFloat(l);
    const volume = Array.isArray(v) ? parseFloat(v[0]) : parseFloat(v);
    
    // Create standardized market data object
    return {
      pair,
      close,
      open,
      high,
      low,
      volume,
      timestamp: timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error processing ticker data:', error);
    return null;
  }
};

/**
 * Aggregates ticker data into OHLC candles
 */
export const aggregateTickerData = (
  tickerData: MarketData[], 
  timeframe: '1m' | '5m' | '15m' | '1h' = '1m'
): MarketData[] => {
  if (!tickerData.length) return [];
  
  // Determine timeframe in minutes
  const minutes = timeframe === '1h' ? 60 : 
                  timeframe === '15m' ? 15 : 
                  timeframe === '5m' ? 5 : 1;
                  
  const millisecondsPerCandle = minutes * 60 * 1000;
  
  // Group data by candle time periods
  const groupedData: Record<string, MarketData[]> = {};
  
  tickerData.forEach(data => {
    const timestamp = new Date(data.timestamp).getTime();
    // Round down to nearest candle start time
    const candleTimestamp = Math.floor(timestamp / millisecondsPerCandle) * millisecondsPerCandle;
    const key = `${data.pair}-${candleTimestamp}`;
    
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    
    groupedData[key].push(data);
  });
  
  // Create OHLC candles from grouped data
  return Object.entries(groupedData).map(([key, dataPoints]) => {
    const pair = dataPoints[0].pair;
    const timestamp = new Date(parseInt(key.split('-')[1])).toISOString();
    
    // Sort by timestamp to ensure correct order
    const sorted = dataPoints.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Calculate OHLC values
    const open = sorted[0].close;
    const high = Math.max(...sorted.map(d => d.close));
    const low = Math.min(...sorted.map(d => d.close));
    const close = sorted[sorted.length - 1].close;
    const volume = sorted.reduce((sum, d) => sum + d.volume, 0);
    
    return {
      pair,
      timestamp,
      open,
      high,
      low,
      close,
      volume
    };
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * Formats market data for display
 */
export const formatMarketData = (data: MarketData): Record<string, string> => {
  return {
    pair: data.pair,
    price: data.close.toFixed(2),
    change: ((data.close - data.open) / data.open * 100).toFixed(2) + '%',
    high: data.high.toFixed(2),
    low: data.low.toFixed(2),
    volume: data.volume.toFixed(2),
    timestamp: new Date(data.timestamp).toLocaleTimeString()
  };
};
