
-- Enable RLS on the api_credentials table if not already enabled
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only view their own API credentials
CREATE POLICY "Users can view their own credentials" 
ON public.api_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy so users can insert their own API credentials
CREATE POLICY "Users can insert their own credentials" 
ON public.api_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy so users can update their own API credentials
CREATE POLICY "Users can update their own credentials" 
ON public.api_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy so users can delete their own API credentials
CREATE POLICY "Users can delete their own credentials" 
ON public.api_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add constraints to ensure uniqueness
ALTER TABLE public.api_credentials ADD CONSTRAINT user_exchange_unique UNIQUE (user_id, exchange);

-- Add index for faster lookups
CREATE INDEX idx_api_credentials_user_id ON public.api_credentials (user_id);
