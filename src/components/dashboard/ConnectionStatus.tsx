
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wifi, WifiOff, Server, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkKrakenProxyStatus } from '@/utils/websocketManager';
import { useToast } from '@/hooks/use-toast';

interface ConnectionStatusProps {
  isConnected: boolean;
  isDemo: boolean;
  connectionStatus: string;
  lastConnectionEvent: string;
  lastTickerData: Record<string, any>;
  refreshing: boolean;
  attemptingReconnect: boolean;
  onRefresh: () => void;
  onReconnect: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isDemo,
  connectionStatus,
  lastConnectionEvent,
  lastTickerData,
  refreshing,
  attemptingReconnect,
  onRefresh,
  onReconnect
}) => {
  const { toast } = useToast();
  const [isCheckingProxy, setIsCheckingProxy] = React.useState(false);
  
  const handleCheckProxy = async () => {
    setIsCheckingProxy(true);
    try {
      const available = await checkKrakenProxyStatus();
      if (available) {
        toast({
          title: "Kraken API proxy is available",
          description: "Connection to Kraken API should work properly.",
          variant: "default" // Changed from 'success' to 'default'
        });
      } else {
        toast({
          title: "Kraken API proxy is unavailable",
          description: "Check Supabase Edge Functions and deployment status.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error checking proxy:", error);
      toast({
        title: "Error checking proxy",
        description: "Failed to check Kraken API proxy status.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingProxy(false);
    }
  };
  
  return (
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
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex gap-2">
            <Button 
              onClick={onRefresh}
              className="w-full text-xs py-1 h-auto"
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh data'}
            </Button>
            <Button 
              onClick={onReconnect}
              className="w-full text-xs py-1 h-auto"
              variant="outline"
              size="sm"
              disabled={attemptingReconnect}
            >
              {attemptingReconnect ? 'Reconnecting...' : 'Restart connection'}
            </Button>
          </div>
          <Button
            onClick={handleCheckProxy}
            className="w-full text-xs py-1 h-auto mt-1"
            variant="secondary"
            size="sm"
            disabled={isCheckingProxy}
          >
            {isCheckingProxy ? 'Checking API Proxy...' : 'Check API Connection'}
          </Button>
          {isDemo && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md text-xs text-amber-800 dark:text-amber-400">
              <div className="flex items-start gap-1">
                <Server className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Currently in Demo Mode with simulated data. Your API credentials may not be connected.
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;
