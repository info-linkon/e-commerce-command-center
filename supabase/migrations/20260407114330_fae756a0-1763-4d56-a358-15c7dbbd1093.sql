-- Banner Hebrew fields
ALTER TABLE banners ADD COLUMN title_he TEXT;
ALTER TABLE banners ADD COLUMN subtitle_he TEXT;

-- Bundle variation Hebrew name
ALTER TABLE bundle_variations ADD COLUMN name_he TEXT;

-- Allow deletion of products that have order history
ALTER TABLE order_items ALTER COLUMN variation_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_variation_id_fkey') THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_variation_id_fkey;
  END IF;
END $$;

ALTER TABLE order_items ADD CONSTRAINT order_items_variation_id_fkey 
  FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE SET NULL;

ALTER TABLE inventory_log ALTER COLUMN variation_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inventory_log_variation_id_fkey') THEN
    ALTER TABLE inventory_log DROP CONSTRAINT inventory_log_variation_id_fkey;
  END IF;
END $$;

ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_variation_id_fkey 
  FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE SET NULL;