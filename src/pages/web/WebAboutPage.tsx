import { useSiteSection } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";

export default function WebAboutPage() {
  const { data: section } = useSiteSection("about", "main");
  const content = (section?.content as any) || defaultContent.about.main;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">{content.title || "من نحن"}</h1>
      {content.image && (
        <img src={content.image} alt="" className="w-full rounded-xl mb-8 border border-border" />
      )}
      <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
        {content.body}
      </div>
    </div>
  );
}
