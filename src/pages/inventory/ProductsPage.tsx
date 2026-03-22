import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { CategoryDialog } from "@/components/inventory/CategoryDialog";
import { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

const ProductsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: products, isLoading } = useProducts(categoryFilter === "all" ? undefined : categoryFilter);
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();

  // Categories management state
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const handleCatSave = (data: { name: string; display_order: number }) => {
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, ...data }, { onSuccess: () => setCatDialogOpen(false) });
    } else {
      createCategory.mutate(data, { onSuccess: () => setCatDialogOpen(false) });
    }
  };

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול פריטים</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatManagerOpen(true)}>
            <FolderOpen className="ml-2 h-4 w-4" />
            ניהול קטגוריות
          </Button>
          <Button onClick={() => navigate("/inventory/products/new")}>
            <Plus className="ml-2 h-4 w-4" />
            הוסף פריט
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או מק״ט..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="כל הקטגוריות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>מק״ט</TableHead>
              <TableHead>קטגוריה</TableHead>
              <TableHead>סוג</TableHead>
              <TableHead>מחיר מכירה</TableHead>
              <TableHead>עלות</TableHead>
              <TableHead className="w-24">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">אין פריטים</TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/inventory/products/${p.id}`)}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.sku || "—"}</TableCell>
                  <TableCell>{(p as any).categories?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.product_type === "simple" ? "פשוט" : "עם וריאציות"}
                    </Badge>
                  </TableCell>
                  <TableCell>₪{Number(p.sale_price).toFixed(2)}</TableCell>
                  <TableCell>₪{Number(p.cost_price).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/inventory/products/${p.id}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(p.id)}>
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

      {/* Categories Manager Dialog */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="sm:max-w-xl" dir="rtl">
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
