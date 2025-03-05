
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

// Rate limiting configuration
const RATE_LIMITS = {
  // Limits per IP address
  ip: {
    perMinute: 30,
    perHour: 300
  },
  // Limits per user ID
  user: {
    perMinute: 60,
    perHour: 600
  }
};

// Rate limiting state storage
// Note: This will reset on function restart. For production, use KV store or similar
const rateLimitState: {
  [key: string]: {
    count: number;
    resetAt: number;
  }
} = {};

// Nonce tracking to prevent replay attacks
// In production, this should use a persistent storage
const nonceHistory: {
  [key: string]: {
    nonce: string;
    timestamp: number;
  }[]
} = {};

// Function to enforce rate limits
const checkRateLimit = (identifier: string, type: 'ip' | 'user'): { allowed: boolean; resetIn?: number } => {
  const now = Date.now();
  const minuteKey = `${identifier}_${type}_minute`;
  const hourKey = `${identifier}_${type}_hour`;
  
  // Initialize or reset counters if needed
  if (!rateLimitState[minuteKey] || rateLimitState[minuteKey].resetAt < now) {
    rateLimitState[minuteKey] = { count: 0, resetAt: now + 60000 };
  }
  
  if (!rateLimitState[hourKey] || rateLimitState[hourKey].resetAt < now) {
    rateLimitState[hourKey] = { count: 0, resetAt: now + 3600000 };
  }
  
  // Increment counters
  rateLimitState[minuteKey].count++;
  rateLimitState[hourKey].count++;
  
  // Check limits
  const limits = RATE_LIMITS[type];
  if (rateLimitState[minuteKey].count > limits.perMinute) {
    return { 
      allowed: false, 
      resetIn: Math.ceil((rateLimitState[minuteKey].resetAt - now) / 1000)
    };
  }
  
  if (rateLimitState[hourKey].count > limits.perHour) {
    return {
      allowed: false,
      resetIn: Math.ceil((rateLimitState[hourKey].resetAt - now) / 1000)
    };
  }
  
  return { allowed: true };
};

// Check if nonce has been used recently (to prevent replay attacks)
const isNonceValid = (userId: string, nonce: string, windowSeconds = 300): boolean => {
  const now = Date.now();
  
  // Initialize nonce history for this user if it doesn't exist
  if (!nonceHistory[userId]) {
    nonceHistory[userId] = [];
  }
  
  // Check if nonce exists in history
  const nonceExists = nonceHistory[userId].some(entry => entry.nonce === nonce);
  if (nonceExists) {
    return false;
  }
  
  // Clean up old nonces (older than windowSeconds)
  nonceHistory[userId] = nonceHistory[userId].filter(
    entry => now - entry.timestamp < windowSeconds * 1000
  );
  
  // Add new nonce to history
  nonceHistory[userId].push({
    nonce,
    timestamp: now
  });
  
  return true;
};

