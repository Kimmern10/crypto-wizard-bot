
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Service to fetch API credentials from Supabase
export const fetchCredentials = async (userId: string): Promise<{ apiKey: string; apiSecret: string }> => {
  // Get Supabase URL and key from environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    throw new Error('Supabase configuration is missing');
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Fetch API credentials for Kraken from the database
  try {
    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .select('api_key, api_secret')
      .eq('user_id', userId)
      .eq('exchange', 'kraken')
      .maybeSingle();

    if (error) {
      console.error('Database error fetching credentials:', error);
      throw new Error('Failed to fetch API credentials: ' + error.message);
    }

    if (!credentials) {
      console.error('No API credentials found for userId:', userId);
      throw new Error('No API credentials found for this user');
    }

    const apiKey = credentials.api_key;
    const apiSecret = credentials.api_secret;
    
    if (!apiKey || !apiSecret) {
      console.error('Invalid API credentials (empty key or secret)');
      throw new Error('API key or secret is missing or invalid');
    }
    
    return { apiKey, apiSecret };
  } catch (error) {
    console.error('Error fetching credentials from database:', error);
    throw new Error('Failed to fetch API credentials: ' + error.message);
  }
};
