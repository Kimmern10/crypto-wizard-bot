
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useApiCredentials = (
  onConnect: () => Promise<void>
) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('krakenApiKey');
    const savedApiSecret = localStorage.getItem('krakenApiSecret');
    
    if (savedApiKey && savedApiSecret) {
      setApiKey(savedApiKey);
      setApiSecret(savedApiSecret);
    }
  }, []);

  const setApiCredentials = (key: string, secret: string) => {
    setApiKey(key);
    setApiSecret(secret);
    localStorage.setItem('krakenApiKey', key);
    localStorage.setItem('krakenApiSecret', secret);
  };

  const clearApiCredentials = () => {
    setApiKey('');
    setApiSecret('');
    localStorage.removeItem('krakenApiKey');
    localStorage.removeItem('krakenApiSecret');
    toast.info('API credentials cleared');
  };

  const showApiKeyModal = () => setIsApiKeyModalOpen(true);
  const hideApiKeyModal = () => setIsApiKeyModalOpen(false);

  return {
    apiKey,
    apiSecret,
    isApiConfigured: !!(apiKey && apiSecret),
    isApiKeyModalOpen,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal
  };
};