// Validate input parameters
const validateInput = (path: string, data: any): { valid: boolean; errors?: string[] } => {
  if (!path) {
    return { valid: false, errors: ['Missing required parameter: path'] };
  }
  
  // Validate specific endpoints
  if (path === 'private/AddOrder') {
    const requiredFields = ['pair', 'type', 'ordertype', 'volume'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return { 
        valid: false, 
        errors: [`Missing required order parameters: ${missingFields.join(', ')}`] 
      };
    }
    
    // Validate order type
    if (!['buy', 'sell'].includes(data.type)) {
      return { valid: false, errors: ['Invalid order type. Must be "buy" or "sell"'] };
    }
    
    // Validate ordertype
    if (!['market', 'limit'].includes(data.ordertype)) {
      return { valid: false, errors: ['Invalid ordertype. Must be "market" or "limit"'] };
    }
    
    // For limit orders, price is required
    if (data.ordertype === 'limit' && !data.price) {
      return { valid: false, errors: ['Price is required for limit orders'] };
    }
  }
  
  return { valid: true };
};

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Proxy received request:', req.url);
    
    // Get client IP for rate limiting
    // Note: In production, you'd use proper headers like 'X-Forwarded-For'
    const clientIp = req.headers.get('x-real-ip') || 'unknown';
    
    // Check IP-based rate limit first
    const ipRateLimit = checkRateLimit(clientIp, 'ip');
    if (!ipRateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: [`Rate limit exceeded. Try again in ${ipRateLimit.resetIn} seconds`] 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 429 
        }
      );
    }
    
    // Special handler for health check
    const requestUrl = new URL(req.url);
    if (requestUrl.pathname.endsWith('/health') || requestUrl.pathname.includes('/health') || 
        requestUrl.searchParams.get('health') === 'check') {
      console.log('Processing health check request');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.1.0'
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
        JSON.stringify({ error: ['Invalid JSON in request body'] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Special handler for health check via POST body
    if (requestData.health === 'check' || requestData.path === 'health') {
      console.log('Processing health check request via POST body');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.1.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    const { path, method, isPrivate, data, userId } = requestData;
    
    // Validate input parameters
    const inputValidation = validateInput(path, data || {});
    if (!inputValidation.valid) {
      return new Response(
        JSON.stringify({ error: inputValidation.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Processing request to ${path}, method: ${method || 'POST'}, private: ${isPrivate}`);

    // User-based rate limiting for private endpoints
    if (isPrivate && userId) {
      const userRateLimit = checkRateLimit(userId, 'user');
      if (!userRateLimit.allowed) {
        return new Response(
          JSON.stringify({ 
            error: [`Rate limit exceeded. Try again in ${userRateLimit.resetIn} seconds`] 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 429 
          }
        );
      }
    }

    // Initialize apiKey and apiSecret
    let apiKey = '';
    let apiSecret = '';

    // For private endpoints, fetch API credentials from Supabase
    if (isPrivate) {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: ['User ID is required for private endpoints'] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get Supabase URL and key from environment variables
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase configuration');
        return new Response(
          JSON.stringify({ error: ['Supabase configuration is missing'] }),
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
            JSON.stringify({ error: ['Failed to fetch API credentials: ' + error.message] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        if (!credentials) {
          console.error('No API credentials found for userId:', userId);
          return new Response(
            JSON.stringify({ error: ['No API credentials found for this user'] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        apiKey = credentials.api_key;
        apiSecret = credentials.api_secret;
        
        if (!apiKey || !apiSecret) {
          console.error('Invalid API credentials (empty key or secret)');
          return new Response(
            JSON.stringify({ error: ['API key or secret is missing or invalid'] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      } catch (error) {
        console.error('Error fetching credentials from database:', error);
        return new Response(
          JSON.stringify({ error: ['Failed to fetch API credentials: ' + error.message] }),
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
      // Create nonce for authentication with microsecond precision
      const nonce = (Date.now() * 1000 + Math.floor(Math.random() * 1000)).toString();
      
      // Add nonce to the data
      bodyData = {
        ...bodyData,
        nonce
      };
      
      // Validate nonce to prevent replay attacks
      if (!isNonceValid(userId, nonce)) {
        return new Response(
          JSON.stringify({ error: ['Invalid or reused nonce value'] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
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
          JSON.stringify({ error: ['Failed to create API signature: ' + error.message] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Set timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
    options.signal = controller.signal;
    
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
      
      // Clear the timeout
      clearTimeout(timeoutId);
    } catch (error) {
      // Check if it's an abort error (timeout)
      if (error.name === 'AbortError') {
        console.error('Request to Kraken API timed out');
        return new Response(
          JSON.stringify({ error: ['Request timed out'] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 408 }
        );
      }
      
      console.error('Network error sending request to Kraken:', error);
      return new Response(
        JSON.stringify({ error: ['Network error calling Kraken API: ' + error.message] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
    
    let responseText;
    try {
      responseText = await response.text();
    } catch (error) {
      console.error('Error reading response from Kraken:', error);
      return new Response(
        JSON.stringify({ error: ['Failed to read Kraken API response: ' + error.message] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
    
    console.log(`Got response from Kraken API with status: ${response.status}`);
    
    // Only log a snippet of the response to avoid excessive logging
    const responsePreview = responseText.length > 200 
      ? `${responseText.substring(0, 200)}...` 
      : responseText;
    console.log(`Response text preview: ${responsePreview}`);
    
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
      
      // Map common Kraken errors to appropriate HTTP status codes
      let statusCode = 500;
      const errorMsg = responseData.error.join(', ');
      
      if (errorMsg.includes('Invalid key') || errorMsg.includes('Invalid signature') || 
          errorMsg.includes('Invalid nonce') || errorMsg.includes('Permission denied')) {
        statusCode = 403; // Forbidden / authentication error
      } else if (errorMsg.includes('Rate limit exceeded')) {
        statusCode = 429; // Too many requests
      } else if (errorMsg.includes('Unknown asset pair')) {
        statusCode = 400; // Bad request
      } else if (errorMsg.includes('Service unavailable')) {
        statusCode = 503; // Service unavailable
      }
      
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      });
    }

    // Return data with CORS headers
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status
    });
  } catch (error) {
    console.error('Unexpected error in Kraken proxy:', error);
    
    // Return detailed error message
    return new Response(
      JSON.stringify({ 
        error: [error.message || 'Unknown error in Kraken proxy'],
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Function to create API signature with improved security
function createSignature(path: string, nonce: string, postData: any, apiSecret: string): string {
  try {
    // Input validation
    if (!path || !nonce || !apiSecret) {
      throw new Error('Missing required parameters for signature creation');
    }
    
    // Validate nonce format (should be numeric string)
    if (!/^\d+$/.test(nonce)) {
      throw new Error('Invalid nonce format');
    }
    
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
