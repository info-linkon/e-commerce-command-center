import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageRecord {
  table: string;
  id: string;
  column: string;
  url: string;
  label: string;
}

const isSupabaseStorageUrl = (url: string) =>
  url.includes("supabase.co/storage/");

const isWebp = (url: string) => {
  const path = url.split("?")[0].toLowerCase();
  return path.endsWith(".webp");
};

async function convertToWebp(imageUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

export default function ImageWebpConverter() {
  const [scanning, setScanning] = useState(false);
  const [converting, setConverting] = useState(false);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const scan = async () => {
    setScanning(true);
    setImages([]);
    setDone(false);
    setErrors([]);
    const found: ImageRecord[] = [];

    try {
      // Products
      const { data: products } = await supabase.from("products").select("id, name, image_url, gallery_images");
      products?.forEach((p) => {
        if (p.image_url && !isWebp(p.image_url)) {
          found.push({ table: "products", id: p.id, column: "image_url", url: p.image_url, label: `מוצר: ${p.name}` });
        }
        if (Array.isArray(p.gallery_images)) {
          (p.gallery_images as string[]).forEach((gUrl, i) => {
            if (typeof gUrl === "string" && gUrl && !isWebp(gUrl)) {
              found.push({ table: "products", id: p.id, column: `gallery_images[${i}]`, url: gUrl, label: `מוצר גלריה: ${p.name} #${i + 1}` });
            }
          });
        }
      });

      // Variations
      const { data: variations } = await supabase.from("product_variations").select("id, name, image_url");
      variations?.forEach((v) => {
        if (v.image_url && !isWebp(v.image_url)) {
          found.push({ table: "product_variations", id: v.id, column: "image_url", url: v.image_url, label: `וריאציה: ${v.name}` });
        }
      });

      // Categories
      const { data: categories } = await supabase.from("categories").select("id, name, image_url");
      categories?.forEach((c) => {
        if (c.image_url && !isWebp(c.image_url)) {
          found.push({ table: "categories", id: c.id, column: "image_url", url: c.image_url, label: `קטגוריה: ${c.name}` });
        }
      });

      // Banners
      const { data: banners } = await supabase.from("banners").select("id, title, image_url");
      banners?.forEach((b) => {
        if (b.image_url && !isWebp(b.image_url)) {
          found.push({ table: "banners", id: b.id, column: "image_url", url: b.image_url, label: `באנר: ${b.title || "ללא שם"}` });
        }
      });

      setImages(found);
      if (found.length === 0) {
        toast.success("כל התמונות כבר בפורמט WebP! 🎉");
      } else {
        toast.info(`נמצאו ${found.length} תמונות להמרה`);
      }
    } catch (err) {
      toast.error("שגיאה בסריקה");
    }
    setScanning(false);
  };

  const convertAll = async () => {
    setConverting(true);
    setProgress(0);
    setCompleted(0);
    setErrors([]);
    const total = images.length;
    let done = 0;
    const errs: string[] = [];

    for (const img of images) {
      try {
        const blob = await convertToWebp(img.url);
        const newPath = `converted/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(newPath, blob, { contentType: "image/webp", upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(newPath);
        const newUrl = urlData.publicUrl;

        // Update DB
        if (img.column.startsWith("gallery_images[")) {
          // Gallery image — need to update entire array
          const { data: product } = await supabase.from("products").select("gallery_images").eq("id", img.id).single();
          if (product?.gallery_images && Array.isArray(product.gallery_images)) {
            const idx = parseInt(img.column.match(/\[(\d+)\]/)?.[1] || "0");
            const gallery = [...(product.gallery_images as string[])];
            gallery[idx] = newUrl;
            await supabase.from("products").update({ gallery_images: gallery }).eq("id", img.id);
          }
        } else {
          await supabase.from(img.table as any).update({ [img.column]: newUrl }).eq("id", img.id);
        }

        done++;
      } catch (err: any) {
        errs.push(`${img.label}: ${err.message || "שגיאה"}`);
        done++;
      }
      setCompleted(done);
      setProgress(Math.round((done / total) * 100));
    }

    setErrors(errs);
    setConverting(false);
    setDone(true);

    if (errs.length === 0) {
      toast.success(`הומרו ${total} תמונות ל-WebP בהצלחה! 🎉`);
    } else {
      toast.warning(`הומרו ${total - errs.length} מתוך ${total} תמונות. ${errs.length} שגיאות.`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-5 w-5 text-primary" />
          המרת תמונות ל-WebP
        </CardTitle>
        <CardDescription>
          סורק את כל התמונות במערכת (מוצרים, קטגוריות, באנרים) וממיר תמונות שאינן WebP לפורמט WebP לביצועים טובים יותר.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Scan */}
        <div className="flex items-center gap-3">
          <Button onClick={scan} disabled={scanning || converting} variant="outline" size="sm">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <RefreshCw className="h-4 w-4 ml-1" />}
            {scanning ? "סורק..." : "סרוק תמונות"}
          </Button>
          {images.length > 0 && !done && (
            <Badge variant="secondary">{images.length} תמונות למרה</Badge>
          )}
          {done && errors.length === 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 ml-1" /> הושלם
            </Badge>
          )}
        </div>

        {/* Image list preview */}
        {images.length > 0 && !converting && !done && (
          <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
            {images.map((img, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{img.label}</span>
                <span className="text-muted-foreground text-xs truncate" dir="ltr">
                  {img.url.split("/").pop()?.substring(0, 30)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Convert */}
        {images.length > 0 && !done && (
          <Button onClick={convertAll} disabled={converting} size="sm">
            {converting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <ImageIcon className="h-4 w-4 ml-1" />}
            {converting ? `ממיר... (${completed}/${images.length})` : `המר ${images.length} תמונות`}
          </Button>
        )}

        {/* Progress */}
        {converting && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{completed} מתוך {images.length} — {progress}%</p>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="border border-destructive/30 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.length} שגיאות
            </p>
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-muted-foreground">{e}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
