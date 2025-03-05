
import { RATE_LIMITS } from "../config/apiConfig.ts";

// Rate limiting state storage
// Note: This will reset on function restart. For production, use KV store or similar
const rateLimitState: {
  [key: string]: {
    count: number;
    resetAt: number;
  }
} = {};

// Function to enforce rate limits
export const checkRateLimit = (identifier: string, type: 'ip' | 'user'): { allowed: boolean; resetIn?: number } => {
  const now = Date.now();
  const minuteKey = `${identifier}_${type}_minute`;
  const hourKey = `${identifier}_${type}_hour`;
  
  // Initialize or reset counters if needed
  if (!rateLimitState[minuteKey] || rateLimitState[minuteKey].resetAt < now) {
    rateLimitState[minuteKey] = { count: 0, resetAt: now + 60000 };
  }
  
  if (!rateLimitState[hourKey] || rateLimitState[hourKey].resetAt < now) {
    rateLimitState[hourKey] = { count: 0, resetAt: now + 3600000 };
  }
  
  // Increment counters
  rateLimitState[minuteKey].count++;
  rateLimitState[hourKey].count++;
  
  // Check limits
  const limits = RATE_LIMITS[type];
  if (rateLimitState[minuteKey].count > limits.perMinute) {
    return { 
      allowed: false, 
      resetIn: Math.ceil((rateLimitState[minuteKey].resetAt - now) / 1000)
    };
  }
  
  if (rateLimitState[hourKey].count > limits.perHour) {
    return {
      allowed: false,
      resetIn: Math.ceil((rateLimitState[hourKey].resetAt - now) / 1000)
    };
  }
  
  return { allowed: true };
};
