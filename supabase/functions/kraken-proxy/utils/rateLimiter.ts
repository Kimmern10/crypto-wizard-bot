
import { RATE_LIMITS } from '../config/apiConfig.ts';

// Simple in-memory rate limiting store
const ipLimitStore: Record<string, { count: number; lastReset: number }> = {};
const userLimitStore: Record<string, { count: number; lastReset: number }> = {};

// Check if a request should be rate limited
export const checkRateLimit = (
  identifier: string,
  type: 'ip' | 'user'
): { allowed: boolean; resetIn: number; remaining: number } => {
  const store = type === 'ip' ? ipLimitStore : userLimitStore;
  const limits = type === 'ip' ? RATE_LIMITS.ip : RATE_LIMITS.user;
  const now = Date.now();

  // Initialize or reset counter if window has expired
  if (!store[identifier] || now - store[identifier].lastReset >= limits.window * 1000) {
    store[identifier] = {
      count: 0,
      lastReset: now
    };
  }

  // Increment counter
  store[identifier].count++;

  // Calculate remaining requests
  const remaining = Math.max(0, limits.requests - store[identifier].count);

  // Check if over limit
  if (store[identifier].count > limits.requests) {
    const resetIn = Math.ceil(
      (store[identifier].lastReset + limits.window * 1000 - now) / 1000
    );
    return { allowed: false, resetIn, remaining: 0 };
  }

  return { allowed: true, resetIn: 0, remaining };
};

// Clean up rate limiting stores periodically
const cleanupOldEntries = () => {
  const now = Date.now();
  
  // Clean IP store
  Object.keys(ipLimitStore).forEach(key => {
    if (now - ipLimitStore[key].lastReset >= RATE_LIMITS.ip.window * 1000 * 2) {
      delete ipLimitStore[key];
    }
  });
  
  // Clean user store
  Object.keys(userLimitStore).forEach(key => {
    if (now - userLimitStore[key].lastReset >= RATE_LIMITS.user.window * 1000 * 2) {
      delete userLimitStore[key];
    }
  });
};

// Run cleanup every 10 minutes
setInterval(cleanupOldEntries, 600000);
