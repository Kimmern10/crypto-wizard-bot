
import { corsHeaders } from "../utils/corsHeaders.ts";
import { checkRateLimit } from "../utils/rateLimiter.ts";
import { validateInput } from "../utils/validator.ts";
import { isNonceValid } from "../utils/nonceManager.ts";
import { createSignature, validateSignatureParams } from "../utils/signatureGenerator.ts";
import { fetchCredentials } from "../services/credentialsService.ts";
import { callKrakenApi, buildApiUrl, mapErrorToStatusCode } from "../services/krakenApiService.ts";
import { API_VERSION } from "../config/apiConfig.ts";

// Health check handler
const handleHealthCheck = (): Response => {
  console.log('Processing health check request');
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.2.1'
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
    const clientIp = req.headers.get('x-real-ip') || 
                     req.headers.get('x-forwarded-for') || 
                     'unknown';
    
    // Check IP-based rate limit first
    const ipRateLimit = checkRateLimit(clientIp, 'ip');
    if (!ipRateLimit.allowed) {
      console.warn(`Rate limit exceeded for IP ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: [`Rate limit exceeded. Try again in ${ipRateLimit.resetIn} seconds`],
          remaining: ipRateLimit.remaining 
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
    
    const { path, method, isPrivate, data, userId, forceDemoMode } = requestData;
    
    // Validate input parameters
    const inputValidation = validateInput(path, data || {});
    if (!inputValidation.valid) {
      return new Response(
        JSON.stringify({ error: inputValidation.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Processing request to ${path}, method: ${method || 'POST'}, private: ${isPrivate}, demo: ${forceDemoMode ? 'yes' : 'no'}`);

    // User-based rate limiting for private endpoints
    if (isPrivate && userId) {
      const userRateLimit = checkRateLimit(userId, 'user');
      if (!userRateLimit.allowed) {
        return new Response(
          JSON.stringify({ 
            error: [`Rate limit exceeded. Try again in ${userRateLimit.resetIn} seconds`],
            remaining: userRateLimit.remaining 
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
    if (isPrivate && !forceDemoMode) {
      if (!userId) {
        console.error('No user ID provided for private endpoint');
        return new Response(
          JSON.stringify({ error: ['User ID is required for private endpoints'] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      try {
        const credentials = await fetchCredentials(userId);
        apiKey = credentials.apiKey;
        apiSecret = credentials.apiSecret;
        
        console.log('Successfully retrieved API credentials for user');
      } catch (error) {
        console.error('Error fetching credentials:', error);
        
        // If demo mode was requested, continue without credentials
        if (forceDemoMode) {
          console.log('Proceeding with demo mode as requested');
        } else {
          return new Response(
            JSON.stringify({ error: [error.message], demoModeAvailable: true }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
              status: error.message.includes('No API credentials') ? 404 : 500 
            }
          );
        }
      }
    }

    // Build URL
    const apiUrl = buildApiUrl(path);
    
    // Set up request options
    const options: RequestInit = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KrakenProxy/1.0'
      }
    };

    let bodyData = data || {};
    
    // If demo mode is requested, add that flag
    if (forceDemoMode) {
      bodyData = {
        ...bodyData,
        forceDemoMode: 'true'
      };
    }
    
    // Add authentication for private endpoints
    if (isPrivate && !forceDemoMode) {
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
        // Validate signature parameters
        if (!validateSignatureParams(`/${API_VERSION}/private/${path}`, nonce, apiSecret)) {
          return new Response(
            JSON.stringify({ error: ['Invalid signature parameters'] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        
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
      
      // Add rate limit information to the response headers
      const responseHeaders = { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining-IP': ipRateLimit.remaining.toString(),
        'X-RateLimit-Reset-IP': ipRateLimit.resetIn.toString()
      };
      
      // If userId is available, add user rate limit information
      if (userId) {
        const userRateLimit = checkRateLimit(userId, 'user');
        responseHeaders['X-RateLimit-Remaining-User'] = userRateLimit.remaining.toString();
        responseHeaders['X-RateLimit-Reset-User'] = userRateLimit.resetIn.toString();
      }
      
      // Check if Kraken API returned an error
      if (responseData.error && responseData.error.length > 0) {
        console.error(`Kraken API returned error: ${JSON.stringify(responseData.error)}`);
        
        // Map common Kraken errors to appropriate HTTP status codes
        const errorMsg = responseData.error.join(', ');
        const statusCode = mapErrorToStatusCode(errorMsg);
        
        return new Response(JSON.stringify(responseData), {
          headers: responseHeaders,
          status: statusCode
        });
      }

      // Return data with CORS headers
      return new Response(JSON.stringify(responseData), {
        headers: responseHeaders,
        status
      });
    } catch (error) {
      // Determine appropriate status code based on error message
      let statusCode = 502; // Default to bad gateway
      
      if (error.message.includes('timed out')) {
        statusCode = 408; // Request timeout
      }
      
      return new Response(
        JSON.stringify({ 
          error: [error.message],
          timestamp: new Date().toISOString() 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
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
