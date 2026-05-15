INSERT INTO public.expenses (description, amount, payment_source, cash_register_id) VALUES
  ('משלוח להזמנה #283', 100, 'cash_register', 'a0d75276-7b4c-4c46-b383-d008bde2f62a'),
  ('משלוח להזמנה #294', 50,  'cash_register', 'a0d75276-7b4c-4c46-b383-d008bde2f62a');

UPDATE public.cash_registers
SET current_balance = current_balance - 150,
    updated_at = now()
WHERE id = 'a0d75276-7b4c-4c46-b383-d008bde2f62a';