-- Add available_weekdays column to products table
ALTER TABLE public.products
ADD COLUMN available_weekdays TEXT[] DEFAULT ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

-- Update existing products to have all weekdays available
UPDATE public.products
SET available_weekdays = ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
WHERE available_weekdays IS NULL;

-- Create GIN index for better query performance when filtering by weekday
CREATE INDEX idx_products_available_weekdays ON public.products USING GIN (available_weekdays);

-- Add comment to column
COMMENT ON COLUMN public.products.available_weekdays IS 'Days of the week when the product is available for sale';