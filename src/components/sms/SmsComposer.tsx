import { useRef, useState } from "react";
import { Smile } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SMS_MAX_CHARS, countSmsChars, smsSegments, EMOJI_LIST } from "@/lib/sms-text";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

const SmsComposer = ({ value, onChange, placeholder, rows = 5 }: Props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const len = countSmsChars(value);
  const segments = smsSegments(value);
  const over = len > SMS_MAX_CHARS;

  const insert = (emoji: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    if (countSmsChars(next) > SMS_MAX_CHARS) return;
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleChange = (v: string) => {
    if (countSmsChars(v) > SMS_MAX_CHARS && v.length > value.length) return;
    onChange(v);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder || "תוכן ההודעה..."}
          className="pb-9"
        />
        <div className="absolute bottom-2 left-2">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 pointer-events-auto" align="start">
              <div className="grid grid-cols-8 gap-1 max-h-56 overflow-auto">
                {EMOJI_LIST.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insert(e)}
                    className="text-lg hover:bg-muted rounded p-1 leading-none"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", over ? "text-destructive" : "text-muted-foreground")}>
          {len} / {SMS_MAX_CHARS} תווים
        </span>
        <span className="text-muted-foreground">≈ {segments} מקטעי SMS</span>
      </div>
    </div>
  );
};

export default SmsComposer;