// v2.0.0 — Sticky horizontal com IntersectionObserver e auto-scroll
import { useEffect, useRef, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Category {
  id: string;
  name: string;
}

interface MenuCategoriesProps {
  categories: Category[];
  searchActive?: boolean;
}

export function MenuCategories({ categories, searchActive }: MenuCategoriesProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // IntersectionObserver: detecta qual seção está visível
  useEffect(() => {
    if (searchActive) return;
    const observers: IntersectionObserver[] = [];

    categories.forEach((cat) => {
      const el = document.getElementById(`section-${cat.id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(cat.id);
          }
        },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [categories, searchActive]);

  // Centraliza botão ativo no scroll horizontal
  useEffect(() => {
    if (!activeId) return;
    const btn = btnRefs.current[activeId];
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  const scrollToSection = (categoryId: string) => {
    const el = document.getElementById(`section-${categoryId}`);
    if (el) {
      const offset = 80; // altura do sticky bar
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
      <ScrollArea className="w-full" ref={scrollRef as any}>
        <div className="flex gap-1 px-4 py-2.5">
          {categories.map((cat) => {
            const active = activeId === cat.id && !searchActive;
            return (
              <button
                key={cat.id}
                ref={(el) => { btnRefs.current[cat.id] = el; }}
                onClick={() => scrollToSection(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>
    </div>
  );
}
