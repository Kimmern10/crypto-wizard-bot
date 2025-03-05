
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
    
    // Special handler for health check
    const requestUrl = new URL(req.url);
    if (requestUrl.pathname.endsWith('/health') || requestUrl.searchParams.get('health') === 'check') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.2'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Parse request data
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error('Failed to parse request JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { path, method, isPrivate, data, userId } = requestData;
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: path' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Processing request to ${path}, method: ${method || 'POST'}, private: ${isPrivate}`);

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
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase configuration');
        return new Response(
          JSON.stringify({ error: 'Supabase configuration is missing' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
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
          return new Response(
            JSON.stringify({ error: 'Failed to fetch API credentials: ' + error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        if (!credentials) {
          console.error('No API credentials found for userId:', userId);
          return new Response(
            JSON.stringify({ error: 'No API credentials found for this user' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        apiKey = credentials.api_key;
        apiSecret = credentials.api_secret;
        
        if (!apiKey || !apiSecret) {
          console.error('Invalid API credentials (empty key or secret)');
          return new Response(
            JSON.stringify({ error: 'API key or secret is missing or invalid' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      } catch (error) {
        console.error('Error fetching credentials from database:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch API credentials: ' + error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Build URL
    const apiUrl = `${API_URL}/${API_VERSION}/${path}`;
    console.log(`Sending request to: ${apiUrl}`);
    
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
      
      try {
        // Create signature
        const signature = createSignature(`/${API_VERSION}/${path}`, nonce, bodyData, apiSecret);
        
        // Add API key and signature to headers
        options.headers = {
          ...options.headers,
          'API-Key': apiKey,
          'API-Sign': signature
        };
      } catch (error) {
        console.error('Error creating API signature:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create API signature: ' + error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Convert data to URL-encoded format for POST
    if (method === 'POST' || isPrivate) {
      const formBody = new URLSearchParams(bodyData).toString();
      options.body = formBody;
      console.log(`Prepared request body: ${formBody}`);
    }

    console.log(`Sending request to Kraken API: ${apiUrl} with method ${options.method}`);
    
    // Send request to Kraken API
    let response;
    try {
      response = await fetch(apiUrl, options);
    } catch (error) {
      console.error('Network error sending request to Kraken:', error);
      return new Response(
        JSON.stringify({ error: 'Network error calling Kraken API: ' + error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
    
    let responseText;
    try {
      responseText = await response.text();
    } catch (error) {
      console.error('Error reading response from Kraken:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to read Kraken API response: ' + error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
    
    console.log(`Got response from Kraken API with status: ${response.status}`);
    console.log(`Response text: ${responseText.substring(0, 200)}...`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`Error parsing JSON response: ${e.message}`);
      responseData = { 
        error: [`Invalid JSON response from Kraken: ${responseText.substring(0, 100)}...`] 
      };
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
    console.error('Unexpected error in Kraken proxy:', error);
    
    // Return error message
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error in Kraken proxy' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Function to create API signature
function createSignature(path: string, nonce: string, postData: any, apiSecret: string): string {
  try {
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
  } catch (error) {
    console.error('Error creating signature:', error);
    throw new Error('Failed to create API signature: ' + error.message);
  }
}
