
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Position {
  id: string;
  pair: string;
  type: string;
  volume: number;
  cost: number;
  value?: number;
  profit?: number;
  leverage?: string;
  openTime?: number;
}

interface UserPositionsProps {
  positions: Position[];
  isDemo?: boolean;
}

const UserPositions: React.FC<UserPositionsProps> = ({ 
  positions,
  isDemo = false
}) => {
  if (!positions || positions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Open Positions</CardTitle>
          <CardDescription>
            {isDemo ? 'Demo mode - no real positions' : 'You have no open positions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            No active trading positions
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Open Positions</CardTitle>
        <CardDescription>
          {isDemo ? 'Demo data - for illustration only' : `${positions.length} active positions`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positions.map((position) => {
            const isProfit = position.profit ? position.profit > 0 : false;
            
            return (
              <div key={position.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{position.pair}</span>
                    <Badge variant={position.type === 'buy' ? 'default' : 'destructive'}>
                      {position.type.toUpperCase()}
                    </Badge>
                    {position.leverage && (
                      <Badge variant="outline">{position.leverage}</Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    {position.openTime ? new Date(position.openTime * 1000).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Volume:</span>{' '}
                    {position.volume.toFixed(4)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost:</span>{' '}
                    ${position.cost.toFixed(2)}
                  </div>
                  
                  {position.value !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Value:</span>{' '}
                      ${position.value.toFixed(2)}
                    </div>
                  )}
                  
                  {position.profit !== undefined && (
                    <div>
                      <span className="text-muted-foreground">P/L:</span>{' '}
                      <span className={isProfit ? 'text-green-500' : 'text-red-500'}>
                        {isProfit ? '+' : ''}${position.profit.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                <Separator />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPositions;
