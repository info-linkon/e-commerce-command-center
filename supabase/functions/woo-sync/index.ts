import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function wooAuth() {
  const key = Deno.env.get("WOO_CONSUMER_KEY")!;
  const secret = Deno.env.get("WOO_CONSUMER_SECRET")!;
  return "Basic " + btoa(`${key}:${secret}`);
}

function wooUrl(path: string) {
  const base = Deno.env.get("WOO_STORE_URL")!.replace(/\/$/, "");
  return `${base}/wp-json/wc/v3${path}`;
}

async function wooGet(path: string) {
  const res = await fetch(wooUrl(path), {
    headers: { Authorization: wooAuth() },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WooCommerce API error ${res.status}: ${t}`);
  }
  return res.json();
}

async function wooPut(path: string, body: any) {
  const res = await fetch(wooUrl(path), {
    method: "PUT",
    headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WooCommerce API error ${res.status}: ${t}`);
  }
  return res.json();
}

async function wooPost(path: string, body: any) {
  const res = await fetch(wooUrl(path), {
    method: "POST",
    headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WooCommerce API error ${res.status}: ${t}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action = body.action;

    if (action === "import_categories") {
      // Import categories from WooCommerce
      const wooCats = await wooGet("/products/categories?per_page=100");
      let imported = 0;
      for (const cat of wooCats) {
        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .eq("woo_id", cat.id)
          .maybeSingle();
        if (existing) {
          await supabase.from("categories").update({ name: cat.name, display_order: cat.menu_order || 0 }).eq("id", existing.id);
        } else {
          await supabase.from("categories").insert({ name: cat.name, woo_id: cat.id, display_order: cat.menu_order || 0 });
        }
        imported++;
      }
      return new Response(JSON.stringify({ success: true, imported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import_products") {
      // Import products from WooCommerce
      let page = 1;
      let imported = 0;
      while (true) {
        const wooProd = await wooGet(`/products?per_page=50&page=${page}`);
        if (!wooProd.length) break;

        for (const p of wooProd) {
          // Find category
          let categoryId = null;
          if (p.categories?.length) {
            const { data: cat } = await supabase
              .from("categories")
              .select("id")
              .eq("woo_id", p.categories[0].id)
              .maybeSingle();
            if (cat) categoryId = cat.id;
          }

          const productData = {
            name: p.name,
            woo_id: p.id,
            sku: p.sku || null,
            sale_price: Number(p.price) || 0,
            cost_price: 0,
            description: p.description || null,
            short_description: p.short_description || null,
            image_url: p.images?.[0]?.src || null,
            is_published: p.status === "publish",
            product_type: p.type === "variable" ? "variable" : "simple",
            category_id: categoryId,
          };

          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .eq("woo_id", p.id)
            .maybeSingle();

          let productId: string;
          if (existing) {
            await supabase.from("products").update(productData).eq("id", existing.id);
            productId = existing.id;
          } else {
            const { data: newProd } = await supabase
              .from("products")
              .insert(productData)
              .select("id")
              .single();
            productId = newProd!.id;
          }

          // Import variations
          if (p.type === "variable") {
            const wooVars = await wooGet(`/products/${p.id}/variations?per_page=100`);
            for (const v of wooVars) {
              const varName = v.attributes?.map((a: any) => a.option).join(" / ") || v.sku || "ברירת מחדל";
              const varData = {
                product_id: productId,
                woo_id: v.id,
                name: varName,
                sku: v.sku || null,
                price: Number(v.price) || 0,
                cost_price: 0,
                image_url: v.image?.src || null,
              };
              const { data: existingVar } = await supabase
                .from("product_variations")
                .select("id")
                .eq("woo_id", v.id)
                .maybeSingle();
              if (existingVar) {
                await supabase.from("product_variations").update(varData).eq("id", existingVar.id);
              } else {
                await supabase.from("product_variations").insert(varData);
              }
            }
          } else {
            // Simple product - create default variation
            const { data: existingVar } = await supabase
              .from("product_variations")
              .select("id")
              .eq("product_id", productId)
              .eq("name", "ברירת מחדל")
              .maybeSingle();
            if (!existingVar) {
              await supabase.from("product_variations").insert({
                product_id: productId,
                name: "ברירת מחדל",
                sku: p.sku || null,
                price: Number(p.price) || 0,
                cost_price: 0,
              });
            }
          }
          imported++;
        }
        page++;
      }
      return new Response(JSON.stringify({ success: true, imported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "export_products") {
      // Export products to WooCommerce
      const { data: products } = await supabase
        .from("products")
        .select("*, product_variations(*), categories(woo_id)")
        .eq("is_published", true);

      let exported = 0;
      for (const p of products || []) {
        const wooData: any = {
          name: p.name,
          regular_price: String(p.sale_price),
          sku: p.sku || "",
          description: p.description || "",
          short_description: p.short_description || "",
          status: "publish",
          type: p.product_type === "variable" ? "variable" : "simple",
        };

        if ((p.categories as any)?.woo_id) {
          wooData.categories = [{ id: (p.categories as any).woo_id }];
        }

        if (p.woo_id) {
          await wooPut(`/products/${p.woo_id}`, wooData);
        } else {
          const created = await wooPost("/products", wooData);
          await supabase.from("products").update({ woo_id: created.id }).eq("id", p.id);
        }
        exported++;
      }
      return new Response(JSON.stringify({ success: true, exported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import_orders") {
      // Import recent orders from WooCommerce
      const wooOrders = await wooGet("/orders?per_page=50&orderby=date&order=desc");
      let imported = 0;
      for (const o of wooOrders) {
        const { data: existing } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", o.number)
          .maybeSingle();
        if (existing) continue;

        const statusMap: Record<string, string> = {
          pending: "pending",
          processing: "processing",
          completed: "completed",
          cancelled: "cancelled",
          refunded: "cancelled",
          failed: "cancelled",
          "on-hold": "pending",
        };

        const { data: order } = await supabase
          .from("orders")
          .insert({
            customer_name: `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim(),
            customer_phone: o.billing?.phone || null,
            customer_email: o.billing?.email || null,
            total: Number(o.total) || 0,
            status: statusMap[o.status] || "pending",
            source: "website",
            notes: `WooCommerce Order #${o.number}`,
          })
          .select("id")
          .single();

        if (order) {
          for (const item of o.line_items || []) {
            // Try to find variation by woo_id
            let variationId = null;
            if (item.variation_id) {
              const { data: v } = await supabase
                .from("product_variations")
                .select("id")
                .eq("woo_id", item.variation_id)
                .maybeSingle();
              if (v) variationId = v.id;
            }
            if (!variationId && item.product_id) {
              const { data: prod } = await supabase
                .from("products")
                .select("id")
                .eq("woo_id", item.product_id)
                .maybeSingle();
              if (prod) {
                const { data: defVar } = await supabase
                  .from("product_variations")
                  .select("id")
                  .eq("product_id", prod.id)
                  .limit(1)
                  .maybeSingle();
                if (defVar) variationId = defVar.id;
              }
            }
            if (variationId) {
              await supabase.from("order_items").insert({
                order_id: order.id,
                variation_id: variationId,
                quantity: item.quantity,
                unit_price: Number(item.price) || 0,
                total_price: Number(item.total) || 0,
              });
            }
          }
        }
        imported++;
      }
      return new Response(JSON.stringify({ success: true, imported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import_images") {
      const offset = body.offset || 0;
      const limit = body.limit || 5;

      const storageBase = Deno.env.get("SUPABASE_URL")! + "/storage/v1";
      
      // Get total count
      const { count: totalCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("woo_id", "is", null);

      const { data: products } = await supabase
        .from("products")
        .select("id, woo_id, image_url, product_type, gallery_images")
        .not("woo_id", "is", null)
        .order("created_at")
        .range(offset, offset + limit - 1);

      let imported = 0;
      let skipped = 0;

      for (const p of products || []) {
        if (p.image_url?.includes(storageBase)) {
          skipped++;
          continue;
        }

        try {
          const wooProd = await wooGet(`/products/${p.woo_id}`);
          const allImages = wooProd.images || [];
          if (!allImages.length) { skipped++; continue; }
          
          let mainUrl = p.image_url;
          const gallery: { src: string; woo_src: string }[] = [];

          for (let i = 0; i < allImages.length; i++) {
            const img = allImages[i];
            if (!img.src) continue;
            try {
              const imgRes = await fetch(img.src, { signal: AbortSignal.timeout(15000) });
              if (!imgRes.ok) continue;
              const blob = await imgRes.arrayBuffer();
              const ext = img.src.split(".").pop()?.split("?")[0] || "jpg";
              const path = `woo/${p.woo_id}/${i === 0 ? "main" : `gallery-${i}`}.${ext}`;
              
              await supabase.storage.from("product-images").upload(path, blob, {
                contentType: imgRes.headers.get("content-type") || "image/jpeg",
                upsert: true,
              });

              const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
              const localUrl = urlData.publicUrl;

              if (i === 0) {
                mainUrl = localUrl;
              } else {
                gallery.push({ src: localUrl, woo_src: img.src });
              }
            } catch (imgErr) {
              console.error(`Failed to download image ${img.src}:`, imgErr);
            }
          }

          await supabase.from("products").update({
            image_url: mainUrl,
            gallery_images: gallery,
          }).eq("id", p.id);

          if (p.product_type === "variable") {
            const wooVars = await wooGet(`/products/${p.woo_id}/variations?per_page=100`);
            for (const v of wooVars) {
              if (!v.image?.src) continue;
              const { data: localVar } = await supabase
                .from("product_variations")
                .select("id, image_url")
                .eq("woo_id", v.id)
                .maybeSingle();
              if (!localVar || localVar.image_url?.includes(storageBase)) continue;

              try {
                const imgRes = await fetch(v.image.src, { signal: AbortSignal.timeout(15000) });
                if (!imgRes.ok) continue;
                const blob = await imgRes.arrayBuffer();
                const ext = v.image.src.split(".").pop()?.split("?")[0] || "jpg";
                const path = `woo/var-${v.id}/main.${ext}`;
                
                await supabase.storage.from("product-images").upload(path, blob, {
                  contentType: imgRes.headers.get("content-type") || "image/jpeg",
                  upsert: true,
                });

                const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
                await supabase.from("product_variations").update({ image_url: urlData.publicUrl }).eq("id", localVar.id);
              } catch (imgErr) {
                console.error(`Failed to download variation image:`, imgErr);
              }
            }
          }

          imported++;
        } catch (prodErr) {
          console.error(`Failed to process product ${p.woo_id}:`, prodErr);
        }
      }

      const hasMore = offset + limit < (totalCount || 0);
      return new Response(JSON.stringify({ 
        success: true, imported, skipped, 
        total: totalCount || 0, 
        processed: offset + (products?.length || 0),
        hasMore,
        nextOffset: offset + limit,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_order_status") {
      const { order_id } = await req.json().catch(() => ({}));
      // Get order from Supabase
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .select("order_number, status, source, notes")
        .eq("id", order_id)
        .single();
      if (oErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only sync website orders
      if (order.source !== "website") {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "Not a website order" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract WooCommerce order number from notes
      const wooMatch = order.notes?.match(/WooCommerce Order #(\d+)/);
      if (!wooMatch) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "No WooCommerce order number found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wooOrderNumber = wooMatch[1];
      // Find WooCommerce order by number
      const wooOrders = await wooGet(`/orders?number=${wooOrderNumber}`);
      if (!wooOrders?.length) {
        return new Response(JSON.stringify({ error: "WooCommerce order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusMap: Record<string, string> = {
        pending: "on-hold",
        processing: "processing",
        completed: "completed",
        cancelled: "cancelled",
      };

      const wooStatus = statusMap[order.status] || "on-hold";
      await wooPut(`/orders/${wooOrders[0].id}`, { status: wooStatus });

      return new Response(JSON.stringify({ success: true, woo_status: wooStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("woo-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
