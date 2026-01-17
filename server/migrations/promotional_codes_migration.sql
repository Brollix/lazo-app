-- Migration: Promotional Codes System
-- This migration creates tables and policies for managing promotional discount codes
-- Codes are 4 uppercase characters and provide percentage discounts for specified months

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table: promotional_codes
-- Stores promotional discount codes created by admins
CREATE TABLE IF NOT EXISTS public.promotional_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 1 AND discount_percentage <= 100),
    duration_months INTEGER NOT NULL CHECK (duration_months >= 1),
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER DEFAULT NULL, -- NULL means unlimited uses
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT code_format CHECK (code ~ '^[A-Z]{4}$')
);

-- Add comment
COMMENT ON TABLE public.promotional_codes IS 'Promotional discount codes that can be applied to subscriptions';
COMMENT ON COLUMN public.promotional_codes.code IS 'Exactly 4 uppercase characters';
COMMENT ON COLUMN public.promotional_codes.discount_percentage IS 'Percentage discount (1-100)';
COMMENT ON COLUMN public.promotional_codes.duration_months IS 'Number of months the discount applies';
COMMENT ON COLUMN public.promotional_codes.max_uses IS 'Maximum number of times code can be used (NULL = unlimited)';

-- Table: user_promo_codes
-- Tracks which users have used which promotional codes
CREATE TABLE IF NOT EXISTS public.user_promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    promo_code_id UUID NOT NULL REFERENCES public.promotional_codes(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    subscription_id TEXT, -- MercadoPago subscription ID
    months_remaining INTEGER NOT NULL,
    original_price DECIMAL(10, 2) NOT NULL,
    discounted_price DECIMAL(10, 2) NOT NULL,
    plan_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, promo_code_id) -- Each user can only use a promo code once
);

