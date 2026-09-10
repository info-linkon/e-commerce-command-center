import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/hooks/useLanguage";

const SITE = "https://elwejha.co.il";

export interface SeoProps {
  /** Title without the brand suffix. */
  title: string;
  description?: string;
  /** Language-neutral path, e.g. "/product/tent-4". */
  path: string;
  image?: string | null;
  type?: "website" | "product" | "article";
  noindex?: boolean;
  /** Extra structured data (Product, ItemList, ...). */
  jsonLd?: Record<string, any> | Record<string, any>[];
}

function clean(text?: string | null, max = 155) {
  if (!text) return "";
  const plain = String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trim()}…` : plain;
}

/** Per-route <head> tags: title, description, canonical, hreflang, OG/Twitter. */
export function Seo({ title, description, path, image, type = "website", noindex, jsonLd }: SeoProps) {
  const { lang } = useLanguage();

  const basePath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  const arUrl = `${SITE}${basePath || "/"}`;
  const heUrl = `${SITE}/he${basePath}`;
  const canonical = lang === "he" ? heUrl : arUrl;

  const fullTitle = title.includes("ELWEJHA") ? title : `${title} | ELWEJHA الوجهة`;
  const desc = clean(description);
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <html lang={lang === "he" ? "he" : "ar"} dir="rtl" />
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={arUrl} />
      <link rel="alternate" hrefLang="he" href={heUrl} />
      <link rel="alternate" hrefLang="x-default" href={arUrl} />

      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={lang === "he" ? "he_IL" : "ar_IL"} />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta name="twitter:image" content={image} />}

      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

export default Seo;
