import { useState } from "react";
import { Truck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDeliveryCompanies, useCreateDeliveryCompany, useUpdateDeliveryCompany } from "@/hooks/useDeliveryCompanies";
import { useCashRegisters } from "@/hooks/useCashRegisters";

const DeliveryCompaniesPage = () => {
  const { data: companies, isLoading } = useDeliveryCompanies();
  const { data: registers } = useCashRegisters();
  const createCompany = useCreateDeliveryCompany();
  const updateCompany = useUpdateDeliveryCompany();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [cashRegisterId, setCashRegisterId] = useState<string>("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createCompany.mutate(
      { name: name.trim(), is_internal: isInternal, cash_register_id: cashRegisterId && cashRegisterId !== "none" ? cashRegisterId : null },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setIsInternal(false);
          setCashRegisterId("");
        },
      }
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          חברות משלוח
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />הוסף חברה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>חברת משלוח חדשה</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>שם</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם החברה" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isInternal} onCheckedChange={setIsInternal} />
                <Label>שליח פנימי</Label>
              </div>
              <div>
                <Label>קופה משויכת (אופציונלי)</Label>
                <Select value={cashRegisterId} onValueChange={setCashRegisterId}>
                  <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא</SelectItem>
                    {registers?.filter(r => r.is_active).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!name.trim() || createCompany.isPending} className="w-full">
                {createCompany.isPending ? "יוצר..." : "צור חברה"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">טוען...</div>
          ) : !companies?.length ? (
            <div className="py-12 text-center text-muted-foreground">אין חברות משלוח</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">קופה</TableHead>
                  <TableHead className="text-right">פעיל</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_internal ? "default" : "outline"}>
                        {c.is_internal ? "פנימי" : "חיצוני"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.cash_registers?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(checked) => updateCompany.mutate({ id: c.id, is_active: checked })}
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

export default DeliveryCompaniesPage;
