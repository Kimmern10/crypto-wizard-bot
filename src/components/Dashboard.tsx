
import React, { useEffect, useState } from 'react';
import { useTradingContext } from '@/hooks/useTradingContext';
import { toast } from "sonner";
import DashboardLayout from './dashboard/DashboardLayout';
import { Loader2 } from 'lucide-react';

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
    restartConnection,
    isLoading,
    isRefreshing,
    lastDataRefresh,
    error,
    dailyChangePercent
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

  // Format timestamp for last refresh
  const formattedLastRefresh = lastDataRefresh 
    ? lastDataRefresh.toLocaleTimeString() 
    : 'Never';

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

  // Handle refresh button click with better state management
  const handleRefresh = () => {
    console.log('Manually refreshing data...');
    setRefreshing(true);
    
    refreshData()
      .then(() => {
        toast.success('Data refreshed successfully');
      })
      .catch((error) => {
        console.error('Error refreshing data:', error);
        toast.error('Failed to refresh data', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      })
      .finally(() => {
        setRefreshing(false);
      });
  };
  
  // Handle reconnect button click with better state management
  const handleReconnect = () => {
    console.log('Manually restarting connection...');
    setAttemptingReconnect(true);
    
    restartConnection()
      .then(() => {
        toast.success('Connection restarted successfully');
      })
      .catch((error) => {
        console.error('Error restarting connection:', error);
        toast.error('Failed to restart connection', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      })
      .finally(() => {
        setAttemptingReconnect(false);
      });
  };

  // Show loading state while initially loading
  if (isLoading && !isRefreshing && !refreshing && !attemptingReconnect) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">Loading dashboard data...</p>
        {error && (
          <p className="text-destructive text-xs mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout
      isConnected={isConnected}
      isDemo={isDemo}
      corsBlocked={corsBlocked}
      connectionStatus={connectionStatus}
      lastConnectionEvent={lastConnectionEvent}
      activePositions={activePositions}
      lastTickerData={lastTickerData}
      totalBalanceUSD={totalBalanceUSD}
      dailyChangePercent={dailyChangePercent}
      refreshing={refreshing || isRefreshing}
      attemptingReconnect={attemptingReconnect}
      onRefresh={handleRefresh}
      onReconnect={handleReconnect}
      lastDataRefresh={formattedLastRefresh}
      error={error}
    />
  );
};

export default Dashboard;
