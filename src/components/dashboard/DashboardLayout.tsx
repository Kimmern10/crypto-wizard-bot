
import React from 'react';
import LiveChart from '@/components/LiveChart';
import PortfolioValue from './PortfolioValue';
import ActivePositions from './ActivePositions';
import ConnectionStatus from './ConnectionStatus';
import CorsWarning from './CorsWarning';
import PerformanceSection from './PerformanceSection';
import ApiDiagnostic from '@/components/ApiDiagnostic';

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
    onReconnect
  } = props;

  return (
    <div className="space-y-6 animate-fade-in">
      {corsBlocked && <CorsWarning corsBlocked={corsBlocked} />}
      
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
        />
      </div>

      {/* LiveChart component */}
      <LiveChart />

      <PerformanceSection isDemo={isDemo} />
    </div>
  );
};

export default DashboardLayout;
