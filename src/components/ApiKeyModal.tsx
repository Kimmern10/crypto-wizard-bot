
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTradingContext } from '@/hooks/useTradingContext';
import { AlertCircle, KeyRound, EyeOff, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ApiKeyModal: React.FC = () => {
  const { 
    isApiKeyModalOpen, 
    hideApiKeyModal, 
    setApiCredentials, 
    apiKey, 
    apiSecret, 
    clearApiCredentials,
    isLoadingCredentials 
  } = useTradingContext();
  
  const [keyInput, setKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when modal opens or changes
  useEffect(() => {
    if (isApiKeyModalOpen) {
      checkAuthStatus();
      // Use values from context, but don't cause infinite rerenders
      setKeyInput(apiKey || '');
      setSecretInput(apiSecret || '');
      setHasError(false);
    }
  }, [isApiKeyModalOpen]);

  const checkAuthStatus = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    
    if (!keyInput || !secretInput) {
      toast.error('Both API key and secret are required');
      return;
    }

    try {
      setIsSubmitting(true);
      await setApiCredentials(keyInput, secretInput);
      toast.success('API credentials saved successfully');
      hideApiKeyModal();
    } catch (error) {
      console.error('Error saving API credentials:', error);
      setHasError(true);
      toast.error('Failed to save API credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
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
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingCredentials ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-center text-sm text-muted-foreground">Loading API credentials...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
            
            {hasError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                <p className="text-sm text-destructive">
                  Error saving credentials. Please check your input and try again.
                </p>
              </div>
            )}
            
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
            
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md p-3 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                {isLoggedIn ? (
                  <p>Your API credentials will be stored securely in your account and synchronized between devices.</p>
                ) : (
                  <p>Your API credentials are stored locally in your browser's storage. Log in to save them securely and access from multiple devices.</p>
                )}
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
