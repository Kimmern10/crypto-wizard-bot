import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTradingContext } from '@/hooks/useTradingContext';
import { AlertCircle, KeyRound, EyeOff, Eye, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

const ApiKeyModal: React.FC = () => {
  const { 
    isApiKeyModalOpen, 
    hideApiKeyModal, 
    setApiCredentials, 
    apiKey, 
    apiSecret, 
    clearApiCredentials,
    isLoadingCredentials,
    isAuthenticated,
    error: apiError
  } = useTradingContext();
  
  const [keyInput, setKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isApiKeyModalOpen) {
      setKeyInput(apiKey || '');
      setSecretInput(apiSecret || '');
      setLocalError(null);
    }
    
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [isApiKeyModalOpen, apiKey, apiSecret]);

  useEffect(() => {
    if (apiError && isApiKeyModalOpen) {
      setLocalError(apiError);
    }
  }, [apiError, isApiKeyModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!keyInput || !secretInput) {
      setLocalError('Both API key and secret are required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const timeout = setTimeout(() => {
        toast.warning('Connection is taking longer than expected', {
          description: 'Please be patient, or try again later.'
        });
      }, 5000);
      
      setConnectionTimeout(timeout);
      
      await setApiCredentials(keyInput, secretInput);
      
      clearTimeout(timeout);
      
      toast.success('API credentials saved successfully', {
        description: 'Please refresh your data to connect with live data'
      });
      
      setTimeout(() => hideApiKeyModal(), 1500);
    } catch (error) {
      console.error('Error saving API credentials:', error);
      setLocalError(error instanceof Error ? error.message : 'Failed to save API credentials');
      toast.error('Failed to save API credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    }
  };

  const toggleShowSecret = () => {
    setShowSecret(!showSecret);
  };
  
  const handleClear = async () => {
    try {
      setIsSubmitting(true);
      await clearApiCredentials();
      setKeyInput('');
      setSecretInput('');
      toast.success('API credentials cleared successfully');
    } catch (error) {
      console.error('Error clearing API credentials:', error);
      setLocalError(error instanceof Error ? error.message : 'Failed to clear API credentials');
      toast.error('Failed to clear API credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isApiKeyModalOpen} onOpenChange={(open) => !open && hideApiKeyModal()}>
      <DialogContent className="sm:max-w-md animate-slide-up glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <span>Kraken API Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Enter your Kraken API key and secret to connect to your account.
            {isAuthenticated ? 
              " Your credentials will be securely stored in your account." :
              " Please sign in to save your credentials securely."}
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingCredentials ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-center text-sm text-muted-foreground">Loading API credentials...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {localError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                placeholder="Your Kraken API Key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="font-mono text-sm"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-secret">API Secret</Label>
              <div className="relative">
                <Input
                  id="api-secret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Your Kraken API Secret"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  className="font-mono text-sm pr-10"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={toggleShowSecret}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isSubmitting}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="pt-2 flex flex-col space-y-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save & Connect'}
              </Button>
              
              {(apiKey && apiSecret) && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClear}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : 'Clear Credentials'}
                </Button>
              )}
            </div>
            
            <Alert variant={isAuthenticated ? "default" : "warning"} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                {isAuthenticated ? (
                  <div>
                    <p>Your API credentials will be stored securely in your account and synchronized between devices.</p>
                    <p className="mt-2 font-medium">Key permissions needed:</p>
                    <ul className="list-disc ml-4 mt-1">
                      <li>Query Funds</li>
                      <li>Query Open Orders & Trades</li>
                      <li>Query Closed Orders & Trades</li>
                    </ul>
                  </div>
                ) : (
                  <p>You are not logged in. API credentials will only be stored locally in your browser. <a href="/auth" className="underline">Sign in</a> to save them securely.</p>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="text-center mt-3">
              <a 
                href="https://support.kraken.com/hc/en-us/articles/360000919966-How-to-generate-an-API-key-pair-"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Don't have API keys? Learn how to generate them →
              </a>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
