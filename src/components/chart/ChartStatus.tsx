
import React from 'react';
import { cn } from '@/lib/utils';
import { WifiOff, Wifi, RefreshCw, ServerCrash } from 'lucide-react';

interface ChartStatusProps {
  subscriptionStatus: string;
  isConnected: boolean;
  isDemoMode: boolean;
}

const ChartStatus: React.FC<ChartStatusProps> = ({
  subscriptionStatus,
  isConnected,
  isDemoMode
}) => {
  // Function to get status indication color based on connection state
  const getStatusColor = () => {
    if (!isConnected && !isDemoMode) return "bg-red-100 text-red-800";
    if (isDemoMode) return "bg-amber-100 text-amber-800";
    if (subscriptionStatus === 'active') return "bg-green-100 text-green-800";
    if (subscriptionStatus === 'error') return "bg-red-100 text-red-800";
    if (subscriptionStatus === 'subscribing' || subscriptionStatus === 'resubscribing') 
      return "bg-blue-100 text-blue-800";
    
    return "bg-gray-100 text-gray-800";
  };
  
  // Function to get appropriate status icon
  const StatusIcon = () => {
    if (!isConnected && !isDemoMode) return <WifiOff className="h-3 w-3 mr-1" />;
    if (isDemoMode) return <ServerCrash className="h-3 w-3 mr-1" />;
    if (subscriptionStatus === 'active') return <Wifi className="h-3 w-3 mr-1" />;
    if (subscriptionStatus === 'subscribing' || subscriptionStatus === 'resubscribing') 
      return <RefreshCw className="h-3 w-3 mr-1 animate-spin" />;
    
    return <WifiOff className="h-3 w-3 mr-1" />;
  };
  
  // Function to get user-friendly status text
  const getStatusText = () => {
    if (!isConnected && !isDemoMode) return "Not connected";
    if (isDemoMode) return "Demo Mode";
    if (subscriptionStatus === 'active') return "Connected";
    if (subscriptionStatus === 'error') return "Connection error";
    if (subscriptionStatus === 'subscribing') return "Connecting...";
    if (subscriptionStatus === 'resubscribing') return "Updating connection...";
    
    return subscriptionStatus || "Unknown status";
  };

  return (
    <div className={cn(
      "text-xs text-center py-1 flex items-center justify-center",
      getStatusColor()
    )}>
      <StatusIcon />
      <span>{getStatusText()}</span>
    </div>
  );
};

export default ChartStatus;
