
import React from 'react';
import LiveChart from '@/components/LiveChart';
import PortfolioValue from './PortfolioValue';
import ActivePositions from './ActivePositions';
import ConnectionStatus from './ConnectionStatus';
import CorsWarning from './CorsWarning';
import PerformanceSection from './PerformanceSection';
import ApiDiagnostic from '@/components/ApiDiagnostic';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

interface DashboardLayoutProps {
  isConnected: boolean;
  isDemo: boolean;
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
  lastDataRefresh: string;
  error: string | null;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = (props) => {
  const {
    isConnected,
    isDemo,
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
    lastDataRefresh,
    error
  } = props;

  return (
    <div className="space-y-6 animate-fade-in">
      {corsBlocked && <CorsWarning corsBlocked={corsBlocked} />}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isDemo && (
        <ApiDiagnostic />
      )}
    
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PortfolioValue 
          totalBalanceUSD={totalBalanceUSD} 
          dailyChangePercent={dailyChangePercent} 
        />

        <ActivePositions 
          isConnected={isConnected} 
          activePositions={activePositions} 
          isLoading={refreshing}
        />

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
      </div>

      {/* LiveChart component */}
      <LiveChart />

      <PerformanceSection isDemo={isDemo} />
    </div>
  );
};

export default DashboardLayout;
