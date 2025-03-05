
// Validate input parameters
export const validateInput = (path: string, data: any): { valid: boolean; errors?: string[] } => {
  if (!path) {
    return { valid: false, errors: ['Missing required parameter: path'] };
  }
  
  // Validate specific endpoints
  if (path === 'private/AddOrder') {
    const requiredFields = ['pair', 'type', 'ordertype', 'volume'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return { 
        valid: false, 
        errors: [`Missing required order parameters: ${missingFields.join(', ')}`] 
      };
    }
    
    // Validate order type
    if (!['buy', 'sell'].includes(data.type)) {
      return { valid: false, errors: ['Invalid order type. Must be "buy" or "sell"'] };
    }
    
    // Validate ordertype
    if (!['market', 'limit'].includes(data.ordertype)) {
      return { valid: false, errors: ['Invalid ordertype. Must be "market" or "limit"'] };
    }
    
    // For limit orders, price is required
    if (data.ordertype === 'limit' && !data.price) {
      return { valid: false, errors: ['Price is required for limit orders'] };
    }
  }
  
  return { valid: true };
};
