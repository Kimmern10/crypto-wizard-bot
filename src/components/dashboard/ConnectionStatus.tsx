
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wifi, WifiOff, Server } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <div className="flex gap-2 mt-3">
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
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;
