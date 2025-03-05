
export interface PriceDataPoint {
  time: string;
  price: number;
  volume?: number;
}

export interface ChartState {
  data: PriceDataPoint[];
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export interface ConnectionStatusData {
  isConnected: boolean;
  isDemoMode: boolean;
}
