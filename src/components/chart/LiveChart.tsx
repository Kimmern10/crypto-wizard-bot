
import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useChartData } from '@/hooks/chart/useChartData';
import ChartHeader from './ChartHeader';
import ChartStatus from './ChartStatus';
import PriceChartVisualization from './PriceChartVisualization';

const LiveChart: React.FC = () => {
  const {
    chartState,
    selectedPair,
    setSelectedPair,
    availablePairs,
    activeTimeRange,
    setActiveTimeRange,
    subscriptionStatus,
    refreshingChart,
    handleRefresh,
    connectionStatus,
    timeRanges
  } = useChartData();
  
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <ChartHeader 
          chartState={chartState}
          selectedPair={selectedPair}
          availablePairs={availablePairs}
          onPairChange={setSelectedPair}
          onRefresh={handleRefresh}
          refreshing={refreshingChart}
        />
      </CardHeader>
      <CardContent className="p-0">
        <ChartStatus 
          subscriptionStatus={subscriptionStatus}
          isConnected={connectionStatus.isConnected}
          isDemoMode={connectionStatus.isDemoMode}
        />
        
        <PriceChartVisualization
          data={chartState.data}
          timeRanges={timeRanges}
          activeTimeRange={activeTimeRange}
          onTimeRangeChange={setActiveTimeRange}
        />
      </CardContent>
    </Card>
  );
};

export default LiveChart;
