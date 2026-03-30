import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useBundles, useDeleteBundle } from "@/hooks/useBundles";

const BundlesPage = () => {
  const navigate = useNavigate();
  const { data: bundles, isLoading } = useBundles();
  const deleteBundle = useDeleteBundle();

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול מארזים</h1>
        <Button onClick={() => navigate("/inventory/bundles/new")}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף מארז
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right w-16">תמונה</TableHead>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">קטגוריה</TableHead>
              <TableHead className="text-right">מחיר</TableHead>
              <TableHead className="text-right">סוג</TableHead>
              <TableHead className="text-right">פריטים</TableHead>
              <TableHead className="text-right w-20">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !bundles?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">אין מארזים עדיין</TableCell></TableRow>
            ) : (
              bundles.map((b) => {
                const product = (b as any).products;
                return (
                  <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/inventory/bundles/${b.id}`)}>
                    <TableCell>
                      {product?.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{product?.name}</span>
                        {product?.name_ar && (
                          <span className="block text-xs text-muted-foreground">{product.name_ar}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product?.categories?.name || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product?.sale_price ? `₪${Number(product.sale_price).toFixed(0)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {b.bundle_type === "simple_bundle" ? "פשוט" : "משתנה"}
                      </Badge>
                    </TableCell>
                    <TableCell>{(b as any).bundle_items?.length || 0}</TableCell>
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => deleteBundle.mutate({ bundleId: b.id, productId: b.product_id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BundlesPage;
