
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-documents', 'expense-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload expense documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expense-documents');

CREATE POLICY "Authenticated users can view expense documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'expense-documents');

CREATE POLICY "Authenticated users can delete expense documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expense-documents');
