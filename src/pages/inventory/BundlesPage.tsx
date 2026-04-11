import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Copy, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useBundles, useDeleteBundle, useDuplicateBundle } from "@/hooks/useBundles";
import { useBundlesStockBatch } from "@/hooks/useBundleStock";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const BundlesPage = () => {
  const navigate = useNavigate();
  const { data: bundles, isLoading } = useBundles();
  const deleteBundle = useDeleteBundle();
  const duplicateBundle = useDuplicateBundle();
  const qc = useQueryClient();

  const bundleIds = (bundles || []).map(b => b.id);
  const { data: stockData } = useBundlesStockBatch(bundleIds);

  const getStock = (b: any): number | null => {
    if (!stockData) return null;
    if (b.bundle_type === "simple_bundle") {
      const s = stockData.simpleStock?.get(b.id);
      return s ? s.maxQuantity : 0;
    }
    const varMap = stockData.variableStock?.get(b.id);
    if (!varMap) return 0;
    let total = 0;
    varMap.forEach(v => total += v.maxQuantity);
    return total;
  };

  const togglePublish = async (productId: string, current: boolean) => {
    const { error } = await supabase.from("products").update({ is_published: !current }).eq("id", productId);
    if (error) { toast.error("שגיאה בעדכון"); return; }
    qc.invalidateQueries({ queryKey: ["bundles"] });
    toast.success(!current ? "המארז פורסם" : "המארז הוסר מהאתר");
  };

  const data = bundles || [];

  const StockBadge = ({ stock }: { stock: number | null }) => {
    if (stock === null) return <span className="text-xs text-muted-foreground">—</span>;
    if (stock === 0) return <Badge variant="destructive">אזל</Badge>;
    if (stock <= 5) return <Badge className="bg-amber-500 text-white">{stock}</Badge>;
    return <Badge variant="secondary">{stock}</Badge>;
  };

  const columns: ColumnDef<any>[] = [
    {
      label: "תמונה",
      render: (b) => {
        const product = (b as any).products;
        return product?.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
        );
      },
      hideOnMobile: true,
    },
    { label: "שם", render: (b) => <span className="font-medium">{(b as any).products?.name_ar || (b as any).products?.name}</span> },
    { label: "קטגוריה", render: (b) => (b as any).products?.categories?.name || "—", hideOnMobile: true },
    { label: "מחיר", render: (b) => (b as any).products?.sale_price ? `₪${Number((b as any).products.sale_price).toFixed(0)}` : "—" },
    { label: "מלאי", render: (b) => <StockBadge stock={getStock(b)} /> },
    { label: "סוג", render: (b) => <Badge variant="secondary">{b.bundle_type === "simple_bundle" ? "פשוט" : "משתנה"}</Badge> },
    { label: "פריטים", render: (b) => (b as any).bundle_items?.length || 0, hideOnMobile: true },
    { label: "פרסום", render: (b) => (b as any).products?.is_published ? <Badge className="bg-green-600">באתר</Badge> : <Badge variant="outline">טיוטה</Badge> },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">ניהול מארזים</h1>
        <Button onClick={() => navigate("/crm/inventory/bundles/new")}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף מארז
        </Button>
      </div>

      <MobileCardList
        data={data}
        columns={columns}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="אין מארזים עדיין"
        onRowClick={(b) => navigate(`/crm/inventory/bundles/${b.id}`)}
        mobileCard={(b) => {
          const product = (b as any).products;
          const stock = getStock(b);
          return (
            <div className="flex gap-3 items-center">
              {product?.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{product?.name_ar || product?.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex gap-1 items-center">
                    <Badge variant="secondary" className="text-xs">{b.bundle_type === "simple_bundle" ? "פשוט" : "משתנה"}</Badge>
                    <StockBadge stock={stock} />
                  </div>
                  <span className="font-bold text-sm">{product?.sale_price ? `₪${Number(product.sale_price).toFixed(0)}` : "—"}</span>
                </div>
              </div>
            </div>
          );
        }}
        actions={(b) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" title={(b as any).products?.is_published ? "הסר מהאתר" : "פרסם באתר"} onClick={() => togglePublish(b.product_id, (b as any).products?.is_published)}>
              <Globe className={`h-4 w-4 ${(b as any).products?.is_published ? "text-green-600" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" title="שכפל מארז" onClick={() => duplicateBundle.mutate({ bundleId: b.id, productId: b.product_id })}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="מחק מארז" onClick={() => deleteBundle.mutate({ bundleId: b.id, productId: b.product_id })}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      />
    </div>
  );
};

export default BundlesPage;
