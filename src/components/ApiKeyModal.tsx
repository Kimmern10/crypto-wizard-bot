
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTradingContext } from '@/hooks/useTradingContext';
import { AlertCircle, KeyRound, EyeOff, Eye } from 'lucide-react';

const ApiKeyModal: React.FC = () => {
  const { isApiKeyModalOpen, hideApiKeyModal, setApiCredentials, apiKey, apiSecret, clearApiCredentials } = useTradingContext();
  const [keyInput, setKeyInput] = useState(apiKey);
  const [secretInput, setSecretInput] = useState(apiSecret);
  const [showSecret, setShowSecret] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput && secretInput) {
      setApiCredentials(keyInput, secretInput);
      hideApiKeyModal();
    }
  };

  const toggleShowSecret = () => {
    setShowSecret(!showSecret);
  };

  return (
    <Dialog open={isApiKeyModalOpen} onOpenChange={hideApiKeyModal}>
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
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              placeholder="Your Kraken API Key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="font-mono text-sm"
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
              />
              <button
                type="button"
                onClick={toggleShowSecret}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div className="pt-2 flex flex-col space-y-2">
            <Button type="submit" className="w-full">
              Save & Connect
            </Button>
            
            {(apiKey && apiSecret) && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={clearApiCredentials}
                className="w-full"
              >
                Clear Credentials
              </Button>
            )}
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md p-3 flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p>Your API credentials are stored securely in your browser's local storage and are never sent to our servers.</p>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
