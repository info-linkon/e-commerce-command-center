import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useBundles, useDeleteBundle } from "@/hooks/useBundles";

const BundlesPage = () => {
  const navigate = useNavigate();
  const { data: bundles, isLoading } = useBundles();
  const deleteBundle = useDeleteBundle();

  const data = bundles || [];

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
    { label: "שם", render: (b) => <span className="font-medium">{(b as any).products?.name}</span> },
    { label: "קטגוריה", render: (b) => (b as any).products?.categories?.name || "—", hideOnMobile: true },
    { label: "מחיר", render: (b) => (b as any).products?.sale_price ? `₪${Number((b as any).products.sale_price).toFixed(0)}` : "—" },
    { label: "סוג", render: (b) => <Badge variant="secondary">{b.bundle_type === "simple_bundle" ? "פשוט" : "משתנה"}</Badge> },
    { label: "פריטים", render: (b) => (b as any).bundle_items?.length || 0, hideOnMobile: true },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">ניהול מארזים</h1>
        <Button onClick={() => navigate("/inventory/bundles/new")}>
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
        onRowClick={(b) => navigate(`/inventory/bundles/${b.id}`)}
        mobileCard={(b) => {
          const product = (b as any).products;
          return (
            <div className="flex gap-3 items-center">
              {product?.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{product?.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <Badge variant="secondary" className="text-xs">{b.bundle_type === "simple_bundle" ? "פשוט" : "משתנה"}</Badge>
                  <span className="font-bold text-sm">{product?.sale_price ? `₪${Number(product.sale_price).toFixed(0)}` : "—"}</span>
                </div>
              </div>
            </div>
          );
        }}
        actions={(b) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" onClick={() => deleteBundle.mutate({ bundleId: b.id, productId: b.product_id })}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      />
    </div>
  );
};

export default BundlesPage;
