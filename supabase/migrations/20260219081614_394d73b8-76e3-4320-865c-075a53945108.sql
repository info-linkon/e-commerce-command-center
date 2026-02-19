
-- Enum types
CREATE TYPE public.inventory_action_type AS ENUM ('intake', 'sale', 'transfer_in', 'transfer_out', 'adjustment');
CREATE TYPE public.picking_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.delivery_status AS ENUM ('pending', 'in_transit', 'delivered');
CREATE TYPE public.expense_payment_source AS ENUM ('credit_card', 'cash_register');
CREATE TYPE public.transfer_status AS ENUM ('pending', 'completed');

-- 1. inventory_log
CREATE TABLE public.inventory_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variation_id uuid NOT NULL REFERENCES public.product_variations(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  quantity_change integer NOT NULL,
  quantity_after integer NOT NULL,
  action_type public.inventory_action_type NOT NULL,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory_log" ON public.inventory_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view inventory_log" ON public.inventory_log FOR SELECT USING (true);

-- 2. inventory_transfers
CREATE TABLE public.inventory_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  status public.transfer_status NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory_transfers" ON public.inventory_transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view inventory_transfers" ON public.inventory_transfers FOR SELECT USING (true);

-- 3. inventory_transfer_items
CREATE TABLE public.inventory_transfer_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
  variation_id uuid NOT NULL REFERENCES public.product_variations(id),
  quantity integer NOT NULL
);
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory_transfer_items" ON public.inventory_transfer_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view inventory_transfer_items" ON public.inventory_transfer_items FOR SELECT USING (true);

-- 4. Add columns to orders
ALTER TABLE public.orders
  ADD COLUMN assigned_warehouse_id uuid REFERENCES public.warehouses(id),
  ADD COLUMN assigned_user_id uuid,
  ADD COLUMN picking_status public.picking_status DEFAULT 'not_started';

-- 5. order_picking_items
CREATE TABLE public.order_picking_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  picked boolean NOT NULL DEFAULT false,
  picked_at timestamptz,
  picked_by uuid
);
ALTER TABLE public.order_picking_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage order_picking_items" ON public.order_picking_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view order_picking_items" ON public.order_picking_items FOR SELECT USING (true);

-- 6. delivery_companies
CREATE TABLE public.delivery_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  cash_register_id uuid REFERENCES public.cash_registers(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage delivery_companies" ON public.delivery_companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view delivery_companies" ON public.delivery_companies FOR SELECT USING (true);

-- 7. deliveries
CREATE TABLE public.deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  delivery_company_id uuid NOT NULL REFERENCES public.delivery_companies(id),
  status public.delivery_status NOT NULL DEFAULT 'pending',
  notes text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage deliveries" ON public.deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view deliveries" ON public.deliveries FOR SELECT USING (true);

-- 8. cash_transfers
CREATE TABLE public.cash_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_register_id uuid NOT NULL REFERENCES public.cash_registers(id),
  to_register_id uuid NOT NULL REFERENCES public.cash_registers(id),
  amount numeric NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cash_transfers" ON public.cash_transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view cash_transfers" ON public.cash_transfers FOR SELECT USING (true);

-- 9. expenses
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description text NOT NULL,
  amount numeric NOT NULL,
  payment_source public.expense_payment_source NOT NULL,
  cash_register_id uuid REFERENCES public.cash_registers(id),
  document_url text,
  document_file text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT USING (true);
