import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkWebSocketStatus, checkKrakenProxyStatus, restartWebSocket } from '@/utils/websocketManager';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Server,
  ExternalLink,
  KeyRound,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useTradingContext } from '@/hooks/useTradingContext';

const ApiDiagnostic: React.FC = () => {
  const { apiKey, showApiKeyModal, isConnected } = useTradingContext();
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    wsConnected: boolean;
    isDemoMode: boolean;
    proxyAvailable: boolean;
    apiKeyConfigured: boolean;
    edgeFunctionDeployed: boolean;
    lastChecked: number;
  }>({
    wsConnected: false,
    isDemoMode: false,
    proxyAvailable: false,
    apiKeyConfigured: false,
    edgeFunctionDeployed: false,
    lastChecked: 0
  });

  const runDiagnostics = async () => {
    setIsRunningCheck(true);
    try {
      console.log('Running API diagnostics...');
      const startTime = Date.now();
      
      const wsStatus = checkWebSocketStatus();
      console.log('WebSocket status:', wsStatus);
      
      // Check proxy status
      const proxyCheckStart = Date.now();
      const proxyAvailable = await checkKrakenProxyStatus();
      console.log(`Proxy check completed in ${Date.now() - proxyCheckStart}ms`);
      
      // Check if edge function exists by making a call to it
      let edgeFunctionDeployed = false;
      try {
        const functionCheckStart = Date.now();
        const { data, error } = await supabase.functions.invoke('kraken-proxy', {
          body: { path: 'health', method: 'GET', isPrivate: false, health: 'check' }
        });
        
        console.log(`Edge function health check completed in ${Date.now() - functionCheckStart}ms`);
        edgeFunctionDeployed = !error && !!data;
        
        if (error) {
          console.error('Edge function health check failed:', error);
        } else {
          console.log('Edge function health check response:', data);
        }
      } catch (e) {
        console.error('Error checking edge function:', e);
        edgeFunctionDeployed = false;
      }
      
      setDiagnosticResults({
        wsConnected: wsStatus.isConnected,
        isDemoMode: wsStatus.isDemoMode,
        proxyAvailable,
        apiKeyConfigured: !!apiKey,
        edgeFunctionDeployed,
        lastChecked: Date.now()
      });
      
      console.log(`Diagnostics completed in ${Date.now() - startTime}ms`);
      toast.success('Diagnostic check complete');
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Failed to complete diagnostics');
    } finally {
      setIsRunningCheck(false);
    }
  };

  // Run diagnostics on first load
  useEffect(() => {
    runDiagnostics();
  }, []);

  // Add a way to attempt a connection if not connected
  const attemptConnection = async () => {
    try {
      setIsReconnecting(true);
      toast.info('Attempting to restart connection...');
      console.log('Manually restarting WebSocket connection...');
      
      await restartWebSocket();
      
      // Re-run diagnostics to update status after a short delay
      setTimeout(() => runDiagnostics(), 1500);
    } catch (error) {
      console.error('Failed to restart connection:', error);
      toast.error('Connection restart failed');
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>API Diagnostics</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={runDiagnostics}
            disabled={isRunningCheck}
          >
            <RefreshCw className={`h-4 w-4 ${isRunningCheck ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {/* WebSocket Connection */}
          <div className="flex items-center justify-between py-1 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">WebSocket Connection</span>
            </div>
            {diagnosticResults.wsConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs py-0" 
                  onClick={attemptConnection}
                  disabled={isReconnecting}
                >
                  <ArrowRightLeft className={`h-3 w-3 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
                  {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
                </Button>
              </div>
            )}
          </div>
          
          {/* Demo Mode Status */}
          <div className="flex items-center justify-between py-1 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Demo Mode Active</span>
              {diagnosticResults.isDemoMode && (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            {diagnosticResults.isDemoMode ? (
              <Server className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
          
          {/* Edge Function Status */}
          <div className="flex items-center justify-between py-1 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Edge Function Deployed</span>
            </div>
            {diagnosticResults.edgeFunctionDeployed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          
          {/* API Proxy Status */}
          <div className="flex items-center justify-between py-1 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">API Proxy Available</span>
            </div>
            {diagnosticResults.proxyAvailable ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          
          {/* API Key Status */}
          <div className="flex items-center justify-between py-1 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">API Key Configured</span>
            </div>
            {diagnosticResults.apiKeyConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs py-0" 
                onClick={showApiKeyModal}
              >
                <KeyRound className="h-3 w-3 mr-1" />
                Configure Key
              </Button>
            )}
          </div>
          
          {/* Last Checked Timestamp */}
          {diagnosticResults.lastChecked > 0 && (
            <div className="text-xs text-muted-foreground text-right pt-1">
              Last checked: {new Date(diagnosticResults.lastChecked).toLocaleTimeString()}
            </div>
          )}
        </div>
        
        {/* Recommendations based on diagnostic results */}
        {(diagnosticResults.isDemoMode || !diagnosticResults.proxyAvailable || !diagnosticResults.edgeFunctionDeployed) && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Recommendations</h4>
            <ul className="space-y-2 text-xs text-amber-700 dark:text-amber-400">
              {!diagnosticResults.edgeFunctionDeployed && (
                <li className="flex gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    The Kraken proxy Edge Function needs to be deployed. Check your Supabase account.
                  </span>
                </li>
              )}
              {!diagnosticResults.apiKeyConfigured && (
                <li className="flex gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Configure your Kraken API key and secret to enable live trading.
                  </span>
                </li>
              )}
              {diagnosticResults.isDemoMode && (
                <li className="flex gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Application is in Demo Mode with simulated data. Fix the issues above and restart connection.
                  </span>
                </li>
              )}
            </ul>
            <div className="mt-3">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200"
              >
                Go to Supabase dashboard
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiDiagnostic;
