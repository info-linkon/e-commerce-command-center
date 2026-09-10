// Generates public/sitemap.xml with every public route, product and category.
// Runs from the `predev` / `prebuild` npm hooks — plain Node, no extra deps.

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://elwejha.co.il";

function envFromFile() {
  const out = {};
  const file = resolve(".env");
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = { ...envFromFile(), ...process.env };
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function rest(path) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

const STATIC_ENTRIES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/shop", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
];

function urlBlock(path, { changefreq, priority, lastmod } = {}) {
  const ar = `${BASE_URL}${path === "/" ? "/" : path}`;
  const he = `${BASE_URL}/he${path === "/" ? "" : path}`;
  return [
    `  <url>`,
    `    <loc>${ar}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${ar}" />`,
    `    <xhtml:link rel="alternate" hreflang="he" href="${he}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${ar}" />`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    `  </url>`,
  ]
    .filter(Boolean)
    .join("\n");
}

const [categories, products] = await Promise.all([
  rest("categories?select=slug,category_number&order=display_order"),
  rest("products?select=slug,product_number,updated_at&is_published=eq.true&order=product_number"),
]);

const entries = [
  ...STATIC_ENTRIES,
  ...categories
    .map((c) => c.slug || c.category_number)
    .filter(Boolean)
    .map((id) => ({ path: `/category/${id}`, changefreq: "weekly", priority: "0.8" })),
  ...products
    .map((p) => ({ id: p.slug || p.product_number, lastmod: p.updated_at }))
    .filter((p) => !!p.id)
    .map((p) => ({
      path: `/product/${p.id}`,
      changefreq: "weekly",
      priority: "0.7",
      lastmod: p.lastmod ? String(p.lastmod).slice(0, 10) : undefined,
    })),
];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
  ...entries.map((e) => urlBlock(e.path, e)),
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} urls)`);
