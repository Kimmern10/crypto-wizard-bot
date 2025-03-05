
# Kraken API Proxy

This Edge Function serves as a secure proxy for the Kraken cryptocurrency exchange API.

## Architecture

The function is structured into several modules:

- `index.ts` - Entry point that serves the HTTP function
- `handlers/` - Request handlers for different endpoints
- `services/` - Services for interacting with external systems (Kraken API, Supabase)
- `utils/` - Utility functions for validation, signature generation, etc.
- `config/` - Configuration constants

## Security Features

- Rate limiting by IP address and user ID
- Nonce validation to prevent replay attacks
- Request validation
- Signature generation for authentication
- Error handling and proper status codes

## Deployment

This function is automatically deployed when you push changes to the repository.

## Usage

Send POST requests to the function endpoint with the following JSON structure:

```json
{
  "path": "public/Time", // Kraken API endpoint
  "method": "POST", // HTTP method
  "isPrivate": false, // Whether endpoint requires authentication
  "data": {}, // Request data
  "userId": "user-id" // Required for private endpoints
}
```
