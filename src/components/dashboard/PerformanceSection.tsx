
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import PerformanceChart from '@/components/PerformanceChart';

interface PerformanceSectionProps {
  isDemo: boolean;
}

const PerformanceSection: React.FC<PerformanceSectionProps> = ({ isDemo }) => {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Performance Overview</CardTitle>
        <CardDescription className="text-xs">
          {isDemo ? 'Simulated data' : 'Live data'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <PerformanceChart />
      </CardContent>
    </Card>
  );
};

export default PerformanceSection;
