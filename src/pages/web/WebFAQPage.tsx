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
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">الأسئلة الشائعة</h1>
      <div className="space-y-3">
        {questions.map((item: { q: string; a: string }, i: number) => (
          <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-right hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-900">{item.q}</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-gray-600 leading-relaxed">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
