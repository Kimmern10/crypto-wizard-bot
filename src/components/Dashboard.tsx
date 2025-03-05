
import React, { useEffect, useState } from 'react';
import { useTradingContext } from '@/hooks/useTradingContext';
import { toast } from "sonner";
import DashboardLayout from './dashboard/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { useConnectionState } from '@/hooks/useConnectionState';

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
  
  // Use the enhanced connection state hook
  const { 
    isInitializing, 
    isRestarting, 
    wsConnected, 
    isDemoMode, 
    proxyAvailable 
  } = useConnectionState();
  
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
    ? (lastDataRefresh instanceof Date ? lastDataRefresh.toLocaleTimeString() : 'Unknown format')
    : 'Never';

  // Check if we're in demo mode or real mode
  useEffect(() => {
    // Update the demo state based on the connection status and WebSocket state
    if (isDemoMode || connectionStatus.toLowerCase().includes('demo')) {
      setIsDemo(true);
    } else {
      setIsDemo(false);
    }
    
    // Check for CORS issues in the connection status
    if (
      connectionStatus.toLowerCase().includes('cors') || 
      (proxyAvailable === false && !isConnected)
    ) {
      setCorsBlocked(true);
      setIsDemo(true);
    } else {
      setCorsBlocked(false);
    }
  }, [lastTickerData, connectionStatus, isDemoMode, isConnected, proxyAvailable]);
  
  // Debug connection status
  useEffect(() => {
    console.log('Dashboard detected connection status:', isConnected ? 'Connected' : 'Disconnected');
    console.log('API configuration status:', isApiConfigured ? 'Configured' : 'Not configured');
    console.log('Current connection status:', connectionStatus);
    console.log('WebSocket connected:', wsConnected ? 'Yes' : 'No');
    console.log('Demo mode:', isDemoMode ? 'Yes' : 'No');
    console.log('Proxy available:', proxyAvailable === null ? 'Unknown' : proxyAvailable ? 'Yes' : 'No');
    
    if (isApiConfigured && apiKey) {
      console.log('API key is present, first 4 characters:', apiKey.substring(0, 4) + '...');
    }
  }, [
    isConnected, 
    isApiConfigured, 
    connectionStatus, 
    apiKey, 
    wsConnected, 
    isDemoMode, 
    proxyAvailable
  ]);

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
        // After successful reconnection, refresh data
        return refreshData();
      })
      .then(() => {
        toast.success('Data refreshed after reconnection');
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
  if ((isLoading && !isRefreshing && !refreshing && !attemptingReconnect) || isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">
          {isInitializing ? 'Initializing connection...' : 'Loading dashboard data...'}
        </p>
        {error && (
          <p className="text-destructive text-xs mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout
      isConnected={isConnected || wsConnected}
      isDemo={isDemo}
      corsBlocked={corsBlocked}
      connectionStatus={connectionStatus}
      lastConnectionEvent={lastConnectionEvent}
      activePositions={activePositions}
      lastTickerData={lastTickerData}
      totalBalanceUSD={totalBalanceUSD}
      dailyChangePercent={dailyChangePercent}
      refreshing={refreshing || isRefreshing || isRestarting}
      attemptingReconnect={attemptingReconnect}
      onRefresh={handleRefresh}
      onReconnect={handleReconnect}
      lastDataRefresh={formattedLastRefresh}
      error={error}
    />
  );
};

export default Dashboard;
