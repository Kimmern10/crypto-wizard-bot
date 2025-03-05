
// Nonce tracking to prevent replay attacks
// In production, this should use a persistent storage
const nonceHistory: {
  [key: string]: {
    nonce: string;
    timestamp: number;
  }[]
} = {};

// Check if nonce has been used recently (to prevent replay attacks)
export const isNonceValid = (userId: string, nonce: string, windowSeconds = 300): boolean => {
  const now = Date.now();
  
  // Initialize nonce history for this user if it doesn't exist
  if (!nonceHistory[userId]) {
    nonceHistory[userId] = [];
  }
  
  // Check if nonce exists in history
  const nonceExists = nonceHistory[userId].some(entry => entry.nonce === nonce);
  if (nonceExists) {
    return false;
  }
  
  // Clean up old nonces (older than windowSeconds)
  nonceHistory[userId] = nonceHistory[userId].filter(
    entry => now - entry.timestamp < windowSeconds * 1000
  );
  
  // Add new nonce to history
  nonceHistory[userId].push({
    nonce,
    timestamp: now
  });
  
  return true;
};
