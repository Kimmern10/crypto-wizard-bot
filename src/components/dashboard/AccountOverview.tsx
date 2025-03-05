
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, DollarSign } from 'lucide-react';

interface AccountOverviewProps {
  totalBalanceUSD: number;
  dailyChangePercent: number;
}

const AccountOverview: React.FC<AccountOverviewProps> = ({ 
  totalBalanceUSD,
  dailyChangePercent
}) => {
  const isPositiveChange = dailyChangePercent >= 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Account Overview</CardTitle>
        <CardDescription>Your current portfolio value</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-muted-foreground" />
            <span className="text-2xl font-semibold">
              ${totalBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex items-center">
            {isPositiveChange ? (
              <ArrowUp className={`w-4 h-4 mr-1 text-green-500`} />
            ) : (
              <ArrowDown className={`w-4 h-4 mr-1 text-red-500`} />
            )}
            <span className={`text-sm font-medium ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
              {isPositiveChange ? '+' : ''}{dailyChangePercent.toFixed(2)}% today
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountOverview;
