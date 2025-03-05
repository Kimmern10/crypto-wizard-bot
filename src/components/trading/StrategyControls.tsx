
import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCw, FlaskConical, ServerCrash } from 'lucide-react';
import { useTradingContext } from '@/hooks/useTradingContext';
import { toast } from 'sonner';

const StrategyControls: React.FC = () => {
  const { 
    isRunning, 
    toggleRunning,
    isConnected,
    refreshData,
    connectionStatus,
    dryRunMode,
    toggleDryRunMode
  } = useTradingContext();

  const isDemoMode = connectionStatus.toLowerCase().includes('demo') || 
                   connectionStatus.toLowerCase().includes('cors');

  const handleRefreshData = () => {
    refreshData();
    toast.success('Data refreshed');
  };

  const handleRunButtonClick = () => {
    if (isDemoMode && !isRunning) {
      toast.info('Starting trading bot in demo mode', {
        description: 'Orders will be simulated and no real trades will be executed',
        duration: 5000
      });
    }
    
    toggleRunning();
  };

  return (
    <div className="flex items-center gap-2">
      {isDemoMode && (
        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
          <ServerCrash className="h-3 w-3" />
          Demo Mode
        </span>
      )}
      
      {dryRunMode && (
        <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
          <FlaskConical className="h-3 w-3" />
          Dry Run
        </span>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDryRunMode}
        className="h-8"
        title="Toggle Dry Run Mode"
      >
        <FlaskConical className="h-4 w-4 mr-1" />
        {dryRunMode ? 'Real Mode' : 'Dry Run'}
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleRefreshData}
        disabled={!isConnected}
        className="h-8 w-8"
        title="Refresh Data"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isRunning ? "destructive" : "default"}
        size="sm"
        onClick={handleRunButtonClick}
        disabled={!isConnected}
        className="flex items-center gap-1"
      >
        {isRunning ? (
          <>
            <Square className="h-4 w-4" /> Stop
          </>
        ) : (
          <>
            <Play className="h-4 w-4" /> Start
          </>
        )}
      </Button>
    </div>
  );
};

export default StrategyControls;
