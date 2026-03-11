
-- Add foreign key from appointments.patient_id to profiles.user_id (not auth.users)
-- This allows PostgREST to join appointments with profiles
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_id_profiles_fkey
  FOREIGN KEY (patient_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key from appointments.staff_id to profiles.user_id
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_staff_id_profiles_fkey
  FOREIGN KEY (staff_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
