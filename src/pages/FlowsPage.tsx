import { useEffect, useRef, useCallback, useState } from "react";
import mermaid from "mermaid";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  Package,
  Layers,
  Wallet,
  Receipt,
  RefreshCw,
  Truck,
} from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    primaryColor: "#c8923c",
    primaryTextColor: "#1a1a1a",
    primaryBorderColor: "#b07a2e",
    lineColor: "#8a7560",
    secondaryColor: "#f5f0e8",
    tertiaryColor: "#faf7f2",
    fontFamily: "system-ui, sans-serif",
  },
});

interface FlowDef {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  diagram: string;
}

const flows: FlowDef[] = [
  {
    id: "order-flow",
    title: "Flow הזמנה מלא (A → Z)",
    description: "מקבלת הזמנה מאתר/קופה עד סגירה סופית",
    icon: <ShoppingCart className="h-5 w-5" />,
    diagram: `flowchart TD
    A[WooCommerce Webhook] -->|הזמנה חדשה| B[orders table]
    A2[קופה POS] -->|הזמנה ידנית| B
    B --> C{שיוך למחסן}
    C --> D[assigned_warehouse_id]
    D --> E[מסך ליקוט - picking_status: not_started]
    E --> F[עובד מאשר פריטים אחד אחד]
    F --> G[picking_status: in_progress]
    G --> H{כל הפריטים לוקטו?}
    H -->|לא| F
    H -->|כן| I[picking_status: completed]
    I --> J{בחירת משלוח}
    J -->|עובד פנימי| K[deliveries - delivery_company is_internal=true]
    J -->|חברה חיצונית| L[deliveries - delivery_company is_internal=false]
    K --> M[status: in_transit]
    L --> M
    M --> N[מסירה ללקוח]
    N --> O[status: delivered]
    O --> P[רישום תשלום - payments table]
    P --> Q[עדכון קופת המוסר - cash_register]
    Q --> R[הורדת מלאי - inventory & inventory_log]
    R --> S[סנכרון מלאי ל-WooCommerce]
    S --> T[הזמנה completed ✅]

    style A fill:#e8d5b7,stroke:#b07a2e
    style A2 fill:#e8d5b7,stroke:#b07a2e
    style T fill:#c8e6c9,stroke:#2e7d32`,
  },
  {
    id: "inventory-flow",
    title: "ניהול מלאי",
    description: "קליטה, העברה, מכירה, התאמה + לוג מדויק לכל פריט",
    icon: <Package className="h-5 w-5" />,
    diagram: `flowchart TD
    A[קליטת מלאי חדש] -->|intake| B[inventory table]
    C[מכירה / הזמנה] -->|sale| B
    D[העברה בין מחסנים] -->|transfer_out + transfer_in| B
    E[התאמת מלאי ידנית] -->|adjustment| B

    B --> F[inventory_log]
    F --> G[variation_id + warehouse_id]
    F --> H[quantity_change + quantity_after]
    F --> I[action_type + reference_id]
    F --> J[created_by + timestamp]

    B --> K{סנכרון WooCommerce}
    K --> L[עדכון stock ב-API]

    D --> M[inventory_transfers table]
    M --> N[inventory_transfer_items]
    N --> O[status: pending → completed]

    style A fill:#c8e6c9,stroke:#2e7d32
    style C fill:#ffcdd2,stroke:#c62828
    style D fill:#bbdefb,stroke:#1565c0
    style E fill:#fff9c4,stroke:#f9a825`,
  },
  {
    id: "product-structure",
    title: "מבנה מוצר",
    description: "פריטים, וריאציות, מארזים וקשרים ביניהם",
    icon: <Layers className="h-5 w-5" />,
    diagram: `flowchart TD
    A[products] --> B{product_type}
    B -->|simple| C[מוצר פשוט - ווריאציה אחת]
    B -->|variable| D[מוצר עם ווריאציות]

    D --> E[product_variations]
    E --> F[name + sku + price + cost_price]
    E --> G[image_url + woo_id]

    A --> H{האם מארז?}
    H -->|כן| I[bundles table]
    I --> J{bundle_type}
    J -->|simple_bundle| K[bundle_items]
    K --> L[variation_id + quantity]
    J -->|variable_bundle| M[bundle_variations]
    M --> N[bundle_variation_items]
    N --> O[variation_id + quantity per variation]

    A --> P[category_id → categories]
    A --> Q[woo_id - סנכרון WooCommerce]

    E --> R[inventory - מלאי per warehouse]
    R --> S[quantity tracked per variation per warehouse]

    style A fill:#e8d5b7,stroke:#b07a2e
    style I fill:#d1c4e9,stroke:#5e35b1
    style E fill:#bbdefb,stroke:#1565c0`,
  },
  {
    id: "cash-flow",
    title: "Flow כספי — קופות",
    description: "כסף ממכירה → קופת עובד/שליח → קופה ראשית",
    icon: <Wallet className="h-5 w-5" />,
    diagram: `flowchart TD
    A[הזמנה הושלמה] --> B[payments table]
    B --> C{payment_method}
    C -->|cash| D[cash_register של המוסר]
    C -->|bit| E[רישום ללא קופה]
    C -->|credit| E

    D --> F[current_balance עולה]
    
    G[חברת משלוחים חיצונית] --> H[cash_register של החברה]
    H --> F2[current_balance של החברה עולה]

    D --> I{העברה לקופה ראשית}
    H --> I
    I --> J[cash_transfers table]
    J --> K[from_register_id → to_register_id]
    K --> L[MAIN_REG - קופה ראשית]
    L --> M[current_balance של המקור יורד]
    L --> N[current_balance של הראשית עולה]

    O[הוצאה מקופה] --> P[expenses table]
    P --> Q[cash_register_id - יורד מהקופה]

    style A fill:#c8e6c9,stroke:#2e7d32
    style L fill:#fff9c4,stroke:#f9a825
    style P fill:#ffcdd2,stroke:#c62828`,
  },
  {
    id: "expenses-flow",
    title: "הוצאות עסקיות",
    description: "רישום הוצאה + מקור תשלום + מסמך חשבונאי",
    icon: <Receipt className="h-5 w-5" />,
    diagram: `flowchart TD
    A[רישום הוצאה חדשה] --> B[expenses table]
    B --> C{payment_source}
    C -->|credit_card| D[אשראי העסק - לא משפיע על קופות]
    C -->|cash_register| E[cash_register_id]
    E --> F[current_balance יורד]

    B --> G[description + amount]
    B --> H[document_file / document_url]
    H --> I[צילום חשבונית / קבלה]
    B --> J[created_by - מי רשם]

    style A fill:#e8d5b7,stroke:#b07a2e
    style D fill:#bbdefb,stroke:#1565c0
    style F fill:#ffcdd2,stroke:#c62828`,
  },
  {
    id: "woo-sync",
    title: "סנכרון WooCommerce",
    description: "Webhooks, סנכרון מלאי ומוצרים בזמן אמת",
    icon: <RefreshCw className="h-5 w-5" />,
    diagram: `sequenceDiagram
    participant WC as WooCommerce
    participant EF as Edge Function<br/>woo-sync
    participant DB as Supabase DB
    participant WH as Edge Function<br/>woo-webhook

    Note over WC,WH: סנכרון הזמנות
    WC->>WH: Webhook - הזמנה חדשה
    WH->>DB: INSERT order + order_items
    WH->>DB: UPDATE inventory (הורדת מלאי)
    WH->>DB: INSERT inventory_log

    Note over WC,EF: סנכרון מוצרים
    EF->>WC: GET /products
    WC-->>EF: רשימת מוצרים
    EF->>DB: UPSERT products + variations
    EF->>DB: UPDATE woo_id

    Note over WC,EF: סנכרון מלאי
    DB->>EF: שינוי מלאי מקומי
    EF->>WC: PUT /products/stock
    WC-->>EF: אישור עדכון`,
  },
  {
    id: "picking-delivery",
    title: "ליקוט ומשלוחים",
    description: "צ'קליסט ליקוט → בחירת שליח → מסירה ללקוח",
    icon: <Truck className="h-5 w-5" />,
    diagram: `flowchart TD
    A[הזמנה חדשה] --> B[שיוך למחסן עובד]
    B --> C[order_picking_items נוצרים]
    C --> D[מסך ליקוט - רשימת פריטים]

    D --> E{לחיצה על פריט}
    E -->|picked: true| F[picked_at + picked_by]
    E --> G{כל הפריטים לוקטו?}
    G -->|לא| D
    G -->|כן| H[picking_status: completed]

    H --> I{בחירת שליח}
    I -->|עובד פנימי| J[delivery_company is_internal=true]
    I -->|חברה חיצונית| K[delivery_company is_internal=false]

    J --> L[deliveries table - status: pending]
    K --> L
    L --> M[status: in_transit]
    M --> N[מסירה ללקוח]
    N --> O[status: delivered]
    O --> P[delivered_at timestamp]
    P --> Q[עדכון תשלום + קופה]
    Q --> R[הזמנה completed ✅]

    style A fill:#e8d5b7,stroke:#b07a2e
    style H fill:#c8e6c9,stroke:#2e7d32
    style R fill:#c8e6c9,stroke:#2e7d32`,
  },
];

function MermaidDiagram({ diagram, id }: { diagram: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  const renderDiagram = useCallback(async () => {
    try {
      const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, diagram);
      setSvg(renderedSvg);
    } catch (e) {
      console.error("Mermaid render error:", e);
    }
  }, [diagram, id]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  return (
    <ScrollArea className="w-full">
      <div
        ref={containerRef}
        className="min-w-[600px] p-4 flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

const FlowsPage = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center gap-4 py-6 px-4">
          <img src="/logo.webp" alt="ELWEJHA" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              ELWEJHA — System Flows
            </h1>
            <p className="text-sm text-muted-foreground">
              תרשימי תהליכים מלאים של המערכת
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto py-8 px-4">
        <Accordion type="single" collapsible className="space-y-4">
          {flows.map((flow) => (
            <AccordionItem
              key={flow.id}
              value={flow.id}
              className="border-none"
            >
              <Card className="overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-right">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {flow.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-base text-foreground">
                        {flow.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {flow.description}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-2">
                    <div className="rounded-lg border bg-card p-2 overflow-hidden">
                      <MermaidDiagram diagram={flow.diagram} id={flow.id} />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
};

export default FlowsPage;
