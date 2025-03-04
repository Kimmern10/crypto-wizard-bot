
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, DollarSign, BadgePercent } from 'lucide-react';
import { useTradingContext } from '@/hooks/useTradingContext';

const RiskManagement: React.FC = () => {
  const { isConnected, currentBalance } = useTradingContext();

  // Calculate total balance value in USD (simplified)
  const totalBalanceUSD = currentBalance.USD + 
    (currentBalance.BTC * 36750) + 
    (currentBalance.ETH * 2470);

  // Safe risk exposure is 10% of portfolio
  const safeRiskAmount = totalBalanceUSD * 0.1;
  
  // Current risk exposure (mock data)
  const currentRiskAmount = totalBalanceUSD * 0.04;
  
  // Risk ratio (current/safe)
  const riskRatio = (currentRiskAmount / safeRiskAmount) * 100;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Risk Management
        </CardTitle>
        <CardDescription>Monitor your trading risk exposure</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Risk Exposure
                </span>
                <span className="text-sm font-medium">
                  ${currentRiskAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="space-y-1.5">
                <Progress 
                  value={riskRatio} 
                  className="h-2"
                  indicatorClassName={riskRatio > 80 ? "bg-red-500" : riskRatio > 50 ? "bg-amber-500" : "bg-green-500"}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Safe</span>
                  <span>Moderate</span>
                  <span>High</span>
                </div>
              </div>
            </div>
            
            <div className="pt-2 grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-md p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <BadgePercent className="h-3.5 w-3.5" />
                  <span>Max Drawdown</span>
                </div>
                <div className="text-lg font-medium">4.2%</div>
              </div>
              
              <div className="bg-secondary/50 rounded-md p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Risk/Reward</span>
                </div>
                <div className="text-lg font-medium">1:2.5</div>
              </div>
            </div>
            
            <div className="pt-1 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Daily Loss Limit</span>
                <span className="font-medium">${(totalBalanceUSD * 0.02).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span>Weekly Loss Limit</span>
                <span className="font-medium">${(totalBalanceUSD * 0.05).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Connect your API to view risk management details
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskManagement;
