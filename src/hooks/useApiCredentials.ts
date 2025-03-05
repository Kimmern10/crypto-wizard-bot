
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ApiCredentialsHookProps {
  onConnect?: () => Promise<void>;
  timeout?: number;
}

export const useApiCredentials = ({ 
  onConnect, 
  timeout = 15000 
}: ApiCredentialsHookProps = {}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState<boolean>(false);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Initialize and load credentials when the hook is first used
  useEffect(() => {
    const initCredentials = async () => {
      try {
        setIsLoadingCredentials(true);
        setError(null);
        
        // Wait for auth state to be determined
        if (isAuthLoading) {
          return;
        }
        
        // If the user is logged in, try to fetch API keys from Supabase
        if (isAuthenticated && user) {
          console.log('User is authenticated, fetching API credentials from Supabase');
          await loadApiCredentials();
        } else {
          // If not logged in, fall back to local storage but log a warning
          console.log('User not authenticated, falling back to local storage');
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error initializing credentials:', error);
        setError('Failed to load API credentials');
        loadFromLocalStorage();
      } finally {
        setIsLoadingCredentials(false);
        setIsAuthChecked(true);
      }
    };

    // Only run this effect when auth state is determined
    if (!isAuthLoading) {
      initCredentials();
    }
  }, [isAuthLoading, isAuthenticated, user]);

  const loadApiCredentials = async () => {
    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.error('Timeout fetching API credentials from Supabase');
      setError('Connection timeout. Check your network and try again.');
      loadFromLocalStorage();
      setIsLoadingCredentials(false);
    }, timeout);

    try {
      setIsLoadingCredentials(true);
      
      const { data, error } = await supabase
        .from('api_credentials')
        .select('api_key, api_secret')
        .eq('exchange', 'kraken')
        .maybeSingle();

      // Clear timeout since we got a response
      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching API keys from Supabase:', error);
        setError(`Database error: ${error.message}`);
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
        console.log('No API keys found in Supabase, trying local storage');
        loadFromLocalStorage();
      }
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);
      
      console.error('Error fetching API keys:', error);
      setError('Failed to fetch API credentials');
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
      } else {
        console.log('No API keys found in local storage');
      }
    } catch (error) {
      console.error('Error reading from local storage:', error);
      setError('Failed to read from local storage');
    }
  }, []);

  const setApiCredentials = async (key: string, secret: string) => {
    if (!key || !secret) {
      throw new Error('API key and secret must be provided');
    }
    
    // Set in state immediately for responsiveness
    setApiKey(key);
    setApiSecret(secret);
    setError(null);
    
    // Set a timeout to prevent hanging during Supabase operations
    const timeoutId = setTimeout(() => {
      console.warn('Supabase operation timeout when saving credentials');
      toast.warning('Operation taking longer than expected', {
        description: 'Your API keys are saved in local storage for now.'
      });
    }, timeout);
    
    try {
      // Store in local storage as fallback
      localStorage.setItem('krakenApiKey', key);
      localStorage.setItem('krakenApiSecret', secret);
      
      // Check if the user is logged in for Supabase storage
      if (isAuthenticated && user) {
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
            setError(`Failed to update API keys: ${error.message}`);
            
            toast.error('Failed to update API keys', {
              description: 'Your keys are saved locally only.'
            });
          } else {
            console.log('API keys updated in Supabase');
            toast.success('API keys updated in database');
          }
        } else {
          // Insert new keys
          const { error } = await supabase
            .from('api_credentials')
            .insert({
              user_id: user.id,
              exchange: 'kraken',
              api_key: key,
              api_secret: secret
            });
          
          if (error) {
            console.error('Error inserting API keys in Supabase:', error);
            setError(`Failed to save API keys: ${error.message}`);
            
            toast.error('Failed to save API keys', {
              description: 'Your keys are saved locally only.'
            });
          } else {
            console.log('API keys saved in Supabase');
            toast.success('API keys saved in database');
          }
        }
      } else {
        console.log('User not authenticated, API keys saved only in local storage');
        toast.info('API keys saved locally', {
          description: 'Sign in to save your API keys securely in the cloud.'
        });
      }
      
      // Call onConnect callback if provided
      if (onConnect) {
        await onConnect();
      }
      
      // Clear timeout as operation completed
      clearTimeout(timeoutId);
      
      return true;
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);
      
      console.error('Error storing API keys:', error);
      setError('Failed to store API credentials');
      throw error;
    }
  };

  const clearApiCredentials = async () => {
    // Set a timeout to prevent hanging during Supabase operations
    const timeoutId = setTimeout(() => {
      console.warn('Supabase operation timeout when clearing credentials');
    }, timeout);
    
    try {
      // Clear from state first for responsiveness
      setApiKey('');
      setApiSecret('');
      setError(null);
      
      // Clear from local storage
      localStorage.removeItem('krakenApiKey');
      localStorage.removeItem('krakenApiSecret');
      
      // Check if the user is logged in
      if (isAuthenticated && user) {
        // Delete keys from Supabase
        const { error } = await supabase
          .from('api_credentials')
          .delete()
          .eq('exchange', 'kraken');
        
        if (error) {
          console.error('Error deleting API keys from Supabase:', error);
          setError(`Failed to delete API keys: ${error.message}`);
          
          toast.error('Failed to delete API keys from database', {
            description: 'Keys have been removed from your browser.'
          });
        } else {
          console.log('API keys deleted from Supabase');
          toast.success('API keys deleted from database');
        }
      }
      
      // Clear timeout as operation completed
      clearTimeout(timeoutId);
      
      return true;
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);
      
      console.error('Error clearing API keys:', error);
      setError('Failed to clear API credentials');
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
    error,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal,
    isAuthenticated,
    user
  };
};
