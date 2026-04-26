-- 2. Assign 'owner' role to Tareq and Mohammed
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('fe95462c-def6-4bce-ae1f-339d9629ab56', 'owner'), -- Tareq
  ('3fc4f9e3-9f76-48c1-8c01-d6ae0b881f7b', 'owner')  -- Mohammed
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Remove 'admin' role from karam
DELETE FROM public.user_roles
WHERE user_id = '78e89c4c-fa65-47a3-bacd-c1e3180decd5' AND role = 'admin';

-- 4. Add HYP and Bank cash registers
INSERT INTO public.cash_registers (name, opening_balance, current_balance, is_active)
VALUES
  ('HYP (סליקת אשראי)', 0, 0, true),
  ('חשבון בנק', 0, 0, true);

-- 5. Tighten RLS on cash_registers: writes only by owners
DROP POLICY IF EXISTS "auth_all" ON public.cash_registers;

CREATE POLICY "cash_registers_select_authenticated"
  ON public.cash_registers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cash_registers_insert_owner"
  ON public.cash_registers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "cash_registers_update_owner"
  ON public.cash_registers
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "cash_registers_delete_owner"
  ON public.cash_registers
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));
