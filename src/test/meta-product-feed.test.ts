import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Exercise the deployed handler with database fixtures, including every item path.
async function renderFeed(query: string) {
  const tables: Record<string, unknown[]> = {
    products: [
      { id: "simple", product_number: 1, name: "פשוט", sale_price: 50 },
      { id: "variable", product_number: 2, name: "משתנה", sale_price: 60 },
      { id: "bundle", product_number: 3, name: "מארז", sale_price: 70 },
      { id: "variable-bundle", product_number: 4, name: "מארז משתנה", sale_price: 80 },
    ],
    product_variations: [
      { id: "v1", product_id: "variable", name: "קטן", sku: "small" },
      { id: "v2", product_id: "variable", name: "גדול", sku: "large" },
    ],
    bundles: [
      { id: "b1", product_id: "bundle", bundle_type: "simple_bundle" },
      { id: "b2", product_id: "variable-bundle", bundle_type: "variable_bundle" },
    ],
    bundle_variations: [{ id: "bv1", bundle_id: "b2", name_he: "גדול", sku: "bundle-large" }],
  };
  const createClient = () => ({
    from: (table: string) => ({
      select: () => {
        const result = { data: tables[table] || [], error: null };
        return { ...result, eq: () => result };
      },
    }),
  });
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync("supabase/functions/meta-product-feed/index.ts", "utf8")
    .replace(/^import .*;\r?\n/, "");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  });
  new Function("createClient", "Deno", outputText)(createClient, {
    env: { get: () => "test" },
    serve: (callback: typeof handler) => { handler = callback; },
  });
  if (!handler) throw new Error("Feed handler was not registered");
  return (await handler(new Request(`https://example.com/feed${query}`))).text();
}

describe("Meta language feed", () => {
  it("sets he_IL on every Hebrew product, variation and bundle", async () => {
    const xml = await renderFeed("?lang=he");
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.match(/<g:override>he_IL<\/g:override>/g)).toHaveLength(1);
    }
  });

  it("leaves the default Arabic feed without a Hebrew override", async () => {
    const xml = await renderFeed("");
    expect(xml).not.toContain("<g:override>");
    expect(xml.match(/<item>/g)).toHaveLength(5);
  });
});