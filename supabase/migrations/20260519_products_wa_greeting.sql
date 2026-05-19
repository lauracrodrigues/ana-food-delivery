-- v1.0.0 — Produtos selecionados pra saudação WhatsApp
-- Admin marca quais produtos aparecem na 1ª mensagem do bot
-- Default OFF: welcome limpo até admin configurar

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_in_whatsapp_greeting boolean NOT NULL DEFAULT false;

-- Migration de cortesia: produtos já marcados como featured → mostrar no WA
-- (admin não precisa partir do zero)
UPDATE products
  SET show_in_whatsapp_greeting = true
WHERE is_featured = true AND on_off = true;

CREATE INDEX IF NOT EXISTS idx_products_wa_greeting
  ON products (company_id, show_in_whatsapp_greeting)
  WHERE show_in_whatsapp_greeting = true AND on_off = true;

COMMENT ON COLUMN products.show_in_whatsapp_greeting IS
  'Se true, produto aparece na saudação inicial do bot WhatsApp.
   Recomendado 3-8 produtos por empresa pra UX limpa.';
