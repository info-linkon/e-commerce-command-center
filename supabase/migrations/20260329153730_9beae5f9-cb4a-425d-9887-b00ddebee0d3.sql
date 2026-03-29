
-- Create site_content table
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(page, section)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site content" ON public.site_content FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage site content" ON public.site_content FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create banners table
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  link text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage banners" ON public.banners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add slug to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug text;

-- Add public SELECT policies to products, product_variations, categories for anonymous access
CREATE POLICY "Public can view published products" ON public.products FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Public can view product variations" ON public.product_variations FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT TO anon USING (true);

-- Allow anonymous order insertion
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT TO anon WITH CHECK (true);
