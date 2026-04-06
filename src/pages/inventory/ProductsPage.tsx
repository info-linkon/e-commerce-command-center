import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, FolderOpen, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { CategoryDialog } from "@/components/inventory/CategoryDialog";
import { Tables } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Category = Tables<"categories">;

const ProductsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: products, isLoading } = useProducts(categoryFilter === "all" ? undefined : categoryFilter);
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();

  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Fetch bundle product_ids to filter them out
  const { data: bundleProductIds } = useQuery({
    queryKey: ["bundle-product-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("product_id");
      if (error) throw error;
      return new Set((data || []).map(b => b.product_id));
    },
  });

  const handleCatSave = (data: { name: string; display_order: number }) => {
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, ...data }, { onSuccess: () => setCatDialogOpen(false) });
    } else {
      createCategory.mutate(data, { onSuccess: () => setCatDialogOpen(false) });
    }
  };

  const handleConvertToBundle = (productId: string) => {
    navigate(`/inventory/bundles/new?fromProduct=${productId}`);
  };

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      // Hide products that are already bundles
      if (bundleProductIds?.has(p.id)) return false;
      return p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
    });
  }, [products, bundleProductIds, search]);

  const columns: ColumnDef<any>[] = [
    { label: "שם", render: (p) => <span className="font-medium">{p.name}</span> },
    { label: "מק״ט", render: (p) => p.sku || "—", hideOnMobile: true },
    { label: "קטגוריה", render: (p) => (p as any).categories?.name || "—", hideOnMobile: true },
    { label: "סוג", render: (p) => <Badge variant="secondary">{p.product_type === "simple" ? "פשוט" : "עם וריאציות"}</Badge> },
    { label: "מחיר", render: (p) => `₪${Number(p.sale_price).toFixed(2)}` },
    { label: "עלות", render: (p) => `₪${Number(p.cost_price).toFixed(2)}`, hideOnMobile: true },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">ניהול פריטים</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatManagerOpen(true)}>
            <FolderOpen className="ml-2 h-4 w-4" />
            <span className="hidden sm:inline">ניהול קטגוריות</span>
            <span className="sm:hidden">קטגוריות</span>
          </Button>
          <Button onClick={() => navigate("/inventory/products/new")}>
            <Plus className="ml-2 h-4 w-4" />
            <span className="hidden sm:inline">הוסף פריט</span>
            <span className="sm:hidden">חדש</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם או מק״ט..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36 sm:w-48"><SelectValue placeholder="כל הקטגוריות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MobileCardList
        data={filtered}
        columns={columns}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="אין פריטים"
        onRowClick={(p) => navigate(`/inventory/products/${p.id}`)}
        mobileCard={(p) => (
          <div>
            <div className="flex justify-between items-start">
              <Badge variant="secondary" className="text-xs">{p.product_type === "simple" ? "פשוט" : "וריאציות"}</Badge>
              <span className="font-medium">{p.name}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="font-bold">₪{Number(p.sale_price).toFixed(2)}</span>
              <span className="text-muted-foreground">{(p as any).categories?.name || "ללא קטגוריה"}</span>
            </div>
          </div>
        )}
        actions={(p) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" title="העבר למארז" onClick={() => handleConvertToBundle(p.id)}>
              <Package className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/inventory/products/${p.id}`)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(p.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      {/* Categories Manager Dialog */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="sm:max-w-xl w-[95vw]" dir="rtl">
          <DialogHeader>
            <DialogTitle>ניהול קטגוריות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setEditingCat(null); setCatDialogOpen(true); }}>
                <Plus className="ml-1 h-4 w-4" />
                קטגוריה חדשה
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>סדר</TableHead>
                  <TableHead>שם</TableHead>
                  <TableHead className="w-24">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!categories?.length ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">אין קטגוריות</TableCell></TableRow>
                ) : (
                  categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.display_order}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingCat(c); setCatDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCategory.mutate(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <CategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        category={editingCat}
        onSave={handleCatSave}
        loading={createCategory.isPending || updateCategory.isPending}
      />
    </div>
  );
};

export default ProductsPage;
