UPDATE public.bundle_variations
SET name_he = name
WHERE COALESCE(name_he, '') = '';