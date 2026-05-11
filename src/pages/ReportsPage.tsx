import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import OverviewTab from "@/components/reports/OverviewTab";
import SalesTab from "@/components/reports/SalesTab";
import InventoryLogTab from "@/components/reports/InventoryLogTab";
import CashflowTab from "@/components/reports/CashflowTab";
import ExpensesTab from "@/components/reports/ExpensesTab";
import ProfitabilityTab from "@/components/reports/ProfitabilityTab";
// OrderTypeTab removed — invoice with/without view no longer relevant
import ActivityLogTab from "@/components/reports/ActivityLogTab";

const ReportsPage = () => {
  const [period, setPeriod] = useState("today");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const startDate = useMemo(() => {
    if (period === "custom") {
      if (fromDate) return fromDate.toISOString();
      // Default to 30 days ago when custom dates not yet selected
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    const now = new Date();
    if (period === "today") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d.toISOString();
    }
    if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (period === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.toISOString();
    }
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period, fromDate]);

  const endDate = useMemo(() => {
    if (period === "custom" && toDate) {
      // Set to end of day
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    return undefined;
  }, [period, toDate]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold">דוחות</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)} variant="outline" className="gap-1" dir="rtl">
            <ToggleGroupItem value="today" className="rounded-full px-3 h-8 text-xs">היום</ToggleGroupItem>
            <ToggleGroupItem value="week" className="rounded-full px-3 h-8 text-xs">השבוע</ToggleGroupItem>
            <ToggleGroupItem value="month" className="rounded-full px-3 h-8 text-xs">החודש</ToggleGroupItem>
            <ToggleGroupItem value="7" className="rounded-full px-3 h-8 text-xs">7 ימים</ToggleGroupItem>
            <ToggleGroupItem value="30" className="rounded-full px-3 h-8 text-xs">30 יום</ToggleGroupItem>
            <ToggleGroupItem value="90" className="rounded-full px-3 h-8 text-xs">90 יום</ToggleGroupItem>
            <ToggleGroupItem value="365" className="rounded-full px-3 h-8 text-xs">שנה</ToggleGroupItem>
            <ToggleGroupItem value="custom" className="rounded-full px-3 h-8 text-xs">טווח מותאם</ToggleGroupItem>
          </ToggleGroup>

          {period === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy") : "מתאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd/MM/yyyy") : "עד תאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 justify-start" dir="rtl">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="sales">מכירות ומוצרים</TabsTrigger>
          <TabsTrigger value="inventory-log">תנועות מלאי</TabsTrigger>
          <TabsTrigger value="cashflow">קופות ותשלומים</TabsTrigger>
          <TabsTrigger value="expenses">הוצאות</TabsTrigger>
          <TabsTrigger value="profitability">רווחיות</TabsTrigger>
          <TabsTrigger value="activity-log">לוג פעילות</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="sales">
          <SalesTab startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="inventory-log">
          <InventoryLogTab startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="cashflow">
          <CashflowTab startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="profitability">
          <ProfitabilityTab startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="activity-log">
          <ActivityLogTab startDate={startDate} endDate={endDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
