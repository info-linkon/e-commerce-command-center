
-- ============================================================
-- STEP 1: Drop all triggers that reference tenant functions
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tgname, relname, nspname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
    AND (tgname ILIKE '%tenant%' OR tgname ILIKE '%quota%' OR tgname ILIKE '%set_tenant%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', r.tgname, r.nspname, r.relname);
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: Drop ALL existing RLS policies on data tables
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename NOT IN ('otp_codes') -- keep OTP policies
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Drop SaaS tables (order matters for FK)
-- ============================================================
DROP TABLE IF EXISTS public.billing_invoices CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.usage_counters CASCADE;
DROP TABLE IF EXISTS public.reserved_slugs CASCADE;
DROP TABLE IF EXISTS public.tenant_settings CASCADE;
DROP TABLE IF EXISTS public.tenant_members CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- ============================================================
-- STEP 4: Drop tenant_id FK constraints then columns
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  -- Drop FK constraints referencing tenants (already cascaded but be safe)
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.column_name = 'tenant_id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
  END LOOP;

  -- Drop tenant_id column from all tables that have it
  FOR r IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'tenant_id'
    AND table_name NOT IN ('tenants','tenant_members','tenant_settings','billing_invoices','subscriptions','usage_counters')
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS tenant_id', r.table_name);
  END LOOP;
END $$;

-- ============================================================
-- STEP 5: Drop SaaS/tenant functions
-- ============================================================
DROP FUNCTION IF EXISTS public.current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.switch_active_tenant(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.resolve_tenant_by_host(text) CASCADE;
DROP FUNCTION IF EXISTS public.resolve_tenant_by_slug(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_tenant_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.set_tenant_id_from_jwt() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_warehouse_quota() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_tenant_member_quota() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenants() CASCADE;

-- ============================================================
-- STEP 6: Re-create simple RLS policies
-- ============================================================

-- Helper: tables that should be PUBLIC READ (storefront)
-- products, product_variations, product_categories, categories, bundles, bundle_items, bundle_variations, bundle_variation_items, banners, site_content

-- Public-read tables
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'products','product_variations','product_categories','categories',
    'bundles','bundle_items','bundle_variations','bundle_variation_items',
    'banners'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "public_read" ON public.%I FOR SELECT USING (true)', tbl);
    EXECUTE format('CREATE POLICY "auth_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- Auth-only tables (CRM data)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'orders','order_items','order_picking_items',
    'customers','deliveries','delivery_companies',
    'payments','payment_events','documents',
    'cash_registers','cash_transfers',
    'expenses','inventory','inventory_log',
    'inventory_transfers','inventory_transfer_items',
    'intake_sessions','intake_session_items',
    'coupons','sms_templates','warehouses',
    'notification_log','notification_templates'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "auth_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- site_content: public read + auth write (already had this)
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "auth_all" ON public.site_content FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- profiles: keep user-scoped
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_roles: auth read, no public write
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read" ON public.user_roles FOR SELECT TO authenticated USING (true);
