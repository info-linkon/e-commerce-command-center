ALTER TABLE public.banners
ADD COLUMN placement text NOT NULL DEFAULT 'hero';

ALTER TABLE public.banners
ADD CONSTRAINT banners_placement_valid
CHECK (placement IN ('hero', 'featured_promo'));

CREATE INDEX banners_active_placement_sort_idx
ON public.banners (placement, active, sort_order);