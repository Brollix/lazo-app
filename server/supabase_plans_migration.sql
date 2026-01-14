-- Migration: Add Subscription Plans Table
-- This migration creates a table to manage subscription plans dynamically

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type TEXT UNIQUE NOT NULL CHECK (plan_type IN ('free', 'pro', 'ultra')),
  name TEXT NOT NULL,
  description TEXT,
  price_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_ars DECIMAL(10, 2), -- NULL means calculate dynamically from USD
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  credits_initial INTEGER NOT NULL DEFAULT 0,
  credits_monthly INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for subscription_plans
-- Anyone can view active plans
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Only authenticated users can view all plans (for admin)
DROP POLICY IF EXISTS "Authenticated users can view all plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view all plans" ON public.subscription_plans
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Insert initial plan data
INSERT INTO public.subscription_plans (
  plan_type, name, description, price_usd, price_ars, 
  features, credits_initial, credits_monthly, is_active, display_order
) VALUES 
(
  'free',
  'Plan Gratis',
  'Perfecto para comenzar',
  0,
  0,
  '[
    "3 créditos de audio iniciales",
    "Transcripción Whisper-v3 (Groq)",
    "Análisis con Claude Sonnet 3.5",
    "Ideal para probar la plataforma",
    "Sin tarjeta de crédito"
  ]'::jsonb,
  3,
  0,
  true,
  1
),
(
  'pro',
  'Plan Pro',
  'Para profesionales activos',
  10,
  50, -- Precio de prueba actual
  '[
    "Grabaciones ilimitadas",
    "Transcripción Whisper-v3 (Groq)",
    "Análisis con Claude Sonnet 3.5",
    "Asistente IA 24/7 integrado",
    "Soporte prioritario por WhatsApp",
    "Exportación a PDF/Word"
  ]'::jsonb,
  50,
  50,
  true,
  2
),
(
  'ultra',
  'Plan Ultra',
  'Funcionalidades avanzadas en desarrollo',
  30,
  NULL, -- Se calculará dinámicamente
  '[
    "Todo lo de Pro",
    "Transcripción Deepgram Nova-2",
    "Precisión máxima (99.9%)",
    "Diarización avanzada (Speaker ID)",
    "Análisis multi-lenguaje nativo",
    "Respaldos cifrados automáticos"
  ]'::jsonb,
  100,
  100,
  false, -- Desactivado por ahora
  3
)
ON CONFLICT (plan_type) DO NOTHING;

-- 5. Add plan_id column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id);

-- 6. Populate plan_id for existing subscriptions
UPDATE public.subscriptions s
SET plan_id = sp.id
FROM public.subscription_plans sp
WHERE s.plan_type = sp.plan_type
  AND s.plan_id IS NULL;

-- 7. Create index for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_type ON public.subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trigger_update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Migration complete
