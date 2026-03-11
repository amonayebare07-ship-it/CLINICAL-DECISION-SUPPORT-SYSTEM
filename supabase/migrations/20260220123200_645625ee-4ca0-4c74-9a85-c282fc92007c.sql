
-- Table to track dispensed medications
CREATE TABLE public.dispensed_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medication_inventory(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  quantity_dispensed INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dispensed_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage dispensed medications"
ON public.dispensed_medications FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own dispensed medications"
ON public.dispensed_medications FOR SELECT
USING (auth.uid() = patient_id);
