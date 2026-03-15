import { useState } from "react";
import { Globe, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WebsiteItemsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products_website"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), product_variations(id, name, price, woo_id)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("products").update({ is_published }).eq("id", id);
      if (error) throw error;

      // If publishing and has woo_id, push to WooCommerce
      if (is_published) {
        const { data: prod } = await supabase
          .from("products")
          .select("woo_id")
          .eq("id", id)
          .single();
        if (prod?.woo_id) {
          await supabase.functions.invoke("woo-sync", {
            body: { action: "export_products" },
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products_website"] });
      toast.success("הסטטוס עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const filteredProducts = products?.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" ||
      (filter === "published" && p.is_published) ||
      (filter === "unpublished" && !p.is_published) ||
      (filter === "synced" && p.woo_id) ||
      (filter === "not_synced" && !p.woo_id);
    return matchesSearch && matchesFilter;
  });

  const publishedCount = products?.filter((p) => p.is_published).length || 0;
  const syncedCount = products?.filter((p) => p.woo_id).length || 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            פריטי אתר
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {publishedCount} מפורסמים · {syncedCount} מסונכרנים עם WooCommerce
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש מוצר..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="published">מפורסם</SelectItem>
            <SelectItem value="unpublished">לא מפורסם</SelectItem>
            <SelectItem value="synced">מסונכרן</SelectItem>
            <SelectItem value="not_synced">לא מסונכרן</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : !filteredProducts?.length ? (
            <div className="py-12 text-center text-muted-foreground">אין מוצרים</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מוצר</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">מחיר</TableHead>
                  <TableHead className="text-right">WooCommerce</TableHead>
                  <TableHead className="text-right">מפורסם</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.image_url && (
                          <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <div>
                          <div className="font-medium">{p.name}</div>
                          {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.categories?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.product_type === "variable" ? "משתנה" : "פשוט"}
                      </Badge>
                    </TableCell>
                    <TableCell>₪{Number(p.sale_price).toFixed(2)}</TableCell>
                    <TableCell>
                      {p.woo_id ? (
                        <Badge className="bg-green-100 text-green-800 border-0 text-xs">מסונכרן</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">לא מסונכרן</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.is_published}
                        disabled={togglePublish.isPending}
                        onCheckedChange={(checked) =>
                          togglePublish.mutate({ id: p.id, is_published: checked })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteItemsPage;
