
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import CryptoJS from 'https://cdn.skypack.dev/crypto-js';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kraken API endpoints
const API_URL = 'https://api.kraken.com';
const API_VERSION = '0';

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Proxy received request:', req.url);
    
    // Parse request data
    const requestData = await req.json();
    const { path, method, isPrivate, data, userId } = requestData;
    
    console.log(`Processing request to ${path}, method: ${method}, private: ${isPrivate}`);

    // Initialize apiKey and apiSecret
    let apiKey = '';
    let apiSecret = '';

    // For private endpoints, fetch API credentials from Supabase
    if (isPrivate) {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required for private endpoints' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get Supabase URL and key from environment variables
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      
      if (!supabaseUrl || !supabaseKey) {
        return new Response(
          JSON.stringify({ error: 'Supabase configuration is missing' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Create Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Fetch API credentials for Kraken from the database
      const { data: credentials, error } = await supabase
        .from('api_credentials')
        .select('api_key, api_secret')
        .eq('user_id', userId)
        .eq('exchange', 'kraken')
        .maybeSingle();

      if (error || !credentials) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch API credentials' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      apiKey = credentials.api_key;
      apiSecret = credentials.api_secret;
      
      if (!apiKey || !apiSecret) {
        return new Response(
          JSON.stringify({ error: 'API key and secret are required for private endpoints' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Build URL
    const url = `${API_URL}/${API_VERSION}/${path}`;
    console.log(`Sending request to: ${url}`);
    
    // Set up request options
    const options: RequestInit = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    let bodyData = data || {};
    
    // Add authentication for private endpoints
    if (isPrivate) {
      // Create nonce for authentication
      const nonce = Date.now().toString();
      
      // Add nonce to the data
      bodyData = {
        ...bodyData,
        nonce
      };
      
      // Create signature
      const signature = createSignature(`/${API_VERSION}/${path}`, nonce, bodyData, apiSecret);
      
      // Add API key and signature to headers
      options.headers = {
        ...options.headers,
        'API-Key': apiKey,
        'API-Sign': signature
      };
    }
    
    // Convert data to URL-encoded format for POST
    if (method === 'POST' || isPrivate) {
      const formBody = new URLSearchParams(bodyData).toString();
      options.body = formBody;
      console.log(`Prepared request body: ${formBody}`);
    }

    console.log(`Sending request to Kraken API: ${url} with method ${options.method}`);
    
    // Send request to Kraken API
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`Got response from Kraken API with status: ${response.status}`);
    console.log(`Response text: ${responseText.substring(0, 200)}...`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`Error parsing JSON response: ${e.message}`);
      responseData = { error: `Invalid JSON response: ${responseText.substring(0, 100)}...` };
    }
    
    // Check if Kraken API returned an error
    if (responseData.error && responseData.error.length > 0) {
      console.error(`Kraken API returned error: ${JSON.stringify(responseData.error)}`);
    }

    // Return data with CORS headers
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status
    });
  } catch (error) {
    console.error('Error in Kraken proxy:', error);
    
    // Return error message
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error in Kraken proxy' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Function to create API signature
function createSignature(path: string, nonce: string, postData: any, apiSecret: string): string {
  // Decode base64 secret
  const secret = CryptoJS.enc.Base64.parse(apiSecret);
  
  // Create the message to be signed
  const message = postData.nonce + new URLSearchParams(postData).toString();
  
  // Create SHA256 hash of the message
  const hash = CryptoJS.SHA256(message);
  
  // Create HMAC-SHA512 of the hashed message using the decoded secret
  const hmac = CryptoJS.HmacSHA512(
    path + hash.toString(CryptoJS.enc.Hex),
    secret
  );
  
  // Return base64-encoded signature
  return CryptoJS.enc.Base64.stringify(hmac);
}
