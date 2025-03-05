
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Position {
  id: string;
  pair: string;
  type: string;
  volume: number;
  cost: number;
  value: number;
  profit: number;
  leverage: string;
  openTime: number;
}

interface UserPositionsProps {
  positions: Position[];
  isDemo: boolean;
}

const UserPositions: React.FC<UserPositionsProps> = ({
  positions,
  isDemo
}) => {
  return (
    <Card className="glass-card animation-delay-700 animate-slide-up h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Active Positions</CardTitle>
      </CardHeader>
      
      <CardContent>
        {isDemo && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md p-2 mb-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Using simulated position data in demo mode. Connect your API for real positions.
            </p>
          </div>
        )}
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No active positions</p>
            <p className="text-xs mt-1">Open positions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position) => (
              <div 
                key={position.id} 
                className="border border-border rounded-md p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">{position.pair}</span>
                      <Badge 
                        variant={position.type === 'buy' ? 'default' : 'destructive'}
                        className="ml-2 text-xs"
                      >
                        {position.type.toUpperCase()}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="ml-2 text-xs"
                      >
                        {position.leverage}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      Volume: {position.volume.toFixed(4)} • Cost: ${position.cost.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center">
                      {position.profit >= 0 ? (
                        <TrendingUp className={cn("h-3 w-3 mr-1 text-green-600")} />
                      ) : (
                        <TrendingDown className={cn("h-3 w-3 mr-1 text-red-600")} />
                      )}
                      <span className={cn(
                        "font-medium",
                        position.profit >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {position.profit >= 0 ? "+" : ""}{position.profit.toFixed(2)} USD
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      Value: ${position.value.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserPositions;
