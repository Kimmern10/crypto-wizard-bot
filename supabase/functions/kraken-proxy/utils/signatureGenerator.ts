
import CryptoJS from 'https://cdn.skypack.dev/crypto-js';

// Function to create API signature with improved security
export function createSignature(path: string, nonce: string, postData: any, apiSecret: string): string {
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
