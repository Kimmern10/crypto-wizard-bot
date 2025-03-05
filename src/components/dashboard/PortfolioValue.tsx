
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from "@/lib/utils";

interface PortfolioValueProps {
  totalBalanceUSD: number;
  dailyChangePercent: number;
}

const PortfolioValue: React.FC<PortfolioValueProps> = ({
  totalBalanceUSD,
  dailyChangePercent
}) => {
  return (
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
            {dailyChangePercent >= 0 ? "+" : ""}{dailyChangePercent.toFixed(2)}% today
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioValue;
