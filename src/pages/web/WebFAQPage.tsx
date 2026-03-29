import { useSiteSection } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function WebFAQPage() {
  const { data: section } = useSiteSection("faq", "items");
  const content = (section?.content as any) || defaultContent.faq.items;
  const questions = content.questions || [];
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">الأسئلة الشائعة</h1>
      <div className="space-y-3">
        {questions.map((item: { q: string; a: string }, i: number) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden bg-card">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-right hover:bg-muted transition-colors"
            >
              <span className="font-medium text-foreground">{item.q}</span>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-muted-foreground leading-relaxed animate-fade-in">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
