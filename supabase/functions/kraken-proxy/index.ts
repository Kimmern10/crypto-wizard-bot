
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleRequest } from "./handlers/requestHandler.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";

// Main handler function for all incoming requests
serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('Unexpected error in Kraken proxy main handler:', error);
    
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
