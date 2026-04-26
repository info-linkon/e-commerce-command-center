INSERT INTO public.user_roles (user_id, role)
SELECT '78e89c4c-fa65-47a3-bacd-c1e3180decd5'::uuid, 'owner'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '78e89c4c-fa65-47a3-bacd-c1e3180decd5'::uuid AND role = 'owner'
);