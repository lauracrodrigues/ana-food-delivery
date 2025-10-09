-- Add print_sector column to categories table
ALTER TABLE public.categories 
ADD COLUMN print_sector text;