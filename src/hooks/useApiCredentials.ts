
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useApiCredentials = (
  onConnect: () => Promise<void>
) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState<boolean>(false);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);

  // Initialize and load credentials when the hook is first used
  useEffect(() => {
    const initCredentials = async () => {
      try {
        setIsLoadingCredentials(true);
        
        // First check if we have an active session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          loadFromLocalStorage();
          return;
        }
        
        if (data.session) {
          // If the user is logged in, try to fetch API keys
          await loadApiCredentials();
        } else {
          // If not logged in, fall back to local storage
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error initializing credentials:', error);
        loadFromLocalStorage();
      } finally {
        setIsLoadingCredentials(false);
        setIsAuthChecked(true);
      }
    };

    initCredentials();
  }, []);

  const loadApiCredentials = async () => {
    try {
      setIsLoadingCredentials(true);
      
      const { data, error } = await supabase
        .from('api_credentials')
        .select('api_key, api_secret')
        .eq('exchange', 'kraken')
        .maybeSingle();

      if (error) {
        console.error('Error fetching API keys from Supabase:', error);
        // Fallback to local storage
        loadFromLocalStorage();
        return;
      }

      if (data) {
        console.log('API keys loaded from Supabase');
        setApiKey(data.api_key);
        setApiSecret(data.api_secret);
      } else {
        // No keys found in Supabase, try local storage
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      loadFromLocalStorage();
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedApiKey = localStorage.getItem('krakenApiKey');
      const savedApiSecret = localStorage.getItem('krakenApiSecret');
      
      if (savedApiKey && savedApiSecret) {
        console.log('API keys loaded from local storage');
        setApiKey(savedApiKey);
        setApiSecret(savedApiSecret);
      }
    } catch (error) {
      console.error('Error reading from local storage:', error);
    }
  }, []);

  const setApiCredentials = async (key: string, secret: string) => {
    if (!key || !secret) {
      throw new Error('API key and secret must be provided');
    }
    
    // Set in state immediately for responsiveness
    setApiKey(key);
    setApiSecret(secret);
    
    try {
      // Store in local storage as fallback
      localStorage.setItem('krakenApiKey', key);
      localStorage.setItem('krakenApiSecret', secret);
      
      // Check if the user is logged in for Supabase storage
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        // Check if the user already has stored keys
        const { data: existingData } = await supabase
          .from('api_credentials')
          .select('id')
          .eq('exchange', 'kraken')
          .maybeSingle();
        
        if (existingData) {
          // Update existing keys
          const { error } = await supabase
            .from('api_credentials')
            .update({ 
              api_key: key, 
              api_secret: secret, 
              updated_at: new Date().toISOString()
            })
            .eq('id', existingData.id);
          
          if (error) {
            console.error('Error updating API keys in Supabase:', error);
            throw new Error('Failed to update API keys: ' + error.message);
          }
          
          console.log('API keys updated in Supabase');
        } else {
          // Insert new keys
          const { error } = await supabase
            .from('api_credentials')
            .insert({
              user_id: sessionData.session.user.id,
              exchange: 'kraken',
              api_key: key,
              api_secret: secret
            });
          
          if (error) {
            console.error('Error inserting API keys in Supabase:', error);
            throw new Error('Failed to save API keys: ' + error.message);
          }
          
          console.log('API keys saved in Supabase');
        }
      }
      
      // Call onConnect callback if provided
      if (onConnect) {
        await onConnect();
      }
      
    } catch (error) {
      console.error('Error storing API keys:', error);
      throw error;
    }
  };

  const clearApiCredentials = async () => {
    try {
      // Clear from state first for responsiveness
      setApiKey('');
      setApiSecret('');
      
      // Clear from local storage
      localStorage.removeItem('krakenApiKey');
      localStorage.removeItem('krakenApiSecret');
      
      // Check if the user is logged in
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        // Delete keys from Supabase
        const { error } = await supabase
          .from('api_credentials')
          .delete()
          .eq('exchange', 'kraken');
        
        if (error) {
          console.error('Error deleting API keys from Supabase:', error);
          throw new Error('Failed to delete API keys: ' + error.message);
        }
        
        console.log('API keys deleted from Supabase');
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing API keys:', error);
      throw error;
    }
  };

  const showApiKeyModal = () => setIsApiKeyModalOpen(true);
  const hideApiKeyModal = () => setIsApiKeyModalOpen(false);

  return {
    apiKey,
    apiSecret,
    isApiConfigured: !!(apiKey && apiSecret),
    isApiKeyModalOpen,
    isLoadingCredentials,
    isAuthChecked,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal
  };
};
