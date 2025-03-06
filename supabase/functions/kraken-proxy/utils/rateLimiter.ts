
import { RATE_LIMITS } from '../config/apiConfig.ts';

// Simple in-memory rate limiting store
const ipLimitStore: Record<string, { count: number; lastReset: number }> = {};
const userLimitStore: Record<string, { count: number; lastReset: number }> = {};

// Check if a request should be rate limited
export const checkRateLimit = (
  identifier: string,
  type: 'ip' | 'user'
): { allowed: boolean; resetIn: number } => {
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

  // Check if over limit
  if (store[identifier].count > limits.requests) {
    const resetIn = Math.ceil(
      (store[identifier].lastReset + limits.window * 1000 - now) / 1000
    );
    return { allowed: false, resetIn };
  }

  return { allowed: true, resetIn: 0 };
};
