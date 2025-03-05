
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Activity, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  ServerCrash,
  Server
} from 'lucide-react';
import { useTradingContext } from '@/hooks/useTradingContext';
import { cn } from '@/lib/utils';
import PerformanceChart from './PerformanceChart';
import LiveChart from './LiveChart';
import { Button } from "./ui/button";
import { toast } from "sonner";

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
    refreshData,
    restartConnection
  } = useTradingContext();
  
  const [isDemo, setIsDemo] = useState(false);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attemptingReconnect, setAttemptingReconnect] = useState(false);

  // Get the latest prices from ticker data or use defaults
  const btcPrice = lastTickerData['XBT/USD']?.c?.[0] ? parseFloat(lastTickerData['XBT/USD'].c[0]) : 36750;
  const ethPrice = lastTickerData['ETH/USD']?.c?.[0] ? parseFloat(lastTickerData['ETH/USD'].c[0]) : 2470;
  
  // Calculate total balance value in USD with proper validation
  const totalBalanceUSD = (
    (currentBalance.USD || 0) + 
    ((currentBalance.BTC || 0) * btcPrice) + 
    ((currentBalance.ETH || 0) * ethPrice)
  );

  // Get daily price change for BTC (as an overall market indicator)
  const dailyChangePercent = lastTickerData['XBT/USD']?.p?.[1] 
    ? parseFloat(lastTickerData['XBT/USD'].p[1]) 
    : (Math.round((Math.random() * 8 - 3) * 10) / 10);
  
  // Check if we're in demo mode or real mode
  useEffect(() => {
    if (Object.keys(lastTickerData).length > 0) {
      console.log('Received ticker data for pairs:', Object.keys(lastTickerData).join(', '));
      
      // If we have ticker data and connectionStatus contains "Demo", mark as demo
      if (connectionStatus.toLowerCase().includes('demo')) {
        setIsDemo(true);
      }
    }
    
    // Check for CORS issues in the connection status
    if (connectionStatus.toLowerCase().includes('cors')) {
      setCorsBlocked(true);
      setIsDemo(true);
    }
    
    // If the current status indicates failure or error, we might be in demo mode
    if (connectionStatus.toLowerCase().includes('failed') || 
        connectionStatus.toLowerCase().includes('error')) {
      setIsDemo(true);
    }
  }, [lastTickerData, connectionStatus]);
  
  // Debug connection status
  useEffect(() => {
    console.log('Dashboard detected connection status:', isConnected ? 'Connected' : 'Disconnected');
    console.log('API configuration status:', isApiConfigured ? 'Configured' : 'Not configured');
    console.log('Current connection status:', connectionStatus);
    
    if (isApiConfigured && apiKey) {
      console.log('API key is present, first 4 characters:', apiKey.substring(0, 4) + '...');
    }
  }, [isConnected, isApiConfigured, connectionStatus, apiKey]);

  // Handle refresh button click
  const handleRefresh = () => {
    console.log('Manually refreshing data...');
    setRefreshing(true);
    
    refreshData()
      .then(() => {
        toast.success('Data refreshed successfully');
      })
      .catch((error) => {
        console.error('Error refreshing data:', error);
        toast.error('Failed to refresh data');
      })
      .finally(() => {
        setRefreshing(false);
      });
  };
  
  // Handle reconnect button click
  const handleReconnect = () => {
    console.log('Manually restarting connection...');
    setAttemptingReconnect(true);
    
    restartConnection()
      .then(() => {
        toast.success('Connection restarted successfully');
      })
      .catch((error) => {
        console.error('Error restarting connection:', error);
        toast.error('Failed to restart connection');
      })
      .finally(() => {
        setAttemptingReconnect(false);
      });
  };

  // Function to show the technical details of CORS issues
  const handleShowTechnicalDetails = () => {
    toast.info('CORS Restriction Details', {
      description: `
        The browser prevents direct API calls to Kraken for security reasons.
        In production, this would require a proxy server to handle API requests.
      `,
      duration: 6000,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {corsBlocked && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-start space-x-3">
            <ServerCrash className="h-5 w-5 mt-1 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-300">CORS Restrictions Detected</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Your browser is preventing direct API calls to Kraken as a security measure. 
                In a production environment, you would need to implement a backend proxy to route these requests.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleShowTechnicalDetails}
                  className="text-amber-800 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/40"
                >
                  View Technical Details
                </Button>
              </div>
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
                {dailyChangePercent >= 0 ? "+" : ""}{dailyChangePercent.toFixed(2)}% today
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
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-amber-500">Demo</span>
                  <Server className="h-4 w-4 text-amber-500" />
                </div>
              ) : (
                <Wifi className="h-4 w-4 text-green-600" />
              )
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {connectionStatus}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lastConnectionEvent || 'No connection events yet'}
            </p>
            {Object.keys(lastTickerData).length > 0 ? (
              <div className="mt-2 border-t pt-2">
                <p className="text-xs font-medium">Latest Ticker Data:</p>
                {Object.keys(lastTickerData).slice(0, 3).map(pair => (
                  <div key={pair} className="text-xs flex justify-between mt-1">
                    <span>{pair}:</span>
                    <span className={cn(
                      parseFloat(lastTickerData[pair]?.c?.[0] || '0') > parseFloat(lastTickerData[pair]?.o?.[0] || '0')
                        ? "text-green-600"
                        : "text-red-600"
                    )}>
                      ${parseFloat(lastTickerData[pair]?.c?.[0] || '0').toLocaleString()}
                    </span>
                  </div>
                ))}
                {Object.keys(lastTickerData).length > 3 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{Object.keys(lastTickerData).length - 3} more pairs
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                Waiting for ticker data...
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Button 
                onClick={handleRefresh}
                className="w-full text-xs py-1 h-auto"
                variant="outline"
                size="sm"
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh data'}
              </Button>
              <Button 
                onClick={handleReconnect}
                className="w-full text-xs py-1 h-auto"
                variant="outline"
                size="sm"
                disabled={attemptingReconnect}
              >
                {attemptingReconnect ? 'Reconnecting...' : 'Restart connection'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LiveChart component */}
      <LiveChart />

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
