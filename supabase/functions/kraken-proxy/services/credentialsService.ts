
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Interface for credentials response
interface CredentialsResponse {
  apiKey: string;
  apiSecret: string;
}

// Service to fetch API credentials from Supabase
export const fetchCredentials = async (userId: string): Promise<CredentialsResponse> => {
  // Get Supabase URL and key from environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    throw new Error('Supabase configuration is missing');
  }

  if (!userId) {
    console.error('No user ID provided for credentials lookup');
    throw new Error('User ID is required to fetch credentials');
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log(`Attempting to fetch credentials for user ID: ${userId}`);
    
    // Use a simplified, more direct query approach with no timeout race
    const { data, error } = await supabase
      .from('api_credentials')
      .select('api_key, api_secret')
      .eq('user_id', userId)
      .eq('exchange', 'kraken')
      .maybeSingle();
    
    console.log('Credentials query completed');
    console.log('Data found:', data ? 'Yes' : 'No');
    
    if (error) {
      console.error('Database error fetching credentials:', error);
      throw new Error(`Failed to fetch API credentials: ${error.message}`);
    }

    if (!data) {
      console.error('No API credentials found for user ID:', userId);
      throw new Error('No API credentials found for this user');
    }

    if (!data.api_key || !data.api_secret) {
      console.error('Invalid or incomplete credentials found for user ID:', userId);
      throw new Error('Invalid API credentials found');
    }

    const apiKey = data.api_key;
    const apiSecret = data.api_secret;
    
    if (!validateCredentials(apiKey, apiSecret)) {
      console.error('Invalid API credentials format');
      throw new Error('API key or secret is invalid');
    }
    
    // Log success but not the actual credentials
    console.log(`Successfully retrieved API credentials for user ID: ${userId}`);
    
    return { apiKey, apiSecret };
  } catch (error) {
    console.error('Error fetching credentials from database:', error);
    
    // Provide a more specific error message
    if (error.message && error.message.includes('timed out')) {
      throw new Error('Database operation timed out: Failed to fetch API credentials');
    }
    
    // Re-throw the original error to preserve the message
    throw error;
  }
};

// Validate that credentials are properly formatted
export const validateCredentials = (apiKey: string, apiSecret: string): boolean => {
  // Check if values are present
  if (!apiKey || !apiSecret) {
    return false;
  }
  
  // Check if key has proper length (Kraken API keys are typically around 56 characters)
  if (apiKey.length < 20) {
    return false;
  }
  
  // Check if secret has proper length (Kraken API secrets are typically very long)
  if (apiSecret.length < 50) {
    return false;
  }
  
  return true;
};
