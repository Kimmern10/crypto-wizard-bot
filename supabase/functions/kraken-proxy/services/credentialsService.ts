
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
  
  // Set a timeout promise
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Database query timed out after 10 seconds'));
    }, 10000); // 10 seconds timeout
  });
  
  try {
    console.log(`Fetching credentials for user ID: ${userId}`);
    
    // Use maybeSingle instead of single to prevent the PGRST116 error
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
      console.error('No API credentials found for user ID:', userId);
      throw new Error('No API credentials found for this user');
    }

    if (!credentials.api_key || !credentials.api_secret) {
      console.error('Invalid or incomplete credentials found for user ID:', userId);
      throw new Error('Invalid API credentials found');
    }

    const apiKey = credentials.api_key;
    const apiSecret = credentials.api_secret;
    
    if (!validateCredentials(apiKey, apiSecret)) {
      console.error('Invalid API credentials format');
      throw new Error('API key or secret is invalid');
    }
    
    // Log success but not the actual credentials
    console.log(`Successfully retrieved API credentials for user ID: ${userId}`);
    
    return { apiKey, apiSecret };
  } catch (error) {
    console.error('Error fetching credentials from database:', error);
    
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
