
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { callKrakenApi, buildApiUrl, mapErrorToStatusCode } from "./services/krakenApiService.ts";

// Main function handler for all Kraken API proxy requests
serve(async (req) => {
  console.log(`Kraken-proxy function received ${req.method} request`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Special health check endpoint
    if (req.url.includes('health')) {
      console.log('Health check requested');
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          time: new Date().toISOString(),
          message: 'Kraken proxy is operational'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const requestData = await req.json();
    
    // Validate required fields
    if (!requestData || !requestData.path) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: path is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { 
      path, 
      method = 'POST', 
      isPrivate = true,
      data = {},
      userId
    } = requestData;
    
    console.log(`Processing ${isPrivate ? 'private' : 'public'} ${method} request to ${path}`);
    
    // Build the Kraken API URL
    const apiUrl = buildApiUrl(path);
    
    // For private endpoints, ensure we have authentication
    if (isPrivate && !userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required for private endpoints' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Prepare options for the Kraken API request
    let options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Supabase Edge Function Kraken Proxy'
      }
    };
    
    // Handle POST requests with form data
    if (method === 'POST' && Object.keys(data).length > 0) {
      // Convert data object to URLSearchParams
      const formData = new URLSearchParams();
      
      // Add all data parameters to the form
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      options.body = formData.toString();
    }
    
    // Call the Kraken API
    const { data: responseData, status } = await callKrakenApi(apiUrl, options);
    
    // Check for Kraken API errors
    if (responseData && responseData.error && responseData.error.length > 0) {
      console.error('Kraken API returned error:', responseData.error);
      const firstError = responseData.error[0];
      const statusCode = mapErrorToStatusCode(firstError);
      
      return new Response(
        JSON.stringify(responseData),
        { 
          status: statusCode, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Return the successful response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in Kraken proxy function:', error);
    
    // Determine appropriate status code based on error
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
      } else if (errorMessage.includes('not found')) {
        statusCode = 404; // Not Found
      } else if (errorMessage.includes('bad request')) {
        statusCode = 400; // Bad Request
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
