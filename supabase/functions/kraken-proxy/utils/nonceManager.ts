
// Store for checking nonce uniqueness
// Key format: userId-nonceFirstDigits
const nonceStore: Record<string, Set<string>> = {};

// Check if a nonce is valid and hasn't been used before
export const isNonceValid = (userId: string, nonce: string): boolean => {
  if (!userId || !nonce) {
    console.error('Invalid user ID or nonce');
    return false;
  }
  
  // Basic nonce validation - should be a numeric string of appropriate length
  if (!/^\d{13,19}$/.test(nonce)) {
    console.error('Nonce format is invalid:', nonce);
    return false;
  }
  
  // Get current timestamp in milliseconds
  const now = Date.now();
  
  // Nonce should be recent (within last 60 seconds)
  const nonceTime = parseInt(nonce.substring(0, 13));
  if (now - nonceTime > 60000) {
    console.error('Nonce is too old:', nonce);
    return false;
  }
  
  // Check for future timestamps (clock skew or manipulation)
  if (nonceTime > now + 10000) {
    console.error('Nonce timestamp is in the future:', nonce);
    return false;
  }
  
  // Create a key for storing nonces - combine userId with first digits of nonce
  // This helps reduce memory usage while still providing security
  const storeKey = `${userId}-${nonce.substring(0, 5)}`;
  
  // Initialize the set for this user-timeframe if it doesn't exist
  if (!nonceStore[storeKey]) {
    nonceStore[storeKey] = new Set();
  }
  
  // Check if this exact nonce has been used before
  if (nonceStore[storeKey].has(nonce)) {
    console.error('Nonce has already been used:', nonce);
    return false;
  }
  
  // Store the nonce
  nonceStore[storeKey].add(nonce);
  
  // Clean up old entries from nonceStore periodically
  cleanupOldNonces();
  
  return true;
};

// Clean up old nonce entries to prevent memory leaks
const cleanupOldNonces = () => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  // Find keys that should be deleted (older than 10 minutes)
  for (const key of Object.keys(nonceStore)) {
    const prefix = key.split('-')[1];
    if (prefix) {
      const timestamp = parseInt(prefix + '00000000');
      if (now - timestamp > 600000) {
        keysToDelete.push(key);
      }
    }
  }
  
  // Delete old keys
  keysToDelete.forEach(key => {
    delete nonceStore[key];
  });
};

// Clean up old nonces every minute
setInterval(() => {
  cleanupOldNonces();
}, 60000);
