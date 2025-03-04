
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DollarSign, BarChart, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useTradingContext } from '@/hooks/useTradingContext';
import { cn } from '@/lib/utils';
import PerformanceChart from './PerformanceChart';

const Dashboard: React.FC = () => {
  const { currentBalance, activePositions, isConnected } = useTradingContext();

  // Calculate total balance value in USD (simplified)
  const totalBalanceUSD = currentBalance.USD + 
    (currentBalance.BTC * 36750) + 
    (currentBalance.ETH * 2470);

  // Get a random value between -3 and 5 for daily change
  const dailyChangePercent = Math.round((Math.random() * 8 - 3) * 10) / 10;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card animation-delay-100 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Portfolio Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBalanceUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center mt-1">
              <span className={cn(
                "text-xs font-medium flex items-center",
                dailyChangePercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {dailyChangePercent >= 0 
                  ? <TrendingUp className="h-3 w-3 mr-1" /> 
                  : <TrendingDown className="h-3 w-3 mr-1" />
                }
                {dailyChangePercent >= 0 ? "+" : ""}{dailyChangePercent}% today
              </span>
            </div>
          </CardContent>
        </Card>

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

        <Card className="glass-card animation-delay-300 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Performance
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div>
                <div className="text-2xl font-bold text-green-600">+5.2%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days
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
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PerformanceChart />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
