-- Migration: Add bot timing configuration columns to store_settings
-- Created: 2026-05-06
-- Purpose: Allow per-company configuration of typing debounce, message debounce, followup and cancel timings

-- Add timing columns to store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS typing_debounce_ms INTEGER DEFAULT 3000 CHECK (typing_debounce_ms >= 1000 AND typing_debounce_ms <= 10000),
  ADD COLUMN IF NOT EXISTS followup_minutes INTEGER DEFAULT 10 CHECK (followup_minutes >= 5 AND followup_minutes <= 60),
  ADD COLUMN IF NOT EXISTS cancel_minutes INTEGER DEFAULT 20 CHECK (cancel_minutes >= 10 AND cancel_minutes <= 120);

-- Add comment explaining the columns
COMMENT ON COLUMN public.store_settings.typing_debounce_ms IS 'Tempo em ms que aguarda antes de mostrar "digitando" no WhatsApp (1000-10000)';
COMMENT ON COLUMN public.store_settings.followup_minutes IS 'Tempo em minutos antes de enviar lembrete de recuperação (5-60)';
COMMENT ON COLUMN public.store_settings.cancel_minutes IS 'Tempo em minutos antes de cancelar pedido por inatividade (10-120)';
