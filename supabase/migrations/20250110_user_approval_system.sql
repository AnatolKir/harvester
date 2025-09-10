-- User approval system for magic link authentication
-- Tracks user status, approval, and manages access control

-- Create user_profiles table to track approval status
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_status ON public.user_profiles(status);

-- Create RLS policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Only admins can update profiles
CREATE POLICY "Admins can update profiles" ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'rick@highlyeducated.com' THEN 'admin'
      ELSE 'user'
    END,
    CASE 
      WHEN NEW.email = 'rick@highlyeducated.com' THEN 'approved'
      ELSE 'pending'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create existing user profiles (for your current user)
INSERT INTO public.user_profiles (user_id, email, role, status)
SELECT 
  id,
  email,
  'admin',
  'approved'
FROM auth.users
WHERE email = 'rick@highlyeducated.com'
ON CONFLICT (email) DO UPDATE
SET role = 'admin', status = 'approved';

-- Function to approve user (admin only)
CREATE OR REPLACE FUNCTION public.approve_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND status = 'approved'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;
  
  -- Approve the user
  UPDATE public.user_profiles
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject user (admin only)
CREATE OR REPLACE FUNCTION public.reject_user(target_user_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND status = 'approved'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can reject users';
  END IF;
  
  -- Reject the user
  UPDATE public.user_profiles
  SET 
    status = 'rejected',
    rejected_reason = reason,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for admin dashboard
CREATE OR REPLACE VIEW public.v_pending_users AS
SELECT 
  up.id,
  up.user_id,
  up.email,
  up.full_name,
  up.created_at,
  au.last_sign_in_at
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
WHERE up.status = 'pending'
ORDER BY up.created_at DESC;

-- Grant necessary permissions
GRANT SELECT ON public.v_pending_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user TO authenticated;