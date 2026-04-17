-- Atomic increment for cash register balances. Replaces the read-modify-write pattern
-- in useCreateOrder / useRecordPayment that can lose updates when two terminals race.
CREATE OR REPLACE FUNCTION public.increment_cash_register(
  reg_id uuid,
  delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.cash_registers
  SET current_balance = current_balance + delta
  WHERE id = reg_id
  RETURNING current_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Cash register % not found', reg_id;
  END IF;

  RETURN new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_cash_register(uuid, numeric) TO authenticated;
