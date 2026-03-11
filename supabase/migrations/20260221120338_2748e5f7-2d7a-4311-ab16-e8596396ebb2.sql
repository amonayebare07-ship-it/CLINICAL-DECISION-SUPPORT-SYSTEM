
-- Create storage bucket for referral documents
INSERT INTO storage.buckets (id, name, public) VALUES ('referral-documents', 'referral-documents', false);

-- Storage policies
CREATE POLICY "Students can upload own referral docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'referral-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view own referral docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'referral-documents' AND (
  auth.uid()::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(), 'staff')
  OR has_role(auth.uid(), 'admin')
));

CREATE POLICY "Staff can view all referral docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'referral-documents' AND (
  has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin')
));

-- Table to track referral document uploads
CREATE TABLE public.referral_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own referral documents"
ON public.referral_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Students can view own referral documents"
ON public.referral_documents FOR SELECT TO authenticated
USING (auth.uid() = patient_id);

CREATE POLICY "Staff can view all referral documents"
ON public.referral_documents FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));
