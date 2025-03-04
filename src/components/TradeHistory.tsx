
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTradingContext } from '@/hooks/useTradingContext';
import { History, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";

const TradeHistory: React.FC = () => {
  const { tradeHistory, isConnected } = useTradingContext();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Trade History
            </CardTitle>
            <CardDescription>Recent trading activity</CardDescription>
          </div>
          
          {isConnected && (
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {isConnected ? (
          tradeHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeHistory.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>
                        <div className={cn(
                          "flex items-center gap-1.5",
                          trade.type === 'buy' ? "text-green-600" : "text-red-600"
                        )}>
                          {trade.type === 'buy' 
                            ? <TrendingUp className="h-3.5 w-3.5" /> 
                            : <TrendingDown className="h-3.5 w-3.5" />
                          }
                          <span className="capitalize">{trade.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{trade.pair}</TableCell>
                      <TableCell>${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{trade.volume}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(trade.time)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trade history available</p>
              <p className="text-xs mt-2">Trades will appear here after you make transactions</p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Connect your API to view trade history</p>
            <p className="text-xs mt-2">Your trading history will be fetched from Kraken API</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeHistory;
