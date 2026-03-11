
-- Patient allergies & chronic conditions table
CREATE TABLE public.patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  allergy_type text NOT NULL DEFAULT 'medication',
  name text NOT NULL,
  severity text NOT NULL DEFAULT 'mild',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;

-- Staff can manage allergies
CREATE POLICY "Staff can manage patient allergies"
ON public.patient_allergies FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Students can view own allergies
CREATE POLICY "Students can view own allergies"
ON public.patient_allergies FOR SELECT
TO authenticated
USING (auth.uid() = patient_id);

-- Patient chronic conditions table
CREATE TABLE public.patient_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  condition_name text NOT NULL,
  diagnosed_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.patient_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage patient conditions"
ON public.patient_conditions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own conditions"
ON public.patient_conditions FOR SELECT
TO authenticated
USING (auth.uid() = patient_id);
