import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { CategoryDialog } from "@/components/inventory/CategoryDialog";
import { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

const CategoriesPage = () => {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const handleSave = (data: { name: string; name_he: string | null; display_order: number; image_url: string | null }) => {
    if (editing) {
      updateCategory.mutate({ id: editing.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createCategory.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול קטגוריות</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף קטגוריה
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right w-12">תמונה</TableHead>
              <TableHead className="text-right">סדר</TableHead>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right w-24">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !categories?.length ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">אין קטגוריות עדיין</TableCell></TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell>{c.display_order}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setDialogOpen(true); }}>
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        onSave={handleSave}
        loading={createCategory.isPending || updateCategory.isPending}
      />
    </div>
  );
};

export default CategoriesPage;
