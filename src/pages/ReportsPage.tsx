import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OverviewTab from "@/components/reports/OverviewTab";
import SalesTab from "@/components/reports/SalesTab";
import InventoryLogTab from "@/components/reports/InventoryLogTab";
import CashflowTab from "@/components/reports/CashflowTab";
import ExpensesTab from "@/components/reports/ExpensesTab";
import ProfitabilityTab from "@/components/reports/ProfitabilityTab";

const ReportsPage = () => {
  const [period, setPeriod] = useState("30");

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold">דוחות</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ימים</SelectItem>
            <SelectItem value="30">30 יום</SelectItem>
            <SelectItem value="90">90 יום</SelectItem>
            <SelectItem value="365">שנה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="sales">מכירות ומוצרים</TabsTrigger>
          <TabsTrigger value="inventory-log">תנועות מלאי</TabsTrigger>
          <TabsTrigger value="cashflow">קופות ותשלומים</TabsTrigger>
          <TabsTrigger value="expenses">הוצאות</TabsTrigger>
          <TabsTrigger value="profitability">רווחיות</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab startDate={startDate} />
        </TabsContent>
        <TabsContent value="sales">
          <SalesTab startDate={startDate} />
        </TabsContent>
        <TabsContent value="inventory-log">
          <InventoryLogTab startDate={startDate} />
        </TabsContent>
        <TabsContent value="cashflow">
          <CashflowTab startDate={startDate} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab startDate={startDate} />
        </TabsContent>
        <TabsContent value="profitability">
          <ProfitabilityTab startDate={startDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
