-- Bypass email confirmation for admin email
-- This allows immediate access while we set up proper SMTP

UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'rick@giantpanda.com';

-- Also ensure the user is marked as verified
UPDATE auth.users 
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  '{"email_verified": true}'::jsonb
WHERE email = 'rick@giantpanda.com';