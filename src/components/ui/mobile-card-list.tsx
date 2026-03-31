import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ColumnDef<T> {
  label: string;
  render: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
  className?: string;
}

interface MobileCardListProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  mobileCard?: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function MobileCardList<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  actions,
  mobileCard,
  isLoading = false,
  emptyMessage = "אין נתונים",
}: MobileCardListProps<T>) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">טוען...</div>;
  }

  if (!data.length) {
    return <div className="py-12 text-center text-muted-foreground">{emptyMessage}</div>;
  }

  // Mobile: cards
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <Card
            key={keyExtractor(item)}
            className={`p-3 ${onRowClick ? "cursor-pointer active:bg-muted/50" : ""}`}
            onClick={() => onRowClick?.(item)}
          >
            {mobileCard ? (
              mobileCard(item)
            ) : (
              <div className="space-y-1.5">
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((col, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground text-xs">{col.label}</span>
                      <span className={col.className}>{col.render(item)}</span>
                    </div>
                  ))}
                {actions && (
                  <div className="flex justify-end gap-1 pt-1 border-t border-border mt-2" onClick={(e) => e.stopPropagation()}>
                    {actions(item)}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: table
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} className={`text-right ${col.className || ""}`}>
                {col.label}
              </TableHead>
            ))}
            {actions && <TableHead className="text-right w-24">פעולות</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col, idx) => (
                <TableCell key={idx} className={col.className}>
                  {col.render(item)}
                </TableCell>
              ))}
              {actions && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {actions(item)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
