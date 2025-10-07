-- Add geolocation and logo fields to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'zones' CHECK (delivery_mode IN ('zones', 'radius'));

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for company logos bucket
CREATE POLICY "Company admins can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR has_company_role(auth.uid(), c.id, 'company_admin'))
    )
  )
);

CREATE POLICY "Company logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Company admins can update logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR has_company_role(auth.uid(), c.id, 'company_admin'))
    )
  )
);

CREATE POLICY "Company admins can delete logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR has_company_role(auth.uid(), c.id, 'company_admin'))
    )
  )
);