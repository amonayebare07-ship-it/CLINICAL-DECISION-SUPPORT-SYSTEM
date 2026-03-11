
-- Allow staff to manage inventory (add, update, delete), not just admin
DROP POLICY IF EXISTS "Admin can manage inventory" ON public.medication_inventory;
CREATE POLICY "Staff and admin can manage inventory"
ON public.medication_inventory
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Drop the now-redundant staff view policy since the ALL policy covers SELECT
DROP POLICY IF EXISTS "Staff can view inventory" ON public.medication_inventory;
