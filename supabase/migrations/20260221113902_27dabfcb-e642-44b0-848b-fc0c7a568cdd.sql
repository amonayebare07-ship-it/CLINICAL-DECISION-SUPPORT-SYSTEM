
-- Allow staff/admin to update any profile
CREATE POLICY "Staff can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow staff/admin to delete profiles
CREATE POLICY "Staff can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
