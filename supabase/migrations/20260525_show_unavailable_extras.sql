-- v1.0.0 — Toggle "mostrar indisponíveis no cardápio"
-- Default true mantém comportamento atual (mostra com opacity + badge dias)
-- Lojista pode desligar = some totalmente da tela

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS show_unavailable_extras boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.store_settings.show_unavailable_extras IS
  'true=mostra extras indisponíveis com badge dias / false=esconde totalmente';
