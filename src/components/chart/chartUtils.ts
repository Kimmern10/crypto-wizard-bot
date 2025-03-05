
import { PriceDataPoint, ChartState } from './types';

// Helper function to format prices based on magnitude
export const formatPrice = (price: number): string => {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
  } else {
    return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
};

// Generate demo data for a specific pair
export const generateDemoData = (
  pair: string, 
  activeTimeRange: string,
  setChartState: (state: ChartState) => void,
  dataCollectionRef: React.MutableRefObject<{
    isActive: boolean;
    startTime: number;
    maxDataPoints: number;
    dataByTimeRange: Record<string, PriceDataPoint[]>;
  }>
): void => {
  console.log(`Generating demo data for ${pair}`);
  
  const collection = dataCollectionRef.current;
  const initialTimeRanges = Object.keys(collection.dataByTimeRange);
  
  initialTimeRanges.forEach(range => {
    collection.dataByTimeRange[range] = [];
  });
  
  const basePrices: Record<string, number> = {
    'XBT/USD': 36750,
    'ETH/USD': 2470,
    'XRP/USD': 0.52,
    'SOL/USD': 148.25,
    'DOT/USD': 7.20,
    'ADA/USD': 0.45
  };
  
  const basePrice = basePrices[pair] || 1000;
  const volatility = basePrice * 0.03;
  
  initialTimeRanges.forEach(range => {
    let points: number;
    let timeIncrement: number;
    
    switch(range) {
      case '1H': 
        points = 60; 
        timeIncrement = 60 * 1000;
        break;
      case '6H': 
        points = 72; 
        timeIncrement = 5 * 60 * 1000;
        break;
      case '24H': 
        points = 96; 
        timeIncrement = 15 * 60 * 1000;
        break;
      case '7D': 
        points = 168; 
        timeIncrement = 60 * 60 * 1000;
        break;
      default: 
        points = 100;
        timeIncrement = 15 * 60 * 1000;
    }
    
    let currentPrice = basePrice;
    let currentVolume = basePrice * 10;
    const trend = Math.random() > 0.5 ? 1 : -1;
    
    const now = Date.now();
    
    for (let i = 0; i < points; i++) {
      const pointTime = new Date(now - (points - i) * timeIncrement);
      
      const noise = (Math.random() - 0.5) * volatility;
      const trendComponent = (i / points) * trend * (volatility * 2);
      currentPrice = basePrice + noise + trendComponent;
      
      currentVolume = basePrice * 10 * (0.5 + Math.random());
      
      collection.dataByTimeRange[range].push({
        time: pointTime.toLocaleTimeString(),
        price: currentPrice,
        volume: currentVolume
      });
    }
  });
  
  const dataForRange = collection.dataByTimeRange[activeTimeRange];
  const currentPrice = dataForRange[dataForRange.length - 1].price;
  const firstPrice = dataForRange[0].price;
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;
  
  const pricesInRange = dataForRange.map(d => d.price);
  const highPrice = Math.max(...pricesInRange, 0);
  const lowPrice = Math.min(...pricesInRange, Infinity);
  const totalVolume = dataForRange.reduce((sum, point) => sum + (point.volume || 0), 0);
  
  setChartState({
    data: [...dataForRange],
    lastPrice: currentPrice,
    priceChange,
    priceChangePercent,
    highPrice,
    lowPrice: lowPrice === Infinity ? 0 : lowPrice,
    volume: totalVolume
  });
};

