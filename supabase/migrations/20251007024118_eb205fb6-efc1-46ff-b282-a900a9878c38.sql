-- Add whatsapp column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS whatsapp text;