-- Add comment
COMMENT ON TABLE public.user_promo_codes IS 'Tracks promotional code usage by users';
COMMENT ON COLUMN public.user_promo_codes.months_remaining IS 'Number of discount months remaining for this user';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_promotional_codes_code ON public.promotional_codes(code);
CREATE INDEX IF NOT EXISTS idx_promotional_codes_is_active ON public.promotional_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_user_id ON public.user_promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_promo_code_id ON public.user_promo_codes(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_subscription_id ON public.user_promo_codes(subscription_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp for promotional_codes
CREATE OR REPLACE FUNCTION update_promotional_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE TRIGGER trigger_update_promotional_codes_updated_at
    BEFORE UPDATE ON public.promotional_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_promotional_codes_updated_at();

-- Trigger: Update updated_at timestamp for user_promo_codes
CREATE OR REPLACE FUNCTION update_user_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE TRIGGER trigger_update_user_promo_codes_updated_at
    BEFORE UPDATE ON public.user_promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_promo_codes_updated_at();

-- Trigger: Increment current_uses when a promo code is applied
CREATE OR REPLACE FUNCTION increment_promo_code_uses()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.promotional_codes
    SET current_uses = current_uses + 1
    WHERE id = NEW.promo_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE TRIGGER trigger_increment_promo_code_uses
    AFTER INSERT ON public.user_promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION increment_promo_code_uses();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Validate a promotional code
CREATE OR REPLACE FUNCTION validate_promo_code(
    p_code TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    v_promo_code RECORD;
    v_already_used BOOLEAN;
    result json;
BEGIN
    -- Normalize code to uppercase
    p_code := UPPER(p_code);
    
    -- Get promo code details
    SELECT * INTO v_promo_code
    FROM public.promotional_codes
    WHERE code = p_code;
    
    -- Check if code exists
    IF v_promo_code IS NULL THEN
        result := json_build_object(
            'valid', false,
            'error', 'Código promocional no encontrado'
        );
        RETURN result;
    END IF;
    
    -- Check if code is active
    IF NOT v_promo_code.is_active THEN
        result := json_build_object(
            'valid', false,
            'error', 'Código promocional inactivo'
        );
        RETURN result;
    END IF;
    
    -- Check if code has expired
    IF v_promo_code.expires_at IS NOT NULL AND v_promo_code.expires_at < NOW() THEN
        result := json_build_object(
            'valid', false,
            'error', 'Código promocional expirado'
        );
        RETURN result;
    END IF;
    
    -- Check if code has reached max uses
    IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
        result := json_build_object(
            'valid', false,
            'error', 'Código promocional agotado'
        );
        RETURN result;
    END IF;
    
    -- Check if user has already used this code (if user_id provided)
    IF p_user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.user_promo_codes
            WHERE user_id = p_user_id AND promo_code_id = v_promo_code.id
        ) INTO v_already_used;
        
        IF v_already_used THEN
            result := json_build_object(
                'valid', false,
                'error', 'Ya has usado este código promocional'
            );
            RETURN result;
        END IF;
    END IF;
    
    -- Code is valid
    result := json_build_object(
        'valid', true,
        'promo_code', json_build_object(
            'id', v_promo_code.id,
            'code', v_promo_code.code,
            'discount_percentage', v_promo_code.discount_percentage,
            'duration_months', v_promo_code.duration_months
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Function: Apply a promotional code to a user's subscription
CREATE OR REPLACE FUNCTION apply_promo_code(
    p_user_id UUID,
    p_code TEXT,
    p_subscription_id TEXT,
    p_plan_type TEXT,
    p_original_price DECIMAL
)
RETURNS json AS $$
DECLARE
    v_validation json;
    v_promo_code_id UUID;
    v_discount_percentage INTEGER;
    v_duration_months INTEGER;
    v_discounted_price DECIMAL;
    result json;
BEGIN
    -- Validate the promo code
    v_validation := validate_promo_code(p_code, p_user_id);
    
    IF NOT (v_validation->>'valid')::boolean THEN
        RETURN v_validation;
    END IF;
    
    -- Extract promo code details
    v_promo_code_id := (v_validation->'promo_code'->>'id')::UUID;
    v_discount_percentage := (v_validation->'promo_code'->>'discount_percentage')::INTEGER;
    v_duration_months := (v_validation->'promo_code'->>'duration_months')::INTEGER;
    
    -- Calculate discounted price
    v_discounted_price := p_original_price * (100 - v_discount_percentage) / 100.0;
    
    -- Create user_promo_codes entry
    INSERT INTO public.user_promo_codes (
        user_id,
        promo_code_id,
        subscription_id,
        months_remaining,
        original_price,
        discounted_price,
        plan_type
    ) VALUES (
        p_user_id,
        v_promo_code_id,
        p_subscription_id,
        v_duration_months,
        p_original_price,
        v_discounted_price,
        p_plan_type
    );
    
    result := json_build_object(
        'success', true,
        'discount_percentage', v_discount_percentage,
        'duration_months', v_duration_months,
        'original_price', p_original_price,
        'discounted_price', v_discounted_price
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Function: Decrement months_remaining for a user's promo code (called on monthly billing)
CREATE OR REPLACE FUNCTION decrement_promo_months(
    p_user_id UUID,
    p_subscription_id TEXT
)
RETURNS json AS $$
DECLARE
    v_months_remaining INTEGER;
    result json;
BEGIN
    -- Get current months_remaining
    SELECT months_remaining INTO v_months_remaining
    FROM public.user_promo_codes
    WHERE user_id = p_user_id 
      AND subscription_id = p_subscription_id
      AND months_remaining > 0
    LIMIT 1;
    
    IF v_months_remaining IS NULL THEN
        result := json_build_object(
            'has_discount', false,
            'months_remaining', 0
        );
        RETURN result;
    END IF;
    
    -- Decrement months_remaining
    UPDATE public.user_promo_codes
    SET months_remaining = months_remaining - 1
    WHERE user_id = p_user_id 
      AND subscription_id = p_subscription_id
      AND months_remaining > 0;
    
    result := json_build_object(
        'has_discount', true,
        'months_remaining', v_months_remaining - 1
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on promotional_codes
ALTER TABLE public.promotional_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything with promotional codes
CREATE POLICY "Admins can manage promotional codes" ON public.promotional_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_roles
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can view active promotional codes
CREATE POLICY "Users can view active promotional codes" ON public.promotional_codes
    FOR SELECT
    USING (is_active = true);

-- Enable RLS on user_promo_codes
ALTER TABLE public.user_promo_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own promo code usage
CREATE POLICY "Users can view own promo codes" ON public.user_promo_codes
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Admins can view all promo code usage
CREATE POLICY "Admins can view all promo codes" ON public.user_promo_codes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles
            WHERE user_id = auth.uid()
        )
    );

-- Policy: System can insert promo code usage (via service role or function)
CREATE POLICY "System can insert promo codes" ON public.user_promo_codes
    FOR INSERT
    WITH CHECK (true);

-- Policy: System can update promo code usage (via service role or function)
CREATE POLICY "System can update promo codes" ON public.user_promo_codes
    FOR UPDATE
    USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display all promotional code tables
SELECT 
    tablename,
    schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('promotional_codes', 'user_promo_codes')
ORDER BY tablename;

-- Migration complete
-- Promotional codes system is ready for use
