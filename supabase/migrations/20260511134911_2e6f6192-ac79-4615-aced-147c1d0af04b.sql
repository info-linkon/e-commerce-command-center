-- Safety net: auto-create the canonical "ברירת מחדל" product_variation
-- (and zero-stock inventory rows in every active warehouse) whenever a new
-- bundle is registered. Guarantees web cart / checkout / POS can always
-- resolve a valid variation for the bundle product, regardless of the code
-- path that created it (admin UI, duplicate, Woo sync, ad-hoc script).
CREATE OR REPLACE FUNCTION public.ensure_bundle_default_variation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variation_id uuid;
  v_price numeric;
  v_cost numeric;
BEGIN
  -- Skip if a product_variation already exists for this product
  IF EXISTS (SELECT 1 FROM public.product_variations WHERE product_id = NEW.product_id) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(sale_price, 0), COALESCE(cost_price, 0)
    INTO v_price, v_cost
  FROM public.products WHERE id = NEW.product_id;

  INSERT INTO public.product_variations (product_id, name, price, cost_price)
  VALUES (NEW.product_id, 'ברירת מחדל', COALESCE(v_price, 0), COALESCE(v_cost, 0))
  RETURNING id INTO v_variation_id;

  -- Seed inventory in every active warehouse
  INSERT INTO public.inventory (variation_id, warehouse_id, quantity)
  SELECT v_variation_id, w.id, 0
  FROM public.warehouses w
  WHERE w.is_active = true
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_bundle_default_variation ON public.bundles;
CREATE TRIGGER trg_ensure_bundle_default_variation
AFTER INSERT ON public.bundles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_bundle_default_variation();