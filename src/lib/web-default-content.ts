// Default content for all pages — used as fallback when DB is empty

export const defaultContent: Record<string, Record<string, Record<string, any>>> = {
  home: {
    hero: {
      title: "الوجهة",
      title_he: "",
      subtitle: "وجهتك الأولى لعالم الطبيعة والمغامرات",
      subtitle_he: "",
      cta_text: "تسوق الآن",
      cta_text_he: "",
      cta_link: "/shop",
      backgroundImage: "",
    },
    features: {
      items: [
        { icon: "shield", title: "رضاك مضمون", title_he: "", description: "ضمان 100% على جميع المنتجات", description_he: "" },
        { icon: "shopping-bag", title: "سهولة الشراء", title_he: "", description: "تجربة تسوق سهلة وسريعة", description_he: "" },
        { icon: "truck", title: "توصيل سريع", title_he: "", description: "توصيل لكافة المناطق", description_he: "" },
        { icon: "refresh-cw", title: "إمكانية الإرجاع", title_he: "", description: "إرجاع سهل ومريح", description_he: "" },
      ],
    },
    categories: {
      title: "الأقسام",
      title_he: "",
      subtitle: "تصفح حسب القسم",
      subtitle_he: "",
    },
    featured: {
      title: "منتجات مميزة",
      title_he: "",
      subtitle: "الأكثر مبيعاً",
      subtitle_he: "",
      viewAllText: "عرض الكل",
      viewAllText_he: "",
    },
  },
  about: {
    hero: {
      title: "من نحن",
      title_he: "",
      description: "نحن مجموعة من الأصدقاء الذين يعشقون الطبيعة والتخييم",
      description_he: "",
      backgroundImage: "",
    },
    story: {
      title: "قصتنا",
      title_he: "",
      body: "نحن مجموعة من الأصدقاء الذين يعشقون الطبيعة والتخييم، قررنا أن نجمع شغفنا بحب الطبيعة مع التراث والأصالة العربية.\n\nأسسنا \"الوجهة\" لنوفر لكم أفضل مستلزمات التخييم والرحلات بأسلوب شرقي تقليدي أصيل — من الخيام والمجالس إلى أدوات الطبخ والشاي.\n\nهدفنا هو أن نكون وجهتكم الأولى لكل ما يخص عالم البر والمغامرات، مع الحفاظ على الجودة العالية والأسعار المنافسة.",
      body_he: "",
      image: "",
    },
    values: {
      title: "قيمنا",
      title_he: "",
      items: [
        { title: "جودة عالية", title_he: "", desc: "نختار منتجاتنا بعناية ونختبرها لضمان أعلى مستوى من الجودة والمتانة.", desc_he: "", image: "" },
        { title: "خدمة ممتازة", title_he: "", desc: "فريق دعم محترف جاهز لمساعدتك في اختيار المنتج المناسب.", desc_he: "", image: "" },
        { title: "أصالة وتراث", title_he: "", desc: "نجمع بين الأصالة العربية وأحدث معدات التخييم العصرية.", desc_he: "", image: "" },
      ],
    },
  },
  contact: {
    hero: {
      title: "تواصل معنا",
      title_he: "",
      description: "نسعد بتواصلكم معنا. أرسل لنا رسالة وسنرد عليك في أقرب وقت.",
      description_he: "",
    },
    info: {
      phone: "0526213999",
      email: "info@elwejha.co.il",
      address: "زيمر — نعمل أونلاين، زيارة المخازن بموعد مسبق",
      address_he: "",
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
      address: "زيمر — نعمل أونلاين، زيارة المخازن بموعد مسبق",
      address_he: "זמר — עובדים אונליין, ביקור במחסנים בתיאום מראש",
    },
    shipping_methods: {
      delivery_enabled: true,
      delivery_label: "توصيل للبيت",
      delivery_label_he: "משלוח עד הבית",
      pickup_enabled: true,
      pickup_label: "استلام ذاتي",
      pickup_label_he: "איסוף עצמי",
      pickup_note: "نعمل أونلاين — يرجى التنسيق معنا مسبقاً لموعد الاستلام",
      pickup_note_he: "אנו פועלים אונליין — יש לתאם איתנו מראש לביקור",
    },
  },
};

// Section labels for admin UI
export const sectionLabels: Record<string, Record<string, string>> = {
  home: { hero: 'באנר ראשי', features: 'פיצ\'רים', categories: 'סקשן קטגוריות', featured: 'סקשן מוצרים מומלצים' },
  about: { hero: 'באנר ראשי', story: 'הסיפור שלנו', values: 'ערכים' },
  contact: { hero: 'באנר ראשי', info: 'פרטי התקשרות' },
  settings: { general: 'הגדרות כלליות', shipping_methods: 'אפשרויות משלוח' },
};

