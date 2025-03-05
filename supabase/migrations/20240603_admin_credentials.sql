
-- Create admin user if it doesn't exist already
DO $$
DECLARE
  user_exists BOOLEAN;
  admin_id UUID;
BEGIN
  -- Check if the admin user already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@tradingplatform.com'
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Insert admin user into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@tradingplatform.com',
      crypt('AdminTradingPlatform123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin User"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;
    
    -- Insert Kraken API credentials for the admin user
    INSERT INTO public.api_credentials (
      user_id, 
      exchange, 
      api_key, 
      api_secret
    ) 
    VALUES (
      admin_id, 
      'kraken', 
      'NiQT/gRqw/QtGhd6LHBzHpwxSf8JCPRZzQXwvD0o7uF3Di1yoKZpJZZd', 
      'V1dnf/0awQyqQKahMQYyPrN6Y8rXgQqk5mFCTHLzOgpgoo9/iJIZYSz6YJbKnTrQ6CWbcJf6ixZVLY7Wf45F7g=='
    );
    
    RAISE NOTICE 'Admin user created with ID: %', admin_id;
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END
$$;
