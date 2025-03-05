
import React from 'react';
import AccountOverview from './AccountOverview';
import ConnectionStatus from './ConnectionStatus';
import ApiDiagnostic from '../ApiDiagnostic';
import CurrencyPriceChart from './CurrencyPriceChart';
import UserPositions from './UserPositions';
import NewsAndEvents from './NewsAndEvents';
import { Button } from "@/components/ui/button";
import { LogIn, Key } from 'lucide-react';

interface DashboardLayoutProps {
  isConnected: boolean;
  isDemo: boolean;
  isAuthenticated?: boolean;
  corsBlocked: boolean;
  connectionStatus: string;
  lastConnectionEvent: string;
  activePositions: any[];
  lastTickerData: Record<string, any>;
  totalBalanceUSD: number;
  dailyChangePercent: number;
  refreshing: boolean;
  attemptingReconnect: boolean;
  onRefresh: () => void;
  onReconnect: () => void;
  onLogin?: () => void;
  onConfigureApi?: () => void; 
  lastDataRefresh: string;
  error: string | null;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  isConnected,
  isDemo,
  isAuthenticated = false,
  corsBlocked,
  connectionStatus,
  lastConnectionEvent,
  activePositions,
  lastTickerData,
  totalBalanceUSD,
  dailyChangePercent,
  refreshing,
  attemptingReconnect,
  onRefresh,
  onReconnect,
  onLogin,
  onConfigureApi,
  lastDataRefresh,
  error
}) => {
  return (
    <div className="container mx-auto p-4">
      {!isAuthenticated && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-md p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-grow">
              <h3 className="text-amber-800 dark:text-amber-300 font-medium">
                Using Demo Mode with Simulated Data
              </h3>
              <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                You're currently viewing simulated market data. Sign in to access real-time data and trading capabilities.
              </p>
            </div>
            <div className="flex space-x-2">
              {onLogin && (
                <Button 
                  onClick={onLogin}
                  variant="default"
                  size="sm"
                  className="flex items-center"
                >
                  <LogIn className="mr-1 h-4 w-4" />
                  Sign In
                </Button>
              )}
              {onConfigureApi && (
                <Button 
                  onClick={onConfigureApi}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Key className="mr-1 h-4 w-4" />
                  API Key
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-md p-4 mb-6">
          <h3 className="text-red-800 dark:text-red-300 font-medium">Error</h3>
          <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ConnectionStatus
          isConnected={isConnected}
          isDemo={isDemo}
          connectionStatus={connectionStatus}
          lastConnectionEvent={lastConnectionEvent}
          lastTickerData={lastTickerData}
          refreshing={refreshing}
          attemptingReconnect={attemptingReconnect}
          onRefresh={onRefresh}
          onReconnect={onReconnect}
          lastDataRefresh={lastDataRefresh}
        />
        
        <AccountOverview 
          totalBalanceUSD={totalBalanceUSD} 
          dailyChangePercent={dailyChangePercent} 
        />
        
        <ApiDiagnostic />
      </div>
      
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CurrencyPriceChart 
            tickerData={lastTickerData}
            demoMode={isDemo}
          />
        </div>
        
        <div>
          <UserPositions 
            positions={activePositions}
            isDemo={isDemo}
          />
        </div>
      </div>
      
      <div className="mt-6">
        <NewsAndEvents />
      </div>
    </div>
  );
};

export default DashboardLayout;
