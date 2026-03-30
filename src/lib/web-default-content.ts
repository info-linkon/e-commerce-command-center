// Default content for all pages — used as fallback when DB is empty

export const defaultContent: Record<string, Record<string, Record<string, any>>> = {
  home: {
    hero: {
      title: "الوجهة",
      subtitle: "وجهتك الأولى لعالم الطبيعة والمغامرات",
      cta_text: "تسوق الآن",
      cta_link: "/web/shop",
      backgroundImage: "",
    },
    features: {
      items: [
        { icon: "shield", title: "رضاك مضمون", description: "ضمان 100% على جميع المنتجات" },
        { icon: "shopping-bag", title: "سهولة الشراء", description: "تجربة تسوق سهلة وسريعة" },
        { icon: "truck", title: "توصيل سريع", description: "توصيل لكافة المناطق" },
        { icon: "refresh-cw", title: "إمكانية الإرجاع", description: "إرجاع سهل ومريح" },
      ],
    },
    categories: {
      title: "الأقسام",
      subtitle: "تصفح حسب القسم",
    },
    featured: {
      title: "منتجات مميزة",
      subtitle: "الأكثر مبيعاً",
      viewAllText: "عرض الكل",
    },
  },
  about: {
    hero: {
      title: "من نحن",
      description: "نحن مجموعة من الأصدقاء الذين يعشقون الطبيعة والتخييم",
      backgroundImage: "",
    },
    story: {
      title: "قصتنا",
      body: "نحن مجموعة من الأصدقاء الذين يعشقون الطبيعة والتخييم، قررنا أن نجمع شغفنا بحب الطبيعة مع التراث والأصالة العربية.\n\nأسسنا \"الوجهة\" لنوفر لكم أفضل مستلزمات التخييم والرحلات بأسلوب شرقي تقليدي أصيل — من الخيام والمجالس إلى أدوات الطبخ والشاي.\n\nهدفنا هو أن نكون وجهتكم الأولى لكل ما يخص عالم البر والمغامرات، مع الحفاظ على الجودة العالية والأسعار المنافسة.",
      image: "",
    },
    values: {
      title: "قيمنا",
      items: [
        { title: "جودة عالية", desc: "نختار منتجاتنا بعناية ونختبرها لضمان أعلى مستوى من الجودة والمتانة." },
        { title: "خدمة ممتازة", desc: "فريق دعم محترف جاهز لمساعدتك في اختيار المنتج المناسب." },
        { title: "أصالة وتراث", desc: "نجمع بين الأصالة العربية وأحدث معدات التخييم العصرية." },
      ],
    },
  },
  contact: {
    hero: {
      title: "تواصل معنا",
      description: "نسعد بتواصلكم معنا. أرسل لنا رسالة وسنرد عليك في أقرب وقت.",
    },
    info: {
      phone: "0526213999",
      email: "info@elwejha.co.il",
      address: "زيمر — نعمل أونلاين، زيارة المخازن بموعد مسبق",
      whatsapp: "972526573185",
    },
  },
  settings: {
    general: {
      store_name: "الوجهة",
      store_name_he: "אלוג'הא",
      logo_url: "",
      phone: "0526213999",
      email: "info@elwejha.co.il",
      whatsapp: "972526573185",
      instagram: "https://www.instagram.com/elwejha.outdoors",
      facebook: "https://www.facebook.com/1094362587370591",
      tiktok: "",
    },
  },
};

// Section labels for admin UI
export const sectionLabels: Record<string, Record<string, string>> = {
  home: { hero: 'באנר ראשי', features: 'פיצ\'רים', categories: 'סקשן קטגוריות', featured: 'סקשן מוצרים מומלצים' },
  about: { hero: 'באנר ראשי', story: 'הסיפור שלנו', values: 'ערכים' },
  contact: { hero: 'באנר ראשי', info: 'פרטי התקשרות' },
  faq: { content: 'שאלות ותשובות' },
  settings: { general: 'הגדרות כלליות' },
};

export const pageLabels: Record<string, string> = {
  home: 'דף ראשי',
  about: 'אודות',
  contact: 'צור קשר',
  faq: 'שאלות נפוצות',
  settings: 'הגדרות',
};

// Field config for admin editing
export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'array' | 'color';
  arrayFields?: FieldConfig[];
}

export const sectionFields: Record<string, Record<string, FieldConfig[]>> = {
  home: {
    hero: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'subtitle', label: 'תת-כותרת', type: 'text' },
      { key: 'cta_text', label: 'טקסט כפתור', type: 'text' },
      { key: 'cta_link', label: 'קישור כפתור', type: 'text' },
      { key: 'backgroundImage', label: 'תמונת רקע', type: 'image' },
    ],
    features: [
      { key: 'items', label: 'פיצ\'רים', type: 'array', arrayFields: [
        { key: 'icon', label: 'אייקון', type: 'text' },
        { key: 'title', label: 'כותרת', type: 'text' },
        { key: 'description', label: 'תיאור', type: 'text' },
      ]},
    ],
    categories: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'subtitle', label: 'תת-כותרת', type: 'text' },
    ],
    featured: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'subtitle', label: 'תת-כותרת', type: 'text' },
      { key: 'viewAllText', label: 'טקסט כפתור הצג הכל', type: 'text' },
    ],
  },
  about: {
    hero: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'description', label: 'תיאור', type: 'textarea' },
      { key: 'backgroundImage', label: 'תמונת רקע', type: 'image' },
    ],
    story: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'body', label: 'תוכן', type: 'textarea' },
      { key: 'image', label: 'תמונה', type: 'image' },
    ],
    values: [
      { key: 'title', label: 'כותרת הסקשן', type: 'text' },
      { key: 'items', label: 'ערכים', type: 'array', arrayFields: [
        { key: 'title', label: 'כותרת', type: 'text' },
        { key: 'desc', label: 'תיאור', type: 'textarea' },
      ]},
    ],
  },
  contact: {
    hero: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'description', label: 'תיאור', type: 'textarea' },
    ],
    info: [
      { key: 'phone', label: 'טלפון', type: 'text' },
      { key: 'email', label: 'אימייל', type: 'text' },
      { key: 'address', label: 'כתובת', type: 'text' },
      { key: 'whatsapp', label: 'מספר וואטסאפ', type: 'text' },
    ],
  },
  faq: {
    content: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'subtitle', label: 'תת-כותרת', type: 'text' },
      { key: 'items', label: 'שאלות ותשובות', type: 'array', arrayFields: [
        { key: 'q', label: 'שאלה', type: 'text' },
        { key: 'a', label: 'תשובה', type: 'textarea' },
      ]},
    ],
  },
  settings: {
    general: [
      { key: 'store_name', label: 'שם החנות (ערבית)', type: 'text' },
      { key: 'store_name_he', label: 'שם החנות (עברית)', type: 'text' },
      { key: 'logo_url', label: 'לוגו', type: 'image' },
      { key: 'phone', label: 'טלפון', type: 'text' },
      { key: 'email', label: 'אימייל', type: 'text' },
      { key: 'whatsapp', label: 'וואטסאפ', type: 'text' },
      { key: 'instagram', label: 'Instagram', type: 'text' },
      { key: 'facebook', label: 'Facebook', type: 'text' },
      { key: 'tiktok', label: 'TikTok', type: 'text' },
    ],
  },
};
