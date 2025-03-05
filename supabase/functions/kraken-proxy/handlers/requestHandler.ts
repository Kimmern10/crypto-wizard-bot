
import { corsHeaders } from "../utils/corsHeaders.ts";
import { checkRateLimit } from "../utils/rateLimiter.ts";
import { validateInput } from "../utils/validator.ts";
import { isNonceValid } from "../utils/nonceManager.ts";
import { createSignature } from "../utils/signatureGenerator.ts";
import { fetchCredentials } from "../services/credentialsService.ts";
import { callKrakenApi, buildApiUrl, mapErrorToStatusCode } from "../services/krakenApiService.ts";
import { API_VERSION } from "../config/apiConfig.ts";

// Health check handler
const handleHealthCheck = (): Response => {
  console.log('Processing health check request');
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.1.0'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
};

// Main request handler
export const handleRequest = async (req: Request): Promise<Response> => {
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
      return handleHealthCheck();
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
      return handleHealthCheck();
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

      try {
        const credentials = await fetchCredentials(userId);
        apiKey = credentials.apiKey;
        apiSecret = credentials.apiSecret;
      } catch (error) {
        return new Response(
          JSON.stringify({ error: [error.message] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.message.includes('No API credentials') ? 404 : 500 }
        );
      }
    }

    // Build URL
    const apiUrl = buildApiUrl(path);
    
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
        // Create signature with the API_VERSION properly imported
        const signature = createSignature(`/${API_VERSION}/private/${path}`, nonce, bodyData, apiSecret);
        
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
    
    // Convert data to URL-encoded format for POST
    if (method === 'POST' || isPrivate) {
      const formBody = new URLSearchParams(bodyData).toString();
      options.body = formBody;
      console.log(`Prepared request body: ${formBody}`);
    }

    console.log(`Sending request to Kraken API: ${apiUrl} with method ${options.method}`);
    
    // Send request to Kraken API
    try {
      const { data: responseData, status } = await callKrakenApi(apiUrl, options);
      
      // Check if Kraken API returned an error
      if (responseData.error && responseData.error.length > 0) {
        console.error(`Kraken API returned error: ${JSON.stringify(responseData.error)}`);
        
        // Map common Kraken errors to appropriate HTTP status codes
        const errorMsg = responseData.error.join(', ');
        const statusCode = mapErrorToStatusCode(errorMsg);
        
        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: statusCode
        });
      }

      // Return data with CORS headers
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: [error.message] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.message.includes('timed out') ? 408 : 502 }
      );
    }
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
};
