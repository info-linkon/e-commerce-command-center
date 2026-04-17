-- Enable admin-level visibility and management of profiles/user_roles.
-- Also grant the primary admin user (karam) the 'admin' role if they exist.

-- Profiles: admins can view and update any profile
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles: admins can view and manage any role
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Ensure karam has the admin role (idempotent).
DO $$
DECLARE
  karam_id uuid;
BEGIN
  SELECT id INTO karam_id FROM auth.users WHERE email = 'karam@elwejha.app' LIMIT 1;
  IF karam_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (karam_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
