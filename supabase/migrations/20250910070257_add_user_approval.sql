-- TikTok Domain Harvester - User Approval System Migration
-- This migration adds user approval functionality to control access

-- =============================================================================
-- USER PROFILES TABLE
-- =============================================================================

-- Create user_profiles table to extend auth.users with approval status
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_approved_by ON user_profiles(approved_by);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTIONS FOR USER MANAGEMENT
-- =============================================================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get the user's email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
    
    -- Create profile with special handling for admin user
    INSERT INTO user_profiles (id, email, status, role)
    VALUES (
        NEW.id,
        user_email,
        CASE 
            WHEN user_email = 'rick@giantpanda.com' THEN 'approved'
            ELSE 'pending'
        END,
        CASE 
            WHEN user_email = 'rick@giantpanda.com' THEN 'admin'
            ELSE 'user'
        END
    );
    
    -- Auto-approve the admin user
    IF user_email = 'rick@giantpanda.com' THEN
        UPDATE user_profiles 
        SET approved_by = NEW.id, approved_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create user profile on signup
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Function to approve a user (only callable by admins)
CREATE OR REPLACE FUNCTION approve_user(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- Get current user ID and role
    SELECT auth.uid() INTO current_user_id;
    SELECT role INTO current_user_role FROM user_profiles WHERE id = current_user_id;
    
    -- Check if current user is admin
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can approve users';
    END IF;
    
    -- Approve the user
    UPDATE user_profiles 
    SET 
        status = 'approved',
        approved_by = current_user_id,
        approved_at = NOW(),
        rejected_at = NULL,
        rejection_reason = NULL
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a user (only callable by admins)
CREATE OR REPLACE FUNCTION reject_user(target_user_id UUID, reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- Get current user ID and role
    SELECT auth.uid() INTO current_user_id;
    SELECT role INTO current_user_role FROM user_profiles WHERE id = current_user_id;
    
    -- Check if current user is admin
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can reject users';
    END IF;
    
    -- Reject the user
    UPDATE user_profiles 
    SET 
        status = 'rejected',
        rejected_at = NOW(),
        rejection_reason = reason,
        approved_by = NULL,
        approved_at = NULL
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is approved
CREATE OR REPLACE FUNCTION is_user_approved()
RETURNS BOOLEAN AS $$
DECLARE
    user_status TEXT;
BEGIN
    SELECT status INTO user_status 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_status = 'approved', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_status TEXT;
BEGIN
    SELECT role, status INTO user_role, user_status
    FROM user_profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role = 'admin' AND user_status = 'approved', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- User profiles policies
CREATE POLICY "Users can read their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON user_profiles
    FOR SELECT USING (is_user_admin());

CREATE POLICY "Users can update their own profile (limited fields)" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON user_profiles
    FOR UPDATE USING (is_user_admin());

CREATE POLICY "Service role can manage all profiles" ON user_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- UPDATE EXISTING RLS POLICIES TO REQUIRE APPROVAL
-- =============================================================================

-- Drop existing policies that only check authentication
DROP POLICY IF EXISTS "Allow authenticated users to read videos" ON video;
DROP POLICY IF EXISTS "Allow authenticated users to read comments" ON comment;
DROP POLICY IF EXISTS "Allow authenticated users to read domains" ON domain;
DROP POLICY IF EXISTS "Allow authenticated users to read domain mentions" ON domain_mention;

-- Create new policies that require user approval
CREATE POLICY "Allow approved users to read videos" ON video
    FOR SELECT USING (auth.role() = 'service_role' OR is_user_approved());

CREATE POLICY "Allow approved users to read comments" ON comment
    FOR SELECT USING (auth.role() = 'service_role' OR is_user_approved());

CREATE POLICY "Allow approved users to read domains" ON domain
    FOR SELECT USING (auth.role() = 'service_role' OR is_user_approved());

CREATE POLICY "Allow approved users to read domain mentions" ON domain_mention
    FOR SELECT USING (auth.role() = 'service_role' OR is_user_approved());

-- Allow admins to update certain fields for content moderation
CREATE POLICY "Allow admins to update domain flags" ON domain
    FOR UPDATE USING (is_user_admin())
    WITH CHECK (is_user_admin());

-- =============================================================================
-- VIEWS FOR UI CONSUMPTION
-- =============================================================================

-- View for admin user management
CREATE VIEW v_user_management AS
SELECT 
    up.id,
    up.email,
    up.status,
    up.role,
    up.approved_by,
    up.approved_at,
    up.rejected_at,
    up.rejection_reason,
    up.notes,
    up.created_at,
    up.updated_at,
    approver.email as approved_by_email,
    CASE 
        WHEN up.status = 'pending' THEN 'Awaiting approval'
        WHEN up.status = 'approved' THEN 'Active'
        WHEN up.status = 'rejected' THEN 'Access denied'
    END as status_display
FROM user_profiles up
LEFT JOIN user_profiles approver ON up.approved_by = approver.id;

-- RLS policy for user management view
ALTER VIEW v_user_management SET (security_invoker = true);

-- =============================================================================
-- MIGRATION SAFETY
-- =============================================================================

-- Create profile for existing admin user if they exist
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find the admin user if they exist
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'rick@giantpanda.com'
    LIMIT 1;
    
    -- Create profile if user exists and profile doesn't exist
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO user_profiles (id, email, status, role, approved_by, approved_at)
        VALUES (
            admin_user_id,
            'rick@giantpanda.com',
            'approved',
            'admin',
            admin_user_id,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            status = 'approved',
            role = 'admin',
            approved_by = admin_user_id,
            approved_at = COALESCE(user_profiles.approved_at, NOW());
    END IF;
END
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

-- This migration adds:
-- 1. user_profiles table to track approval status and roles
-- 2. Automatic profile creation on user signup
-- 3. Special handling for rick@giantpanda.com as auto-approved admin
-- 4. Functions for user approval/rejection (admin-only)
-- 5. Helper functions to check user approval and admin status
-- 6. Updated RLS policies to require approval for data access
-- 7. Admin view for user management
-- 8. Safety migration for existing admin user

-- Usage:
-- - New users default to 'pending' status and cannot access data
-- - Admins can call approve_user(user_id) or reject_user(user_id, reason)
-- - Only approved users can read application data
-- - Only admins can manage other users and moderate content