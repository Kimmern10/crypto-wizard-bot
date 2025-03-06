
// Validate API input parameters to prevent injection or malformed requests
export const validateInput = (
  path: string,
  data: Record<string, any>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic path validation
  if (!path || typeof path !== 'string') {
    errors.push('API path is required');
  } else if (!/^[a-zA-Z0-9\/\-_]+$/.test(path)) {
    errors.push('API path contains invalid characters');
  }
  
  // Validate all data fields recursively
  validateObject(data, errors);
  
  // Check specific endpoints for required parameters
  if (path) {
    if (path.includes('AddOrder') && !data.ordertype) {
      errors.push('Order type is required for AddOrder');
    }
    
    if (path.includes('AddOrder') && !data.pair) {
      errors.push('Trading pair is required for AddOrder');
    }
    
    if (path.includes('AddOrder') && !data.type) {
      errors.push('Trade type (buy/sell) is required for AddOrder');
    }
    
    if (path.includes('AddOrder') && !data.volume) {
      errors.push('Volume is required for AddOrder');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Helper to validate an object recursively
const validateObject = (obj: Record<string, any>, errors: string[]) => {
  if (!obj || typeof obj !== 'object') {
    return;
  }
  
  // Check each field in the object
  for (const [key, value] of Object.entries(obj)) {
    // Check for injection attempts in keys
    if (!/^[a-zA-Z0-9_\-.]+$/.test(key)) {
      errors.push(`Invalid character in parameter name: ${key}`);
    }
    
    // For string values, check for possible injection patterns
    if (typeof value === 'string') {
      if (value.includes('<script>') || value.includes('javascript:') || value.includes('data:text/html')) {
        errors.push(`Suspicious script content detected in parameter: ${key}`);
      }
    }
    
    // Recursively check nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      validateObject(value, errors);
    }
  }
};
