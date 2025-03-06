
import { encode as encodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

// Generate signature for authenticated Kraken API requests
export const createSignature = (
  path: string,
  nonce: string,
  postData: Record<string, any>,
  secret: string
): string => {
  try {
    // Convert the secret from base64
    const secretDecoded = new TextEncoder().encode(secret);
    
    // Create the message to sign
    const message = createMessageToSign(path, nonce, postData);
    
    // Create SHA256 HMAC
    const signature = hmac("sha256", secretDecoded, message, "utf8", "binary");
    
    // Base64 encode the binary signature
    return encodeBase64(signature);
  } catch (error) {
    console.error("Error creating signature:", error);
    throw new Error(`Signature creation failed: ${error.message}`);
  }
};

// Helper to create the message that should be signed
const createMessageToSign = (
  path: string,
  nonce: string,
  postData: Record<string, any>
): Uint8Array => {
  // Create a URLSearchParams object to handle proper encoding
  const postDataParams = new URLSearchParams(postData);
  
  // Convert to string
  const postDataString = postDataParams.toString();
  
  // Get SHA256 of (nonce + postData)
  const encoder = new TextEncoder();
  const nonceAndPostData = encoder.encode(nonce + postDataString);
  
  // Create SHA256 hash 
  const sha256 = new Uint8Array(
    crypto.subtle.digestSync("SHA-256", nonceAndPostData)
  );
  
  // Combine path and sha256 hash
  const pathBytes = encoder.encode(path);
  const messageToSign = new Uint8Array(pathBytes.length + sha256.length);
  messageToSign.set(pathBytes, 0);
  messageToSign.set(sha256, pathBytes.length);
  
  return messageToSign;
};

// Validate signature parameters
export const validateSignatureParams = (
  path: string,
  nonce: string,
  secret: string
): boolean => {
  if (!path || !path.startsWith('/')) {
    console.error('Invalid path format for signature');
    return false;
  }
  
  if (!nonce || nonce.length < 10) {
    console.error('Invalid nonce for signature');
    return false;
  }
  
  if (!secret || secret.length < 45) {
    console.error('Invalid API secret for signature');
    return false;
  }
  
  return true;
};
