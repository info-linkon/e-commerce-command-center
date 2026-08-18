import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Bilingual RTL breadcrumb trail with schema.org BreadcrumbList JSON-LD.
 */
export function WebBreadcrumb({ items }: { items: Crumb[] }) {
  const { t, localizedPath } = useLanguage();

  const crumbs: Crumb[] = [{ label: t("الرئيسية", "ראשי"), to: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.to ? { item: `${window.location.origin}${localizedPath(c.to)}` } : {}),
    })),
  };

  return (
    <nav aria-label={t("مسار التنقل", "ניווט")} className="mb-4" dir="rtl">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            {c.to && i < crumbs.length - 1 ? (
              <Link to={localizedPath(c.to)} className="hover:text-gold transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium line-clamp-1">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
