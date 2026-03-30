-- Add numeric short IDs for public URLs
-- Products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_number SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_number ON public.products (product_number);

-- Categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS category_number SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_category_number ON public.categories (category_number);