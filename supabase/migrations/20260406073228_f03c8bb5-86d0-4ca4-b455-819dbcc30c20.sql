
-- Allow anyone to upload to product-images bucket (categories folder)
CREATE POLICY "Anyone can upload to product-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anyone can update product-images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-images');