export const pageLabels: Record<string, string> = {
  home: 'דף ראשי',
  about: 'אודות',
  contact: 'צור קשר',
  
  settings: 'הגדרות',
};

// Field config for admin editing
export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'array' | 'color' | 'toggle';
  /** For nested object fields like shipping_methods.delivery.label */
  objectKey?: string;
  arrayFields?: FieldConfig[];
}

export const sectionFields: Record<string, Record<string, FieldConfig[]>> = {
  home: {
    hero: [
      { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
      { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
      { key: 'subtitle', label: 'תת-כותרת (ערבית)', type: 'text' },
      { key: 'subtitle_he', label: 'תת-כותרת (עברית)', type: 'text' },
      { key: 'cta_text', label: 'טקסט כפתור (ערבית)', type: 'text' },
      { key: 'cta_text_he', label: 'טקסט כפתור (עברית)', type: 'text' },
      { key: 'cta_link', label: 'קישור כפתור', type: 'text' },
      { key: 'backgroundImage', label: 'תמונת רקע', type: 'image' },
    ],
    features: [
      { key: 'items', label: 'פיצ\'רים', type: 'array', arrayFields: [
        { key: 'icon', label: 'אייקון', type: 'text' },
        { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
        { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
        { key: 'description', label: 'תיאור (ערבית)', type: 'text' },
        { key: 'description_he', label: 'תיאור (עברית)', type: 'text' },
      ]},
    ],
    categories: [
      { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
      { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
      { key: 'subtitle', label: 'תת-כותרת (ערבית)', type: 'text' },
      { key: 'subtitle_he', label: 'תת-כותרת (עברית)', type: 'text' },
    ],
    featured: [
      { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
      { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
      { key: 'subtitle', label: 'תת-כותרת (ערבית)', type: 'text' },
      { key: 'subtitle_he', label: 'תת-כותרת (עברית)', type: 'text' },
      { key: 'viewAllText', label: 'טקסט כפתור הצג הכל (ערבית)', type: 'text' },
      { key: 'viewAllText_he', label: 'טקסט כפתור הצג הכל (עברית)', type: 'text' },
    ],
  },
  about: {
    hero: [
      { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
      { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
      { key: 'description', label: 'תיאור (ערבית)', type: 'textarea' },
      { key: 'description_he', label: 'תיאור (עברית)', type: 'textarea' },
      { key: 'backgroundImage', label: 'תמונת רקע', type: 'image' },
    ],
    story: [
      { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
      { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
      { key: 'body', label: 'תוכן (ערבית)', type: 'textarea' },
      { key: 'body_he', label: 'תוכן (עברית)', type: 'textarea' },
      { key: 'image', label: 'תמונה', type: 'image' },
    ],
    values: [
      { key: 'title', label: 'כותרת הסקשן (ערבית)', type: 'text' },
      { key: 'title_he', label: 'כותרת הסקשן (עברית)', type: 'text' },
      { key: 'items', label: 'ערכים', type: 'array', arrayFields: [
        { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
        { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
        { key: 'desc', label: 'תיאור (ערבית)', type: 'textarea' },
        { key: 'desc_he', label: 'תיאור (עברית)', type: 'textarea' },
        { key: 'image', label: 'תמונה', type: 'image' },
      ]},
    ],
  },
  contact: {
    hero: [
      { key: 'title', label: 'כותרת (ערבית)', type: 'text' },
      { key: 'title_he', label: 'כותרת (עברית)', type: 'text' },
      { key: 'description', label: 'תיאור (ערבית)', type: 'textarea' },
      { key: 'description_he', label: 'תיאור (עברית)', type: 'textarea' },
    ],
    info: [
      { key: 'phone', label: 'טלפון', type: 'text' },
      { key: 'email', label: 'אימייל', type: 'text' },
      { key: 'address', label: 'כתובת (ערבית)', type: 'text' },
      { key: 'address_he', label: 'כתובת (עברית)', type: 'text' },
      { key: 'whatsapp', label: 'מספר וואטסאפ', type: 'text' },
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
    shipping_methods: [
      { key: 'delivery_enabled', label: 'משלוח עד הבית — מופעל', type: 'toggle' },
      { key: 'delivery_label', label: 'שם (ערבית)', type: 'text' },
      { key: 'delivery_label_he', label: 'שם (עברית)', type: 'text' },
      { key: 'pickup_enabled', label: 'איסוף עצמי — מופעל', type: 'toggle' },
      { key: 'pickup_label', label: 'שם (ערבית)', type: 'text' },
      { key: 'pickup_label_he', label: 'שם (עברית)', type: 'text' },
      { key: 'pickup_note', label: 'הערה לאיסוף (ערבית)', type: 'text' },
      { key: 'pickup_note_he', label: 'הערה לאיסוף (עברית)', type: 'text' },
    ],
  },
};
