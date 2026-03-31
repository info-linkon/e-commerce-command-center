import { useState } from "react";
import { Search, Plus, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useCustomers, useCreateCustomer, useCustomer, useCustomerOrders } from "@/hooks/useCustomers";

const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useCustomers(search || undefined);
  const createCustomer = useCreateCustomer();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", notes: "" });

  const { data: selectedCustomer } = useCustomer(detailId || undefined);
  const { data: customerOrders } = useCustomerOrders(detailId || undefined);

  const stats = customerOrders ? {
    totalOrders: customerOrders.length,
    ltv: customerOrders.reduce((sum, o) => sum + Number(o.total), 0),
    avgOrder: customerOrders.length > 0 ? customerOrders.reduce((sum, o) => sum + Number(o.total), 0) / customerOrders.length : 0,
  } : null;

  const handleCreate = () => {
    createCustomer.mutate(
      { name: form.name, phone: form.phone || null, email: form.email || null, city: form.city || null, notes: form.notes || null },
      { onSuccess: () => { setDialogOpen(false); setForm({ name: "", phone: "", email: "", city: "", notes: "" }); } }
    );
  };

  const data = customers || [];

  const columns: ColumnDef<any>[] = [
    { label: "שם", render: (c) => <span className="font-medium">{c.name}</span> },
    { label: "טלפון", render: (c) => <span dir="ltr" className="text-right">{c.phone || "—"}</span> },
    { label: "אימייל", render: (c) => c.email || "—", hideOnMobile: true },
    { label: "עיר", render: (c) => c.city || "—", hideOnMobile: true },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">לקוחות</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />לקוח חדש
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="חיפוש לפי שם, טלפון או אימייל..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      <MobileCardList
        data={data}
        columns={columns}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="אין לקוחות"
        onRowClick={(c) => setDetailId(c.id)}
        mobileCard={(c) => (
          <div>
            <div className="font-medium">{c.name}</div>
            <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
              <span>{c.city || ""}</span>
              <span dir="ltr">{c.phone || "—"}</span>
            </div>
          </div>
        )}
        actions={(c) => (
          <Button variant="ghost" size="icon" onClick={() => setDetailId(c.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      {/* New Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw]" dir="rtl">
          <DialogHeader><DialogTitle>לקוח חדש</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>שם *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="text-right" /></div>
            <div><Label>אימייל</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="text-right" /></div>
            <div><Label>עיר</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleCreate} disabled={!form.name || createCustomer.isPending}>
              {createCustomer.isPending ? "שומר..." : "צור לקוח"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl w-[95vw]" dir="rtl">
          <DialogHeader><DialogTitle>כרטיס לקוח — {selectedCustomer?.name}</DialogTitle></DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">טלפון:</span> {selectedCustomer.phone || "—"}</div>
                <div><span className="text-muted-foreground">אימייל:</span> {selectedCustomer.email || "—"}</div>
                <div><span className="text-muted-foreground">עיר:</span> {selectedCustomer.city || "—"}</div>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-xl sm:text-2xl font-bold">₪{stats.ltv.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">LTV</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-xl sm:text-2xl font-bold">{stats.totalOrders}</div>
                      <div className="text-xs text-muted-foreground">הזמנות</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-xl sm:text-2xl font-bold">₪{stats.avgOrder.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">ממוצע</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">היסטוריית הזמנות</h4>
                <div className="border rounded-lg max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">מס׳</TableHead>
                        <TableHead className="text-right">סה״כ</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="text-right">תאריך</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!customerOrders?.length ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">אין הזמנות</TableCell></TableRow>
                      ) : (
                        customerOrders.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell>#{o.order_number}</TableCell>
                            <TableCell>₪{Number(o.total).toFixed(2)}</TableCell>
                            <TableCell><Badge variant="secondary">{o.status}</Badge></TableCell>
                            <TableCell>{new Date(o.created_at).toLocaleDateString("he-IL")}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
