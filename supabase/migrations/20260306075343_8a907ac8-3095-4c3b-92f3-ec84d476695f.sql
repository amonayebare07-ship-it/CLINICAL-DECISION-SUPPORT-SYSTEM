
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, student_id, faculty, gender, course)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'faculty',
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'course'
  );

  _role := COALESCE(NEW.raw_user_meta_data->>'signup_role', 'student');
  
  IF _role IN ('student', 'staff') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role::app_role);
  END IF;

  RETURN NEW;
END;
$function$;
