-- Add internal_code column to products table
ALTER TABLE public.products
ADD COLUMN internal_code TEXT;

-- Update print_sector in categories to allow NULL for "nenhum"
COMMENT ON COLUMN public.categories.print_sector IS 'Print sector for category. NULL means no printing required';

-- Update print_sector in products to allow NULL for "nenhum"
COMMENT ON COLUMN public.products.print_sector IS 'Print sector for product. If set, overrides category print_sector. NULL means no printing required';