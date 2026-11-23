import { useState } from "react";
import { Printer, Minus, Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PrintLabelButtonProps {
  /** Called with the number of boxes chosen (1 = a single, unnumbered label). */
  onPrint: (packages: number) => Promise<unknown> | void;
  label?: string;
  /** Number of orders being printed — shown in the dialog for bulk printing. */
  orderCount?: number;
  iconOnly?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  disabled?: boolean;
}

/** "Print label" button that first asks how many boxes the order is packed in. */
const PrintLabelButton = ({
  onPrint,
  label = "הדפס מדבקה",
  orderCount = 1,
  iconOnly,
  variant = "outline",
  size = "sm",
  className,
  disabled,
}: PrintLabelButtonProps) => {
  const [open, setOpen] = useState(false);
  const [boxes, setBoxes] = useState(1);
  const [printing, setPrinting] = useState(false);

  const n = Math.max(1, Math.min(50, Math.floor(boxes) || 1));

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await onPrint(n);
      setOpen(false);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        className={className}
        disabled={disabled}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          setBoxes(1);
          setOpen(true);
        }}
      >
        <Printer className={iconOnly ? "h-4 w-4" : "h-4 w-4 ml-1"} />
        {!iconOnly && label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs" dir="rtl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>כמה קרטונים?</DialogTitle>
            <DialogDescription>
              {orderCount > 1
                ? `יודפסו ${n} מדבקות לכל אחת מ-${orderCount} ההזמנות (${n * orderCount} סה״כ).`
                : n > 1
                  ? `יודפסו ${n} מדבקות ממוספרות: 1/${n} … ${n}/${n}`
                  : "תודפס מדבקה אחת."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex items-center justify-center gap-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              handlePrint();
            }}
          >
            <Button type="button" variant="outline" size="icon" onClick={() => setBoxes(Math.max(1, n - 1))} aria-label="פחות">
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              autoFocus
              value={boxes}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setBoxes(Number(e.target.value))}
              className="w-20 text-center text-2xl font-bold h-12"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setBoxes(Math.min(50, n + 1))} aria-label="יותר">
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((k) => (
              <Button key={k} type="button" size="sm" variant={k === n ? "default" : "outline"} className="w-9" onClick={() => setBoxes(k)}>
                {k}
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={handlePrint} disabled={printing}>
              <Printer className="h-4 w-4 ml-1" />
              {printing ? "מכין להדפסה…" : `הדפס ${n * orderCount > 1 ? `${n * orderCount} מדבקות` : "מדבקה"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PrintLabelButton;
