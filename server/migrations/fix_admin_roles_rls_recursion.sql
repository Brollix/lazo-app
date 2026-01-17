-- Migration: Fix Admin Roles RLS Infinite Recursion
-- This migration fixes the infinite recursion issue in admin_roles RLS policies
-- by allowing users to check their own admin status without triggering recursion

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can add admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can remove admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can update admin roles" ON public.admin_roles;

-- New policy: Allow any authenticated user to view their own admin role
-- This breaks the recursion because it doesn't query admin_roles again
DROP POLICY IF EXISTS "Users can view own admin role" ON public.admin_roles;
CREATE POLICY "Users can view own admin role" ON public.admin_roles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- New policy: Allow super_admins to view all admin roles
-- This uses a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Policy for super admins to view all roles
DROP POLICY IF EXISTS "Super admins can view all admin roles" ON public.admin_roles;
CREATE POLICY "Super admins can view all admin roles" ON public.admin_roles
    FOR SELECT 
    USING (public.is_super_admin());

-- Policy for super admins to insert new admin roles
DROP POLICY IF EXISTS "Super admins can add admin roles" ON public.admin_roles;
CREATE POLICY "Super admins can add admin roles" ON public.admin_roles
    FOR INSERT 
    WITH CHECK (public.is_super_admin());

-- Policy for super admins to delete admin roles
DROP POLICY IF EXISTS "Super admins can remove admin roles" ON public.admin_roles;
CREATE POLICY "Super admins can remove admin roles" ON public.admin_roles
    FOR DELETE 
    USING (public.is_super_admin());

-- Policy for super admins to update admin roles
DROP POLICY IF EXISTS "Super admins can update admin roles" ON public.admin_roles;
CREATE POLICY "Super admins can update admin roles" ON public.admin_roles
    FOR UPDATE 
    USING (public.is_super_admin());
