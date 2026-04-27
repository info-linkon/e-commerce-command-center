
-- Add a flag to mark registers that should only count cash from completed orders
ALTER TABLE public.cash_registers
ADD COLUMN IF NOT EXISTS requires_completed_order boolean NOT NULL DEFAULT false;

-- Mark the three deferred registers
UPDATE public.cash_registers
SET requires_completed_order = true
WHERE name IN ('קופה טארק', 'קופה כרם', 'קופה מחמד');

-- Trigger: when an order's status changes, adjust balances of "deferred" registers
-- based on cash payments attached to the order.
CREATE OR REPLACE FUNCTION public.sync_deferred_register_on_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
BEGIN
  -- Only react to actual status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Order moved INTO 'completed' -> add cash payments to deferred registers
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status <> 'completed') THEN
    FOR p IN
      SELECT pay.amount, pay.cash_register_id
      FROM public.payments pay
      JOIN public.cash_registers cr ON cr.id = pay.cash_register_id
      WHERE pay.order_id = NEW.id
        AND pay.payment_method = 'cash'
        AND cr.requires_completed_order = true
    LOOP
      UPDATE public.cash_registers
      SET current_balance = current_balance + p.amount,
          updated_at = now()
      WHERE id = p.cash_register_id;
    END LOOP;
  END IF;

  -- Order moved OUT of 'completed' -> reverse cash payments from deferred registers
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    FOR p IN
      SELECT pay.amount, pay.cash_register_id
      FROM public.payments pay
      JOIN public.cash_registers cr ON cr.id = pay.cash_register_id
      WHERE pay.order_id = NEW.id
        AND pay.payment_method = 'cash'
        AND cr.requires_completed_order = true
    LOOP
      UPDATE public.cash_registers
      SET current_balance = current_balance - p.amount,
          updated_at = now()
      WHERE id = p.cash_register_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_deferred_register_on_order_status ON public.orders;
CREATE TRIGGER trg_sync_deferred_register_on_order_status
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_deferred_register_on_order_status();

-- Trigger: when a cash payment is inserted on an already-completed order
-- targeting a deferred register, add it to the balance immediately.
-- (For non-completed orders, do nothing — it will be added later when status flips.)
CREATE OR REPLACE FUNCTION public.sync_deferred_register_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord_status order_status;
  is_deferred boolean;
BEGIN
  IF NEW.payment_method <> 'cash' OR NEW.cash_register_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT requires_completed_order INTO is_deferred
  FROM public.cash_registers WHERE id = NEW.cash_register_id;

  IF NOT COALESCE(is_deferred, false) THEN
    RETURN NEW;
  END IF;

  SELECT status INTO ord_status FROM public.orders WHERE id = NEW.order_id;

  IF ord_status = 'completed' THEN
    UPDATE public.cash_registers
    SET current_balance = current_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.cash_register_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_deferred_register_on_payment ON public.payments;
CREATE TRIGGER trg_sync_deferred_register_on_payment
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_deferred_register_on_payment();
