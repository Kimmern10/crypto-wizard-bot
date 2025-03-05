
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sliders } from 'lucide-react';
import StrategySelector from './trading/StrategySelector';
import StrategyParameters from './trading/StrategyParameters';
import StrategyControls from './trading/StrategyControls';

const StrategyPanel: React.FC = () => {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Trading Strategy
            </CardTitle>
            <CardDescription>Configure and activate your trading strategy</CardDescription>
          </div>
          
          <StrategyControls />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <StrategySelector />
        <div className="space-y-6 pt-2">
          <StrategyParameters />
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyPanel;
