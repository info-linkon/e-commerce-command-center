import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import StatsCards from "@/components/dashboard/StatsCards";
import SalesChart from "@/components/dashboard/SalesChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import LowStockAlerts from "@/components/dashboard/LowStockAlerts";

const Dashboard = () => {
  const [period, setPeriod] = useState("today");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;

    if (period === "custom") {
      start = fromDate || new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = toDate ? new Date(toDate) : new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "week") {
      start = new Date(now);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
    } else {
      // month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [period, fromDate, toDate]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">דשבורד</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)} variant="outline" className="gap-1" dir="rtl">
            <ToggleGroupItem value="today" className="rounded-full px-3 h-8 text-xs">היום</ToggleGroupItem>
            <ToggleGroupItem value="week" className="rounded-full px-3 h-8 text-xs">השבוע</ToggleGroupItem>
            <ToggleGroupItem value="month" className="rounded-full px-3 h-8 text-xs">החודש</ToggleGroupItem>
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
      <StatsCards startDate={dateRange.startDate} endDate={dateRange.endDate} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
        <div className="space-y-6">
          <RecentActivity />
          <LowStockAlerts />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
