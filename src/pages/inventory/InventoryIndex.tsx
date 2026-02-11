import { useState, useMemo } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useInventory, useUpsertInventory } from "@/hooks/useInventory";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useCategories } from "@/hooks/useCategories";

const LOW_STOCK_THRESHOLD = 5;

const InventoryIndex = () => {
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: inventoryData, isLoading } = useInventory(warehouseFilter === "all" ? undefined : warehouseFilter);
  const { data: warehouses } = useWarehouses();
  const { data: categories } = useCategories();
  const upsertInventory = useUpsertInventory();

  const filtered = useMemo(() => {
    if (!inventoryData) return [];
    return inventoryData.filter((item) => {
      const variation = item.product_variations as any;
      const product = variation?.products;
      const matchSearch = !search || 
        variation?.name?.toLowerCase().includes(search.toLowerCase()) ||
        product?.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || product?.category_id === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [inventoryData, search, categoryFilter]);

  const handleQuantityChange = (variationId: string, warehouseId: string, quantity: number) => {
    upsertInventory.mutate({ variationId, warehouseId, quantity });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">תצוגת מלאי</h1>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="כל המחסנים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המחסנים</SelectItem>
            {warehouses?.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="כל הקטגוריות" /></SelectTrigger>
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
              <TableHead className="text-right">מוצר</TableHead>
              <TableHead className="text-right">וריאציה</TableHead>
              <TableHead className="text-right">מחסן</TableHead>
              <TableHead className="text-right">כמות</TableHead>
              <TableHead className="text-right w-20">סטטוס</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !filtered.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">אין נתוני מלאי</TableCell></TableRow>
            ) : (
              filtered.map((item) => {
                const variation = item.product_variations as any;
                const product = variation?.products;
                const warehouse = item.warehouses as any;
                const isLow = item.quantity <= LOW_STOCK_THRESHOLD;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{product?.name || "—"}</TableCell>
                    <TableCell>{variation?.name || "—"}</TableCell>
                    <TableCell>{warehouse?.name || "—"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        className="w-20 h-8"
                        min={0}
                        onChange={(e) => handleQuantityChange(item.variation_id, item.warehouse_id, Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      {isLow && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          נמוך
                        </Badge>
                      )}
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

export default InventoryIndex;
