
import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { checkWebSocketConnection, checkProxyFunction } from '@/utils/websocket/connection/connectionTester';
import { getAuthenticationStatus } from '@/utils/kraken/krakenApiUtils';
import { useToast } from '@/hooks/use-toast';

const ApiDiagnostic = () => {
  const { toast } = useToast();
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  
  const runDiagnostic = useCallback(async () => {
    setIsRunningDiagnostic(true);
    setDiagnosticResults(null);
    
    try {
      // Check authentication
      const authStatus = await getAuthenticationStatus();
      
      // Check WebSocket connectivity
      const wsConnectivity = await checkWebSocketConnection();
      
      // Check Edge Function
      const edgeFunctionStatus = await checkProxyFunction();
      
      // Check for session
      const { data: sessionData } = await supabase.auth.getSession();
      const hasActiveSession = !!sessionData.session;
      
      // Check for API credentials
      let hasApiCredentials = false;
      let apiCredentialsError = null;
      
      if (hasActiveSession) {
        try {
          const { data, error } = await supabase
            .from('api_credentials')
            .select('id, api_key')
            .eq('exchange', 'kraken')
            .maybeSingle();
            
          if (error) {
            apiCredentialsError = error.message;
          } else {
            hasApiCredentials = !!data;
          }
        } catch (err) {
          apiCredentialsError = err instanceof Error ? err.message : 'Unknown error checking API credentials';
        }
      }
      
      // Perform a test API call
      let apiCallSuccess = false;
      let apiCallError = null;
      
      try {
        const { data, error } = await supabase.functions.invoke('kraken-proxy', {
          body: { 
            path: 'public/Time', 
            method: 'GET', 
            isPrivate: false 
          }
        });
        
        if (error) {
          apiCallError = error.message;
        } else {
          apiCallSuccess = data && data.result && !!data.result.unixtime;
        }
      } catch (err) {
        apiCallError = err instanceof Error ? err.message : 'Unknown error making test API call';
      }
      
      // Set results
      setDiagnosticResults({
        authStatus: {
          isAuthenticated: authStatus.isAuthenticated,
          hasApiKeys: authStatus.hasApiKeys
        },
        connection: {
          wsConnectivity,
          edgeFunctionStatus,
          hasActiveSession,
          hasApiCredentials,
          apiCredentialsError,
          apiCallSuccess,
          apiCallError
        },
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Diagnostic Complete",
        description: "Check the results to see the status of your API connections.",
      });
    } catch (error) {
      console.error('Error running diagnostic:', error);
      toast({
        title: "Diagnostic Failed",
        description: "An error occurred while running diagnostics.",
        variant: "destructive"
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  }, [toast]);
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">API Diagnostic Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={runDiagnostic} 
          disabled={isRunningDiagnostic}
          className="w-full mb-4"
        >
          {isRunningDiagnostic ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            <>Run System Diagnostic</>
          )}
        </Button>
        
        {diagnosticResults && (
          <div className="space-y-4">
            <Alert variant={diagnosticResults.authStatus.isAuthenticated ? "default" : "destructive"}>
              <AlertTitle className="flex items-center">
                {diagnosticResults.authStatus.isAuthenticated ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                )}
                Authentication Status
              </AlertTitle>
              <AlertDescription>
                <p>User Authentication: {diagnosticResults.authStatus.isAuthenticated ? 'Authenticated ✓' : 'Not Authenticated ✗'}</p>
                <p>API Keys Available: {diagnosticResults.authStatus.hasApiKeys ? 'Available ✓' : 'Not Available ✗'}</p>
              </AlertDescription>
            </Alert>
            
            <Alert variant={diagnosticResults.connection.wsConnectivity ? "default" : "warning"}>
              <AlertTitle className="flex items-center">
                {diagnosticResults.connection.wsConnectivity ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                )}
                WebSocket Connection
              </AlertTitle>
              <AlertDescription>
                <p>Direct WebSocket Connection: {diagnosticResults.connection.wsConnectivity ? 'Available ✓' : 'Unavailable ✗'}</p>
              </AlertDescription>
            </Alert>
            
            <Alert variant={diagnosticResults.connection.edgeFunctionStatus ? "default" : "destructive"}>
              <AlertTitle className="flex items-center">
                {diagnosticResults.connection.edgeFunctionStatus ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                )}
                Edge Function Status
              </AlertTitle>
              <AlertDescription>
                <p>API Proxy Edge Function: {diagnosticResults.connection.edgeFunctionStatus ? 'Available ✓' : 'Unavailable ✗'}</p>
                <p>Active Session: {diagnosticResults.connection.hasActiveSession ? 'Yes ✓' : 'No ✗'}</p>
                <p>API Credentials: {diagnosticResults.connection.hasApiCredentials ? 'Found ✓' : 'Not Found ✗'}</p>
                {diagnosticResults.connection.apiCredentialsError && (
                  <p className="text-red-500 text-sm mt-1">Error: {diagnosticResults.connection.apiCredentialsError}</p>
                )}
              </AlertDescription>
            </Alert>
            
            <Alert variant={diagnosticResults.connection.apiCallSuccess ? "default" : "destructive"}>
              <AlertTitle className="flex items-center">
                {diagnosticResults.connection.apiCallSuccess ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                )}
                API Test Call
              </AlertTitle>
              <AlertDescription>
                <p>Test API Call: {diagnosticResults.connection.apiCallSuccess ? 'Successful ✓' : 'Failed ✗'}</p>
                {diagnosticResults.connection.apiCallError && (
                  <p className="text-red-500 text-sm mt-1">Error: {diagnosticResults.connection.apiCallError}</p>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {diagnosticResults ? (
          <p>Last diagnostic run: {new Date(diagnosticResults.timestamp).toLocaleString()}</p>
        ) : (
          <p>Run the diagnostic to check your API connection status</p>
        )}
      </CardFooter>
    </Card>
  );
};

export default ApiDiagnostic;
