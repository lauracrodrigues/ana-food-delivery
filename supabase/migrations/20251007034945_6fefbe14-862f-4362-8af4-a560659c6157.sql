-- Fix RLS policies for company-logos bucket
DROP POLICY IF EXISTS "Company admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Company admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Company admins can delete logos" ON storage.objects;

-- Create corrected RLS policies for company logos bucket
CREATE POLICY "Anyone can view company logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their company logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their company logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated'
);