
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, DollarSign, BarChart, TrendingUp, TrendingDown, AlertTriangle, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useTradingContext } from '@/hooks/useTradingContext';
import { cn } from '@/lib/utils';
import PerformanceChart from './PerformanceChart';

const Dashboard: React.FC = () => {
  const { 
    currentBalance, 
    activePositions, 
    isConnected, 
    connectionStatus, 
    lastConnectionEvent, 
    lastTickerData,
    apiKey,
    isApiConfigured,
    refreshData
  } = useTradingContext();
  
  const [isDemo, setIsDemo] = useState(false);

  // Calculate total balance value in USD from actual data
  const totalBalanceUSD = currentBalance.USD + 
    (currentBalance.BTC * (lastTickerData['XBT/USD']?.c?.[0] || 36750)) + 
    (currentBalance.ETH * (lastTickerData['ETH/USD']?.c?.[0] || 2470));

  // Get a random value between -3 and 5 for daily change if we don't have real data
  const dailyChangePercent = lastTickerData['XBT/USD']?.p?.[1] || 
    (Math.round((Math.random() * 8 - 3) * 10) / 10);
  
  // Check if we're in demo mode or real mode
  useEffect(() => {
    if (Object.keys(lastTickerData).length > 0) {
      console.log('Received ticker data for pairs:', Object.keys(lastTickerData).join(', '));
      
      // If we have ticker data and connectionStatus contains "Demo", mark as demo
      if (connectionStatus.includes('Demo')) {
        setIsDemo(true);
      }
    }
    
    // If the current error status includes CORS, we're likely in demo mode
    if (connectionStatus.toLowerCase().includes('failed') || 
        connectionStatus.toLowerCase().includes('error') ||
        connectionStatus.toLowerCase().includes('cors')) {
      setIsDemo(true);
    }
  }, [lastTickerData, connectionStatus]);
  
  // Debug connection status
  useEffect(() => {
    if (isConnected) {
      console.log('Dashboard detected connection status: Connected');
    } else {
      console.log('Dashboard detected connection status: Disconnected');
    }
    
    console.log('API configuration status:', isApiConfigured ? 'Configured' : 'Not configured');
    console.log('Current connection status:', connectionStatus);
    
    if (isApiConfigured && apiKey) {
      console.log('API key is present, first 4 characters:', apiKey.substring(0, 4) + '...');
    }
  }, [isConnected, isApiConfigured, connectionStatus, apiKey]);

  // Handle refresh button click
  const handleRefresh = () => {
    console.log('Manually refreshing data...');
    refreshData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemo && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-300">Demo Mode Active</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Due to CORS restrictions, this demo is running with simulated data. In a production environment, 
                you would need a backend proxy to connect to Kraken's API.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card animation-delay-100 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Portfolio Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBalanceUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center mt-1">
              <span className={cn(
                "text-xs font-medium flex items-center",
                dailyChangePercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {dailyChangePercent >= 0 
                  ? <TrendingUp className="h-3 w-3 mr-1" /> 
                  : <TrendingDown className="h-3 w-3 mr-1" />
                }
                {dailyChangePercent >= 0 ? "+" : ""}{dailyChangePercent}% today
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card animation-delay-200 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Positions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div>
                <div className="text-2xl font-bold">{activePositions.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activePositions.length === 0 
                    ? "No active positions" 
                    : `${activePositions.length} position${activePositions.length > 1 ? 's' : ''} open`}
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Not connected</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card animation-delay-300 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              API Connection
            </CardTitle>
            {isConnected ? (
              isDemo ? (
                <Wifi className="h-4 w-4 text-amber-500" />
              ) : (
                <Wifi className="h-4 w-4 text-green-600" />
              )
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {isDemo ? 'Demo Mode' : connectionStatus}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lastConnectionEvent || 'No connection events yet'}
            </p>
            {Object.keys(lastTickerData).length > 0 ? (
              <div className="mt-2 border-t pt-2">
                <p className="text-xs font-medium">Latest Ticker Data:</p>
                {Object.keys(lastTickerData).map(pair => (
                  <div key={pair} className="text-xs flex justify-between mt-1">
                    <span>{pair}:</span>
                    <span>${parseFloat(lastTickerData[pair]?.c?.[0] || '0').toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                Waiting for ticker data...
              </div>
            )}
            <button 
              onClick={handleRefresh}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Manually refresh data
            </button>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Performance Overview</CardTitle>
          <CardDescription className="text-xs">
            {isDemo ? 'Simulated data' : 'Live data'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PerformanceChart />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
