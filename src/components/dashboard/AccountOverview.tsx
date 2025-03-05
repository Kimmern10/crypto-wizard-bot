
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AccountOverviewProps {
  totalBalanceUSD: number;
  dailyChangePercent: number;
}

const AccountOverview: React.FC<AccountOverviewProps> = ({
  totalBalanceUSD,
  dailyChangePercent
}) => {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(totalBalanceUSD);

  const isPositive = dailyChangePercent >= 0;
  
  return (
    <Card className="glass-card animation-delay-500 animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Account Balance
        </CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formattedBalance}
        </div>
        
        <div className="flex items-center pt-1">
          {isPositive ? (
            <TrendingUp className={cn("h-4 w-4 mr-1 text-green-600")} />
          ) : (
            <TrendingDown className={cn("h-4 w-4 mr-1 text-red-600")} />
          )}
          <span className={cn(
            "text-xs",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? "+" : ""}{dailyChangePercent.toFixed(2)}% Today
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountOverview;
