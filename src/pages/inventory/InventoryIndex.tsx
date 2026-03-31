import { useState, useMemo } from "react";
import { Search, AlertTriangle, Warehouse, Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useInventory } from "@/hooks/useInventory";
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from "@/hooks/useWarehouses";
import { useCategories } from "@/hooks/useCategories";
import { WarehouseDialog } from "@/components/inventory/WarehouseDialog";
import { Tables } from "@/integrations/supabase/types";

type WarehouseType = Tables<"warehouses">;
const LOW_STOCK_THRESHOLD = 5;

const InventoryIndex = () => {
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"warehouse" | "aggregated">("warehouse");
  const { data: inventoryData, isLoading } = useInventory(warehouseFilter === "all" ? undefined : warehouseFilter);
  const { data: warehouses } = useWarehouses();
  const { data: categories } = useCategories();

  const [whManagerOpen, setWhManagerOpen] = useState(false);
  const [whDialogOpen, setWhDialogOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<WarehouseType | null>(null);
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const handleWhSave = (data: { name: string; address: string; is_active: boolean }) => {
    if (editingWh) {
      updateWarehouse.mutate({ id: editingWh.id, ...data }, { onSuccess: () => setWhDialogOpen(false) });
    } else {
      createWarehouse.mutate(data, { onSuccess: () => setWhDialogOpen(false) });
    }
  };

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

  const aggregated = useMemo(() => {
    if (viewMode !== "aggregated" || !filtered.length) return [];
    const map = new Map<string, { variation_id: string; product_name: string; variation_name: string; total_qty: number; warehouses: string[] }>();
    for (const item of filtered) {
      const variation = item.product_variations as any;
      const product = variation?.products;
      const warehouse = item.warehouses as any;
      const key = item.variation_id;
      const existing = map.get(key);
      if (existing) {
        existing.total_qty += item.quantity;
        if (warehouse?.name) existing.warehouses.push(`${warehouse.name}: ${item.quantity}`);
      } else {
        map.set(key, {
          variation_id: item.variation_id,
          product_name: product?.name || "—",
          variation_name: variation?.name || "—",
          total_qty: item.quantity,
          warehouses: warehouse?.name ? [`${warehouse.name}: ${item.quantity}`] : [],
        });
      }
    }
    return Array.from(map.values());
  }, [filtered, viewMode]);

  const warehouseColumns: ColumnDef<any>[] = [
    { label: "מוצר", render: (item) => <span className="font-medium">{(item.product_variations as any)?.products?.name || "—"}</span> },
    { label: "וריאציה", render: (item) => (item.product_variations as any)?.name || "—" },
    { label: "מחסן", render: (item) => (item.warehouses as any)?.name || "—", hideOnMobile: true },
    { label: "כמות", render: (item) => <span className="font-medium">{item.quantity}</span> },
    {
      label: "סטטוס",
      render: (item) => item.quantity <= LOW_STOCK_THRESHOLD ? (
        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />נמוך</Badge>
      ) : null,
    },
  ];

  const aggregatedColumns: ColumnDef<any>[] = [
    { label: "מוצר", render: (item) => <span className="font-medium">{item.product_name}</span> },
    { label: "וריאציה", render: (item) => item.variation_name },
    { label: "סה״כ", render: (item) => <span className="font-bold text-lg">{item.total_qty}</span> },
    { label: "פירוט", render: (item) => <span className="text-sm text-muted-foreground">{item.warehouses.join(" | ")}</span>, hideOnMobile: true },
    {
      label: "סטטוס",
      render: (item) => item.total_qty <= LOW_STOCK_THRESHOLD ? (
        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />נמוך</Badge>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">תצוגת מלאי</h1>
        <Button variant="outline" onClick={() => setWhManagerOpen(true)}>
          <Warehouse className="ml-2 h-4 w-4" />
          <span className="hidden sm:inline">ניהול מחסנים</span>
          <span className="sm:hidden">מחסנים</span>
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="warehouse">לפי מחסן</TabsTrigger>
            <TabsTrigger value="aggregated">
              <Layers className="ml-1 h-3 w-3" />
              מצטבר
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-36">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        {viewMode === "warehouse" && (
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-32 sm:w-44"><SelectValue placeholder="כל המחסנים" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המחסנים</SelectItem>
              {warehouses?.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 sm:w-44"><SelectValue placeholder="כל הקטגוריות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewMode === "warehouse" ? (
        <MobileCardList
          data={filtered}
          columns={warehouseColumns}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyMessage="אין נתוני מלאי"
          mobileCard={(item) => {
            const variation = item.product_variations as any;
            const product = variation?.products;
            const warehouse = item.warehouses as any;
            const isLow = item.quantity <= LOW_STOCK_THRESHOLD;
            return (
              <div>
                <div className="flex justify-between items-start">
                  {isLow ? <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />נמוך</Badge> : <span />}
                  <span className="font-medium">{product?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="font-bold">{item.quantity}</span>
                  <span className="text-muted-foreground">{variation?.name} • {warehouse?.name}</span>
                </div>
              </div>
            );
          }}
        />
      ) : (
        <MobileCardList
          data={aggregated}
          columns={aggregatedColumns}
          keyExtractor={(item) => item.variation_id}
          isLoading={isLoading}
          emptyMessage="אין נתוני מלאי"
          mobileCard={(item) => {
            const isLow = item.total_qty <= LOW_STOCK_THRESHOLD;
            return (
              <div>
                <div className="flex justify-between items-start">
                  {isLow ? <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />נמוך</Badge> : <span />}
                  <span className="font-medium">{item.product_name}</span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="font-bold text-lg">{item.total_qty}</span>
                  <span className="text-muted-foreground">{item.variation_name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{item.warehouses.join(" | ")}</div>
              </div>
            );
          }}
        />
      )}

      {/* Warehouses Manager Dialog */}
      <Dialog open={whManagerOpen} onOpenChange={setWhManagerOpen}>
        <DialogContent className="sm:max-w-xl w-[95vw]" dir="rtl">
          <DialogHeader>
            <DialogTitle>ניהול מחסנים</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setEditingWh(null); setWhDialogOpen(true); }}>
                <Plus className="ml-1 h-4 w-4" />
                מחסן חדש
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>כתובת</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead className="w-24">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!warehouses?.length ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">אין מחסנים</TableCell></TableRow>
                ) : (
                  warehouses.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>{w.address || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={w.is_active ? "default" : "secondary"}>
                          {w.is_active ? "פעיל" : "לא פעיל"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingWh(w); setWhDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteWarehouse.mutate(w.id)}>
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

      <WarehouseDialog
        open={whDialogOpen}
        onOpenChange={setWhDialogOpen}
        warehouse={editingWh}
        onSave={handleWhSave}
        loading={createWarehouse.isPending || updateWarehouse.isPending}
      />
    </div>
  );
};

export default InventoryIndex;
