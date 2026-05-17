// v1.0.0 — Catálogo de etiquetas pré-definidas pra produtos do cardápio
export interface ProductTag {
  id: string;
  label: string;
  emoji: string;
  color: string; // tailwind bg + text
}

export const PRODUCT_TAGS: ProductTag[] = [
  { id: "novo",          label: "Novo",          emoji: "🆕", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { id: "mais_vendido",  label: "Mais vendido",  emoji: "🔥", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { id: "promo",         label: "Promoção",      emoji: "💰", color: "bg-red-100 text-red-700 border-red-300" },
  { id: "vegano",        label: "Vegano",        emoji: "🌱", color: "bg-green-100 text-green-700 border-green-300" },
  { id: "vegetariano",   label: "Vegetariano",   emoji: "🥗", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { id: "sem_gluten",    label: "Sem glúten",    emoji: "🌾", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { id: "sem_lactose",   label: "Sem lactose",   emoji: "🥛", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { id: "picante",       label: "Picante",       emoji: "🌶️", color: "bg-rose-100 text-rose-700 border-rose-300" },
  { id: "saudavel",      label: "Saudável",      emoji: "💚", color: "bg-lime-100 text-lime-700 border-lime-300" },
  { id: "frio",          label: "Frio",          emoji: "❄️", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
  { id: "quente",        label: "Quente",        emoji: "🔥", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { id: "premium",       label: "Premium",       emoji: "⭐", color: "bg-purple-100 text-purple-700 border-purple-300" },
];

export function getTagById(id: string): ProductTag | undefined {
  return PRODUCT_TAGS.find(t => t.id === id);
}
