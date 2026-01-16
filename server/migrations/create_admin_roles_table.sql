-- Migration: Create Admin Roles Table
-- This migration creates a flexible admin roles system to replace hardcoded admin UUIDs

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);

-- Add comments
COMMENT ON TABLE public.admin_roles IS 'Stores admin users and their permission levels';
COMMENT ON COLUMN public.admin_roles.user_id IS 'Reference to the user who has admin access';
COMMENT ON COLUMN public.admin_roles.role IS 'Admin permission level: super_admin (full access), admin (dashboard access), moderator (read-only)';
COMMENT ON COLUMN public.admin_roles.created_by IS 'User who granted this admin role (nullable for initial setup)';

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view the admin_roles table
CREATE POLICY "Admins can view admin roles" ON public.admin_roles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles ar 
            WHERE ar.user_id = auth.uid()
        )
    );

-- Only super_admins can insert new admin roles
CREATE POLICY "Super admins can add admin roles" ON public.admin_roles
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_roles ar 
            WHERE ar.user_id = auth.uid() 
            AND ar.role = 'super_admin'
        )
    );

-- Only super_admins can delete admin roles
CREATE POLICY "Super admins can remove admin roles" ON public.admin_roles
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles ar 
            WHERE ar.user_id = auth.uid() 
            AND ar.role = 'super_admin'
        )
    );

-- Only super_admins can update admin roles
CREATE POLICY "Super admins can update admin roles" ON public.admin_roles
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles ar 
            WHERE ar.user_id = auth.uid() 
            AND ar.role = 'super_admin'
        )
    );

-- Insert initial super admin (replace with your actual user UUID)
-- Note: This will be the first admin, so created_by references itself
INSERT INTO public.admin_roles (user_id, role, created_by)
VALUES ('a9860376-392e-439a-9a70-8d9c513d1dce', 'super_admin', NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Update announcements table RLS policy to use admin_roles table
-- First, drop the old policy
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

-- Create new policy that checks admin_roles table
CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles ar 
            WHERE ar.user_id = auth.uid()
        )
    );
