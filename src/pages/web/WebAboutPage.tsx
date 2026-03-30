import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, Award, Heart, Package } from "lucide-react";
import { useSiteSection } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";
import aboutHero from "@/assets/about-hero.jpg";
import aboutStory from "@/assets/about-story.jpg";
import aboutValue1 from "@/assets/about-value-1.jpg";
import aboutValue2 from "@/assets/about-value-2.jpg";
import aboutValue3 from "@/assets/about-value-3.jpg";

const useCountUp = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
};

const statIcons = [
  <Package className="w-7 h-7" />,
  <Users className="w-7 h-7" />,
  <Award className="w-7 h-7" />,
  <Heart className="w-7 h-7" />,
];

const StatCard = ({ end, suffix, desc, iconIndex }: { end: number; suffix: string; desc: string; iconIndex: number }) => {
  const { count, ref } = useCountUp(end);
  return (
    <div ref={ref} className="text-center p-6">
      <div className="flex justify-center mb-3 text-gold">{statIcons[iconIndex] || statIcons[0]}</div>
      <div className="text-3xl md:text-4xl font-black text-primary-foreground">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-primary-foreground/70 mt-1">{desc}</div>
    </div>
  );
};

export default function WebAboutPage() {
  const { data: section } = useSiteSection("about", "hero");
  const content = (section?.content as any) || defaultContent.about.hero || {};

  const stats = [
    { end: 500, suffix: "+", desc: "منتج متوفر" },
    { end: 2000, suffix: "+", desc: "عميل سعيد" },
    { end: 5, suffix: "+", desc: "سنوات خبرة" },
    { end: 100, suffix: "%", desc: "رضا العملاء" },
  ];

  const values = [
    { title: "رضاك مضمون", desc: "ضمان 100% على جميع المنتجات — رضاك هو أولويتنا", image: aboutValue1 },
    { title: "أصالة وتراث", desc: "منتجات بأسلوب شرقي تقليدي أصيل تجمع بين الجودة والتراث", image: aboutValue2 },
    { title: "توصيل سريع", desc: "نوصل لجميع المناطق بسرعة وأمان", image: aboutValue3 },
  ];

  const faqs = [
    { q: "كيف يمكنني الطلب؟", a: "يمكنك تصفح المنتجات وإضافتها إلى السلة ثم إتمام الطلب بسهولة" },
    { q: "ما هي مدة التوصيل؟", a: "نوصل خلال 1-5 أيام عمل لجميع المناطق" },
    { q: "هل يمكنني إرجاع المنتج؟", a: "نعم، يمكنك إرجاع المنتج خلال 14 يوم من تاريخ الاستلام بشرط أن يكون بحالته الأصلية" },
  ];

  return (
    <div>
      {/* Hero with background image */}
      <div className="relative h-[250px] md:h-[450px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutHero}
            alt="خلفية من نحن"
            className="w-full h-full object-cover"
            width={1920}
            height={800}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[hsl(30,30%,15%)]/90 via-[hsl(30,30%,15%)]/70 to-[hsl(30,30%,15%)]/50" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
            {content.title || "من نحن"}
          </h1>
          <p className="text-white/80 max-w-xl mx-auto text-lg">
            وجهتكم الأولى لعالم الطبيعة والمغامرات
          </p>
        </div>
      </div>

      {/* Our Story — 2 columns */}
      <section className="container py-10 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">قصتنا</h2>
            <div className="w-16 h-1 bg-gold rounded-full mb-6" />
            <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
              {content.body || "نحن مجموعة من الأصدقاء الذين يعشقون الطبيعة والتخييم، قررنا أن نجمع شغفنا بحب الطبيعة مع التراث والأصالة العربية.\n\nأسسنا \"الوجهة\" لنوفر لكم أفضل مستلزمات التخييم والرحلات بأسلوب شرقي تقليدي أصيل — من الخيام والمجالس إلى أدوات الطبخ والشاي.\n\nهدفنا هو أن نكون وجهتكم الأولى لكل ما يخص عالم البر والمغامرات، مع الحفاظ على الجودة العالية والأسعار المنافسة."}
            </div>
          </div>
          <div className="order-first md:order-last">
            <img
              src={aboutStory}
              alt="قصتنا"
              className="w-full rounded-2xl shadow-xl object-cover aspect-[4/3] md:aspect-square"
              loading="lazy"
              width={800}
              height={800}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-desert-gradient">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <StatCard key={i} end={s.end} suffix={s.suffix} desc={s.desc} iconIndex={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Values with images */}
      <section className="container py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-2">الأسس والقيم</h2>
        <div className="w-16 h-1 bg-gold rounded-full mx-auto mb-10" />
        <div className="grid md:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <img
                src={v.image}
                alt={v.title}
                className="w-full h-48 object-cover"
                loading="lazy"
                width={640}
                height={640}
              />
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-foreground mb-3">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-sand/30">
        <div className="container py-14 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-2">أسئلة شائعة</h2>
          <div className="w-16 h-1 bg-gold rounded-full mx-auto mb-10" />
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible>
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-right text-foreground font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-desert-gradient">
        <div className="container py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-desert-foreground mb-4">ابدأ التسوق الآن</h2>
          <p className="text-desert-foreground/70 max-w-lg mx-auto mb-8">
            اكتشف مجموعتنا الواسعة من المنتجات الأصلية
          </p>
          <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-8">
            <Link to="/web/shop">تسوق الآن</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
