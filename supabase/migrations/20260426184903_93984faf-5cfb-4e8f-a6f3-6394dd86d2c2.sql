
UPDATE public.orders
SET cash_register_id = NULL
WHERE cash_register_id IN (
  '099a3977-13a6-4616-b703-8bf089946306',
  'db3e1c7f-6010-41af-b026-594bd1a2d172'
);

DELETE FROM public.cash_registers
WHERE id IN (
  '099a3977-13a6-4616-b703-8bf089946306',
  'db3e1c7f-6010-41af-b026-594bd1a2d172'
);
