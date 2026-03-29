import { useSiteSection } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function WebFAQPage() {
  const { data: section } = useSiteSection("faq", "items");
  const content = (section?.content as any) || defaultContent.faq.items;
  const questions = content.questions || [];

  return (
    <div className="container py-8 md:py-12 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">الأسئلة الشائعة</h1>
      <p className="text-muted-foreground mb-8">إجابات على الأسئلة الأكثر شيوعاً</p>

      <Accordion type="single" collapsible className="w-full">
        {questions.map((item: { q: string; a: string }, i: number) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-right">{item.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
