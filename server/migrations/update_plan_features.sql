-- Migration: Update Plan Features to Match Pricing Documentation
-- This migration updates the features array for each plan to accurately reflect
-- the differences between Free, Pro, and Ultra plans as documented in COSTS_AND_PRICING.md

-- Update Free Plan features
UPDATE subscription_plans
SET features = to_jsonb(ARRAY[
  '3 sesiones mensuales',
  'Transcripción con Llama 3.3 (Groq)',
  'Notas SOAP estándar',
  'Sin memoria histórica',
  'Sin diarización de hablantes'
])
WHERE plan_type = 'free';

-- Update Pro Plan features  
UPDATE subscription_plans
SET features = to_jsonb(ARRAY[
  '100 sesiones mensuales',
  'Transcripción rápida con Whisper v3 (Groq)',
  'Procesamiento con Llama 3.3 70B',
  'Notas SOAP estándar',
  'Sin diarización de hablantes',
  'Sin memoria histórica'
])
WHERE plan_type = 'pro';

-- Update Ultra Plan features
UPDATE subscription_plans
SET features = to_jsonb(ARRAY[
  '100 sesiones estándar + 20 sesiones premium',
  'Transcripción premium con Deepgram Nova-2 Medical',
  'Diarización de hablantes (identifica quién habla)',
  'Procesamiento con Claude 3.5 Sonnet (AWS)',
  'Memoria histórica del paciente (RAG)',
  'Análisis profundo y detección de patrones',
  'Generación de reportes para obras sociales'
])
WHERE plan_type = 'ultra';

-- Verify the updates
SELECT plan_type, name, features 
FROM subscription_plans 
ORDER BY display_order;
