
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import CryptoJS from 'https://cdn.skypack.dev/crypto-js';

// CORS headers for alle responser
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kraken API endepunkter
const API_URL = 'https://api.kraken.com';
const API_VERSION = '0';

serve(async (req) => {
  // Håndter preflight OPTIONS forespørsel
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Proxy mottok forespørsel:', req.url);
    
    // Parse forespørselsdata
    const { path, method, isPrivate, data, apiKey, apiSecret } = await req.json();
    
    console.log(`Behandler forespørsel til ${path}, metode: ${method}, privat: ${isPrivate}`);

    // Sjekk om API-nøkler er påkrevd for private endepunkter
    if (isPrivate && (!apiKey || !apiSecret)) {
      return new Response(
        JSON.stringify({ error: 'API-nøkkel og -hemmelighet er påkrevd for private endepunkter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Bygg URL
    const url = `${API_URL}/${API_VERSION}/${path}`;
    console.log(`Sender forespørsel til: ${url}`);
    
    // Sett opp forespørselsvalg
    const options: RequestInit = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    let bodyData = data || {};
    
    // Legg til autentisering for private endepunkter
    if (isPrivate) {
      // Opprett nonce for autentisering
      const nonce = Date.now().toString();
      
      // Legg til nonce i dataene
      bodyData = {
        ...bodyData,
        nonce
      };
      
      // Opprett signatur
      const signature = createSignature(`/${API_VERSION}/${path}`, nonce, bodyData, apiSecret);
      
      // Legg til API-nøkkel og signatur i headers
      options.headers = {
        ...options.headers,
        'API-Key': apiKey,
        'API-Sign': signature
      };
    }
    
    // Konverter data til URL-kodet format for POST
    if (method === 'POST' || isPrivate) {
      const formBody = new URLSearchParams(bodyData).toString();
      options.body = formBody;
      console.log(`Forberedt request body: ${formBody}`);
    }

    console.log(`Sender forespørsel til Kraken API: ${url} med metode ${options.method}`);
    
    // Send forespørsel til Kraken API
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`Fikk svar fra Kraken API med status: ${response.status}`);
    console.log(`Response tekst: ${responseText.substring(0, 200)}...`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`Feil ved parsing av JSON-svar: ${e.message}`);
      responseData = { error: `Ugyldig JSON-svar: ${responseText.substring(0, 100)}...` };
    }
    
    // Sjekk om Kraken API returnerte feil
    if (responseData.error && responseData.error.length > 0) {
      console.error(`Kraken API returnerte feil: ${JSON.stringify(responseData.error)}`);
    }

    // Returner data med CORS-headers
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status
    });
  } catch (error) {
    console.error('Feil i Kraken proxy:', error);
    
    // Returner feilmelding
    return new Response(
      JSON.stringify({ error: error.message || 'Ukjent feil i Kraken proxy' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Funksjon for å opprette API-signatur
function createSignature(path: string, nonce: string, postData: any, apiSecret: string): string {
  // Dekoder base64-hemmelighet
  const secret = CryptoJS.enc.Base64.parse(apiSecret);
  
  // Opprett meldingen som skal signeres
  const message = postData.nonce + new URLSearchParams(postData).toString();
  
  // Opprett SHA256-hash av meldingen
  const hash = CryptoJS.SHA256(message);
  
  // Opprett HMAC-SHA512 av den hashede meldingen ved hjelp av den dekodede hemmeligheten
  const hmac = CryptoJS.HmacSHA512(
    path + hash.toString(CryptoJS.enc.Hex),
    secret
  );
  
  // Returner base64-kodet signatur
  return CryptoJS.enc.Base64.stringify(hmac);
}
