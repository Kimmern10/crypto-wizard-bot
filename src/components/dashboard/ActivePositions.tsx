
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, AlertTriangle } from 'lucide-react';

interface ActivePositionsProps {
  isConnected: boolean;
  activePositions: any[];
}

const ActivePositions: React.FC<ActivePositionsProps> = ({
  isConnected,
  activePositions
}) => {
  return (
    <Card className="glass-card animation-delay-200 animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Active Positions
        </CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div>
            <div className="text-2xl font-bold">{activePositions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activePositions.length === 0 
                ? "No active positions" 
                : `${activePositions.length} position${activePositions.length > 1 ? 's' : ''} open`}
            </p>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Not connected</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivePositions;
