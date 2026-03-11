
ALTER TABLE public.medical_records
ADD COLUMN is_referred boolean NOT NULL DEFAULT false,
ADD COLUMN referral_hospital text,
ADD COLUMN referral_reason text,
ADD COLUMN referral_notes text;
