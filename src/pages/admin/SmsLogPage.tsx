import { useState } from "react";
import { History, Search, CheckCircle2, XCircle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MobileCardList, ColumnDef } from "@/components/ui/mobile-card-list";
import { useSmsLog, useSmsLogStats, SmsLogRow } from "@/hooks/useSmsLog";

const EVENT_LABELS: Record<string, string> = {
  manual_sms: "ידני / בדיקה",
  otp_code: "קוד אימות",
  order_created: "הזמנה נוצרה",
  order_shipped: "הזמנה נשלחה",
  order_completed: "הזמנה הושלמה",
  order_picking: "ליקוט",
  order_shipping: "במשלוח",
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SmsLogPage = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "sent" | "failed">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useSmsLog({
    search,
    status,
    fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate: toDate ? new Date(toDate + "T23:59:59").toISOString() : undefined,
    page,
    pageSize,
  });
  const { data: stats } = useSmsLogStats();

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const columns: ColumnDef<SmsLogRow>[] = [
    {
      label: "תאריך",
      render: (r) => <span className="text-sm whitespace-nowrap">{formatDate(r.created_at)}</span>,
    },
    {
      label: "נמען",
      render: (r) => <span className="font-mono text-sm" dir="ltr">{r.recipient}</span>,
    },
    {
      label: "סוג",
      render: (r) => (
        <Badge variant="outline" className="text-xs">
          {EVENT_LABELS[r.event_key] || r.event_key}
        </Badge>
      ),
    },
    {
      label: "תוכן",
      render: (r) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm line-clamp-1 max-w-[300px] cursor-help">
                {r.body || "-"}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <p className="whitespace-pre-wrap">{r.body || "-"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      label: "סטטוס",
      render: (r) =>
        r.status === "sent" ? (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400 border-transparent">
            <CheckCircle2 className="h-3 w-3" />
            נשלח
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            נכשל
          </Badge>
        ),
    },
    {
      label: "שגיאה",
      hideOnMobile: false,
      render: (r) =>
        r.error ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-destructive line-clamp-1 max-w-[200px] cursor-help">
                  {r.error}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p className="whitespace-pre-wrap">{r.error}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <History className="h-6 w-6" />
        יומן הודעות SMS
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">סך הכל נשלחו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.sent ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">נכשלו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats?.failed ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">היום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.today ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי טלפון / תוכן / סוג..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pr-9"
            />
          </div>
          <Select value={status} onValueChange={(v: "all" | "sent" | "failed") => { setStatus(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="sent">נשלחו בהצלחה</SelectItem>
              <SelectItem value="failed">נכשלו</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              placeholder="מתאריך"
              className="pr-9"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              placeholder="עד תאריך"
              className="pr-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <MobileCardList
        data={rows}
        columns={columns}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="לא נמצאו הודעות"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-sm text-muted-foreground">
            עמוד {page + 1} מתוך {totalPages} ({total} סה"כ)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronRight className="h-4 w-4" />
              הקודם
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              הבא
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsLogPage;