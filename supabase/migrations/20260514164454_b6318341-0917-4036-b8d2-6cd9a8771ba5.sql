DELETE FROM public.expenses
WHERE id IN ('9b70cc18-618d-4915-8acf-6888b0ef0540','c664511c-7cbd-4992-bff4-3e86ffc52251');

UPDATE public.cash_registers
SET current_balance = current_balance + 100,
    updated_at = now()
WHERE id = 'a0d75276-7b4c-4c46-b383-d008bde2f62a';