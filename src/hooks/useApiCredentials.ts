
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useApiCredentials = (
  onConnect: () => Promise<void>
) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState<boolean>(false);

  useEffect(() => {
    // Først sjekk om vi allerede har en aktiv sesjon
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Hvis brukeren er logget inn, hent API-nøklene
        loadApiCredentials();
      } else {
        // Hvis ikke logget inn, prøv å hente fra lokal lagring som fallback
        loadFromLocalStorage();
      }
    };

    checkSession();
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
        console.error('Feil ved henting av API-nøkler fra Supabase:', error);
        // Fallback til lokal lagring
        loadFromLocalStorage();
        return;
      }

      if (data) {
        console.log('API-nøkler lastet fra Supabase');
        setApiKey(data.api_key);
        setApiSecret(data.api_secret);
      } else {
        // Ingen nøkler funnet i Supabase, prøv lokal lagring
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Feil ved henting av API-nøkler:', error);
      loadFromLocalStorage();
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const loadFromLocalStorage = () => {
    const savedApiKey = localStorage.getItem('krakenApiKey');
    const savedApiSecret = localStorage.getItem('krakenApiSecret');
    
    if (savedApiKey && savedApiSecret) {
      console.log('API-nøkler lastet fra lokal lagring');
      setApiKey(savedApiKey);
      setApiSecret(savedApiSecret);
    }
  };

  const setApiCredentials = async (key: string, secret: string) => {
    setApiKey(key);
    setApiSecret(secret);
    
    // Lagre i lokal lagring som fallback
    localStorage.setItem('krakenApiKey', key);
    localStorage.setItem('krakenApiSecret', secret);
    
    try {
      // Sjekk om brukeren er logget inn
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        // Sjekk om brukeren allerede har lagrede nøkler
        const { data: existingData } = await supabase
          .from('api_credentials')
          .select('id')
          .eq('exchange', 'kraken')
          .maybeSingle();
        
        if (existingData) {
          // Oppdater eksisterende nøkler
          const { error } = await supabase
            .from('api_credentials')
            .update({ api_key: key, api_secret: secret, updated_at: new Date() })
            .eq('id', existingData.id);
          
          if (error) {
            console.error('Feil ved oppdatering av API-nøkler i Supabase:', error);
            toast.error('Feil ved lagring av API-nøkler');
          } else {
            console.log('API-nøkler oppdatert i Supabase');
          }
        } else {
          // Sett inn nye nøkler
          const { error } = await supabase
            .from('api_credentials')
            .insert({
              exchange: 'kraken',
              api_key: key,
              api_secret: secret
            });
          
          if (error) {
            console.error('Feil ved innsetting av API-nøkler i Supabase:', error);
            toast.error('Feil ved lagring av API-nøkler');
          } else {
            console.log('API-nøkler lagret i Supabase');
          }
        }
      }
    } catch (error) {
      console.error('Feil ved lagring av API-nøkler:', error);
      toast.error('Feil ved lagring av API-nøkler');
    }
  };

  const clearApiCredentials = async () => {
    setApiKey('');
    setApiSecret('');
    localStorage.removeItem('krakenApiKey');
    localStorage.removeItem('krakenApiSecret');
    
    try {
      // Sjekk om brukeren er logget inn
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        // Slett nøkler fra Supabase
        const { error } = await supabase
          .from('api_credentials')
          .delete()
          .eq('exchange', 'kraken');
        
        if (error) {
          console.error('Feil ved sletting av API-nøkler fra Supabase:', error);
        } else {
          console.log('API-nøkler slettet fra Supabase');
        }
      }
    } catch (error) {
      console.error('Feil ved sletting av API-nøkler:', error);
    }
    
    toast.info('API-nøkler fjernet');
  };

  const showApiKeyModal = () => setIsApiKeyModalOpen(true);
  const hideApiKeyModal = () => setIsApiKeyModalOpen(false);

  return {
    apiKey,
    apiSecret,
    isApiConfigured: !!(apiKey && apiSecret),
    isApiKeyModalOpen,
    isLoadingCredentials,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal
  };
};
