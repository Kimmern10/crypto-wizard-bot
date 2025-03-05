
import { simulateDemoTickerData } from './demoDataGenerator';
import { toast } from 'sonner';
import { WebSocketCore } from './websocketCore';

/**
 * Activates demo mode with reason and notifies the user
 */
export const activateDemoMode = (
  reason: string,
  wsManager: WebSocketCore,
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
): () => void => {
  // Set websocket to demo mode
  wsManager.setForceDemoMode(true);
  
  // Start demo data generation
  const cleanupDemoData = simulateDemoTickerData(setLastTickerData);
  
  // Notify the UI about the fallback
  setConnectionStatus(`Demo Mode (${reason})`);
  setLastConnectionEvent(`Switched to demo mode at ${new Date().toLocaleTimeString()}`);
  
  // Show a toast notification
  let toastMessage = 'Using demo mode with simulated data';
  if (reason) {
    toastMessage = `Using demo mode due to ${reason}`;
  }
  
  toast.warning(toastMessage, {
    duration: 5000,
  });
  
  // Return cleanup function
  return () => {
    if (cleanupDemoData) {
      console.log('Cleaning up demo data generator');
      cleanupDemoData();
    }
  };
};

/**
 * Handles failure scenarios by activating demo mode
 */
export const handleConnectionFailure = (
  error: Error,
  reason: string,
  reconnectCount: number,
  demoModeActive: boolean,
  wsManager: WebSocketCore,
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
): (() => void) | null => {
  console.error(`WebSocket connection issue: ${error.message}`);
  
  // Activate demo mode after multiple failures or on specific errors
  if ((reconnectCount >= 3 && !demoModeActive) || 
      error.message.includes('CORS') || 
      error.message.includes('NetworkError')) {
    
    console.log(`Activating demo mode due to: ${reason}`);
    return activateDemoMode(
      reason, 
      wsManager, 
      setConnectionStatus, 
      setLastConnectionEvent, 
      setLastTickerData
    );
  }
  
  return null;
};
