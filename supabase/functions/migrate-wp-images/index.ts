const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const WP_PATTERN = "elwejha.co.il/wp-content";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const migrated: string[] = [];
    const failed: string[] = [];

    // Helper: download image and upload to Supabase Storage
    async function migrateImage(url: string): Promise<string | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
        const finalExt = ext === "webp" ? "webp" : ext;
        const newPath = `migrated/${crypto.randomUUID()}.${finalExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(newPath, blob, {
            contentType: blob.type || `image/${finalExt}`,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(newPath);

        return urlData.publicUrl;
      } catch (err) {
        return null;
      }
    }

    // 1. Products — image_url
    const { data: products } = await supabase
      .from("products")
      .select("id, name, image_url, gallery_images")
      .ilike("image_url", `%${WP_PATTERN}%`);

    for (const p of products || []) {
      const newUrl = await migrateImage(p.image_url);
      if (newUrl) {
        await supabase.from("products").update({ image_url: newUrl }).eq("id", p.id);
        migrated.push(`product image: ${p.name}`);
      } else {
        failed.push(`product image: ${p.name} — ${p.image_url}`);
      }
    }

    // 2. Products — gallery_images
    const { data: galleryProducts } = await supabase
      .from("products")
      .select("id, name, gallery_images")
      .not("gallery_images", "is", null);

    for (const p of galleryProducts || []) {
      if (!Array.isArray(p.gallery_images)) continue;
      const gallery = [...(p.gallery_images as string[])];
      let changed = false;
      for (let i = 0; i < gallery.length; i++) {
        if (typeof gallery[i] === "string" && gallery[i].includes(WP_PATTERN)) {
          const newUrl = await migrateImage(gallery[i]);
          if (newUrl) {
            gallery[i] = newUrl;
            changed = true;
            migrated.push(`gallery ${p.name} #${i + 1}`);
          } else {
            failed.push(`gallery ${p.name} #${i + 1} — ${gallery[i]}`);
          }
        }
      }
      if (changed) {
        await supabase.from("products").update({ gallery_images: gallery }).eq("id", p.id);
      }
    }

    // 3. Product variations — image_url
    const { data: variations } = await supabase
      .from("product_variations")
      .select("id, name, image_url")
      .ilike("image_url", `%${WP_PATTERN}%`);

    for (const v of variations || []) {
      const newUrl = await migrateImage(v.image_url);
      if (newUrl) {
        await supabase.from("product_variations").update({ image_url: newUrl }).eq("id", v.id);
        migrated.push(`variation: ${v.name}`);
      } else {
        failed.push(`variation: ${v.name} — ${v.image_url}`);
      }
    }

    // 4. Categories — image_url
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, image_url")
      .ilike("image_url", `%${WP_PATTERN}%`);

    for (const c of categories || []) {
      const newUrl = await migrateImage(c.image_url);
      if (newUrl) {
        await supabase.from("categories").update({ image_url: newUrl }).eq("id", c.id);
        migrated.push(`category: ${c.name}`);
      } else {
        failed.push(`category: ${c.name} — ${c.image_url}`);
      }
    }

    // 5. Banners — image_url
    const { data: banners } = await supabase
      .from("banners")
      .select("id, title, image_url")
      .ilike("image_url", `%${WP_PATTERN}%`);

    for (const b of banners || []) {
      const newUrl = await migrateImage(b.image_url);
      if (newUrl) {
        await supabase.from("banners").update({ image_url: newUrl }).eq("id", b.id);
        migrated.push(`banner: ${b.title || "untitled"}`);
      } else {
        failed.push(`banner: ${b.title || "untitled"} — ${b.image_url}`);
      }
    }

    return new Response(
      JSON.stringify({ migrated: migrated.length, failed: failed.length, migratedList: migrated, failedList: failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
