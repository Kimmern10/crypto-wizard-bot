
// CORS headers for the Edge Function
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-real-ip, x-forwarded-for',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Helper function to add CORS headers to a response
export const addCorsHeaders = (response: Response): Response => {
  const newHeaders = new Headers(response.headers);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
};

// Helper function for preflight requests
export const handleCorsPreflightRequest = (): Response => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
};
