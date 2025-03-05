
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { handleRequest } from "./handlers/requestHandler.ts";
import { getMockResponse } from "./services/demoDataService.ts";

// Main function handler for all Kraken API proxy requests
serve(async (req) => {
  console.log(`Kraken-proxy function received ${req.method} request`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Special health check endpoint for direct path requests
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
    
    // Use the request handler for all other requests
    return await handleRequest(req);
    
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
      JSON.stringify({ 
        error: [errorMessage], 
        result: null,
        _isDemo: true 
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