// Update chart with new ticker data
export const updateChartWithTickerData = (
  tickerData: any, 
  pair: string,
  activeTimeRange: string,
  dataCollectionRef: React.MutableRefObject<{
    isActive: boolean;
    startTime: number;
    maxDataPoints: number;
    dataByTimeRange: Record<string, PriceDataPoint[]>;
  }>,
  setChartState: (state: ChartState) => void
): void => {
  if (!tickerData || !tickerData.c || !tickerData.c[0]) {
    console.warn('Invalid ticker data received:', tickerData);
    return;
  }
  
  const currentPrice = parseFloat(tickerData.c[0]);
  const currentVolume = parseFloat(tickerData.v?.[1] || '0');
  const timestamp = new Date();
  
  const newDataPoint: PriceDataPoint = {
    time: timestamp.toLocaleTimeString(),
    price: currentPrice,
    volume: currentVolume
  };
  
  const collection = dataCollectionRef.current;
  const now = Date.now();
  const initialTimeRanges = Object.keys(collection.dataByTimeRange);
  
  initialTimeRanges.forEach(range => {
    let timeWindow: number;
    
    switch(range) {
      case '1H': timeWindow = 60 * 60 * 1000; break;
      case '6H': timeWindow = 6 * 60 * 60 * 1000; break;
      case '24H': timeWindow = 24 * 60 * 60 * 1000; break;
      case '7D': timeWindow = 7 * 24 * 60 * 60 * 1000; break;
      default: timeWindow = 24 * 60 * 60 * 1000;
    }
    
    // Add new data point to this time range
    collection.dataByTimeRange[range].push({...newDataPoint});
    
    // Filter out data points that are outside of the time window
    collection.dataByTimeRange[range] = collection.dataByTimeRange[range]
      .filter(point => {
        const timeComponents = point.time.split(':');
        const hours = parseInt(timeComponents[0]);
        const minutes = parseInt(timeComponents[1]);
        const secondsWithAmPm = timeComponents[2];
        
        // Handle AM/PM format if present
        let seconds = 0;
        let isPM = false;
        
        if (secondsWithAmPm.includes(' ')) {
          const [sec, ampm] = secondsWithAmPm.split(' ');
          seconds = parseInt(sec);
          isPM = ampm.toUpperCase() === 'PM';
        } else {
          seconds = parseInt(secondsWithAmPm);
        }
        
        const pointDate = new Date();
        pointDate.setHours(
          isPM && hours < 12 ? hours + 12 : hours,
          minutes,
          seconds
        );
        
        return now - pointDate.getTime() < timeWindow;
      });
    
    // Limit the number of data points to prevent memory issues
    if (collection.dataByTimeRange[range].length > collection.maxDataPoints) {
      collection.dataByTimeRange[range] = collection.dataByTimeRange[range].slice(
        collection.dataByTimeRange[range].length - collection.maxDataPoints
      );
    }
  });
  
  // Calculate statistics for the current time range
  const dataForRange = collection.dataByTimeRange[activeTimeRange];
  if (dataForRange.length > 0) {
    const firstPrice = dataForRange[0]?.price || currentPrice;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = (priceChange / firstPrice) * 100;
    
    const pricesInRange = dataForRange.map(d => d.price);
    const highPrice = Math.max(...pricesInRange, 0);
    const lowPrice = Math.min(...pricesInRange, Infinity);
    
    const totalVolume = dataForRange
      .reduce((sum, point) => sum + (point.volume || 0), 0);
    
    setChartState({
      data: [...dataForRange],
      lastPrice: currentPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice: lowPrice === Infinity ? 0 : lowPrice,
      volume: totalVolume
    });
  }
};

// Update chart state based on time range
export const updateChartForTimeRange = (
  activeTimeRange: string,
  dataCollectionRef: React.MutableRefObject<{
    isActive: boolean;
    startTime: number;
    maxDataPoints: number;
    dataByTimeRange: Record<string, PriceDataPoint[]>;
  }>,
  setChartState: (state: ChartState) => void
): void => {
  const dataForRange = dataCollectionRef.current.dataByTimeRange[activeTimeRange];
  
  if (dataForRange.length > 0) {
    const currentPrice = dataForRange[dataForRange.length - 1].price;
    const firstPrice = dataForRange[0].price;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = (priceChange / firstPrice) * 100;
    
    const pricesInRange = dataForRange.map(d => d.price);
    const highPrice = Math.max(...pricesInRange, 0);
    const lowPrice = Math.min(...pricesInRange, Infinity);
    
    const totalVolume = dataForRange
      .reduce((sum, point) => sum + (point.volume || 0), 0);
    
    setChartState({
      data: [...dataForRange],
      lastPrice: currentPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice: lowPrice === Infinity ? 0 : lowPrice,
      volume: totalVolume
    });
  }
};
