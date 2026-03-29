import { useSiteContent, useUpsertSiteContent } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const pages = [
  { key: "home", label: "דף הבית", sections: [
    { key: "hero", label: "Hero", fields: [
      { name: "title", label: "כותרת", type: "text" },
      { name: "subtitle", label: "תת כותרת", type: "text" },
      { name: "cta_text", label: "טקסט כפתור", type: "text" },
      { name: "cta_link", label: "קישור כפתור", type: "text" },
    ]},
  ]},
  { key: "about", label: "אודות", sections: [
    { key: "main", label: "תוכן ראשי", fields: [
      { name: "title", label: "כותרת", type: "text" },
      { name: "body", label: "תוכן", type: "textarea" },
      { name: "image", label: "URL תמונה", type: "text" },
    ]},
  ]},
  { key: "contact", label: "צור קשר", sections: [
    { key: "info", label: "פרטי קשר", fields: [
      { name: "phone", label: "טלפון", type: "text" },
      { name: "email", label: "אימייל", type: "text" },
      { name: "address", label: "כתובת", type: "text" },
      { name: "whatsapp", label: "וואטסאפ", type: "text" },
    ]},
  ]},
  { key: "faq", label: "שאלות נפוצות", sections: [] },
  { key: "settings", label: "הגדרות כלליות", sections: [
    { key: "general", label: "הגדרות", fields: [
      { name: "store_name", label: "שם החנות (ערבית)", type: "text" },
      { name: "store_name_he", label: "שם החנות (עברית)", type: "text" },
      { name: "phone", label: "טלפון", type: "text" },
      { name: "email", label: "אימייל", type: "text" },
      { name: "whatsapp", label: "וואטסאפ", type: "text" },
      { name: "instagram", label: "אינסטגרם", type: "text" },
      { name: "facebook", label: "פייסבוק", type: "text" },
      { name: "tiktok", label: "טיקטוק", type: "text" },
    ]},
  ]},
];

function SectionEditor({ page, sectionKey, fields, existingContent }: {
  page: string;
  sectionKey: string;
  fields: { name: string; label: string; type: string }[];
  existingContent: any;
}) {
  const defaults = (defaultContent as any)[page]?.[sectionKey] || {};
  const [values, setValues] = useState<Record<string, string>>({});
  const upsert = useUpsertSiteContent();

  useEffect(() => {
    const merged: Record<string, string> = {};
    fields.forEach((f) => {
      merged[f.name] = existingContent?.[f.name] || defaults[f.name] || "";
    });
    setValues(merged);
  }, [existingContent]);

  const handleSave = () => {
    upsert.mutate({ page, section: sectionKey, content: values });
  };

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="text-sm font-medium text-foreground block mb-1">{field.label}</label>
          {field.type === "textarea" ? (
            <Textarea
              value={values[field.name] || ""}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              rows={4}
            />
          ) : (
            <Input
              value={values[field.name] || ""}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            />
          )}
        </div>
      ))}
      <Button onClick={handleSave} disabled={upsert.isPending}>
        {upsert.isPending ? "שומר..." : "שמור"}
      </Button>
    </div>
  );
}

function FAQEditor({ existingContent }: { existingContent: any }) {
  const defaults = defaultContent.faq.items;
  const [questions, setQuestions] = useState<{ q: string; a: string }[]>([]);
  const upsert = useUpsertSiteContent();

  useEffect(() => {
    setQuestions(existingContent?.questions || defaults.questions || []);
  }, [existingContent]);

  const handleSave = () => {
    upsert.mutate({ page: "faq", section: "items", content: { questions } });
  };

  return (
    <div className="space-y-4">
      {questions.map((item, i) => (
        <div key={i} className="bg-card p-4 rounded-lg border space-y-2">
          <Input
            placeholder="שאלה"
            value={item.q}
            onChange={(e) => {
              const updated = [...questions];
              updated[i] = { ...updated[i], q: e.target.value };
              setQuestions(updated);
            }}
          />
          <Textarea
            placeholder="תשובה"
            value={item.a}
            rows={2}
            onChange={(e) => {
              const updated = [...questions];
              updated[i] = { ...updated[i], a: e.target.value };
              setQuestions(updated);
            }}
          />
          <Button variant="destructive" size="sm" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>
            מחק
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setQuestions([...questions, { q: "", a: "" }])}>
          הוסף שאלה
        </Button>
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? "שומר..." : "שמור"}
        </Button>
      </div>
    </div>
  );
}

export default function WebContentPage() {
  const { data: allContent } = useSiteContent();

  const getContent = (page: string, section: string) => {
    return allContent?.find((c) => c.page === page && c.section === section)?.content as any;
  };

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold text-foreground mb-6">ניהול תוכן האתר</h1>
      <Tabs defaultValue="home">
        <TabsList className="flex-wrap h-auto">
          {pages.map((p) => (
            <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
          ))}
        </TabsList>
        {pages.map((p) => (
          <TabsContent key={p.key} value={p.key} className="space-y-6 mt-4">
            {p.key === "faq" ? (
              <FAQEditor existingContent={getContent("faq", "items")} />
            ) : (
              p.sections.map((sec) => (
                <div key={sec.key}>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{sec.label}</h3>
                  <SectionEditor
                    page={p.key}
                    sectionKey={sec.key}
                    fields={sec.fields}
                    existingContent={getContent(p.key, sec.key)}
                  />
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
