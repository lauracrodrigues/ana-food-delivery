// v1.0.0 — Cardápio versão impressão/PDF (Ctrl+P salva PDF)
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency-formatter";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Company {
  id: string;
  name: string;
  fantasy_name: string;
  logo_url: string | null;
  phone: string;
  whatsapp: string;
  description: string;
  subdomain: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promotional_price: number | null;
  category_id: string;
  on_off: boolean;
}

export default function MenuPrint() {
  const { subdomain } = useParams();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      if (!subdomain) return;
      setLoading(true);
      const { data: c } = await supabase.from("companies").select("*").eq("subdomain", subdomain).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCompany(c as Company);

      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("*").eq("company_id", c.id).eq("on_off", true).order("name"),
        supabase.from("products").select("*").eq("company_id", c.id).eq("on_off", true).order("name"),
      ]);
      setCategories(cats || []);
      setProducts(prods || []);
      setLoading(false);
    })();
  }, [subdomain]);

  // Auto-dispara diálogo de impressão após carregar (opcional via query param)
  useEffect(() => {
    if (loading || !company) return;
    if (new URLSearchParams(window.location.search).get("auto") === "1") {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, company]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!company) {
    return <div className="text-center py-12">Estabelecimento não encontrado</div>;
  }

  const grouped = categories
    .map(cat => ({ category: cat, products: products.filter(p => p.category_id === cat.id) }))
    .filter(g => g.products.length > 0);

  return (
    <div className="print-menu min-h-screen bg-white text-black">
      {/* Header com botão Imprimir — escondido na impressão */}
      <div className="print-hide bg-gray-100 border-b py-3 px-4 flex items-center justify-between sticky top-0 z-10">
        <span className="text-sm text-gray-600">Pré-visualização do cardápio • Use Ctrl+P (ou Cmd+P) para salvar como PDF</span>
        <Button onClick={() => window.print()} size="sm" className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Página A4 */}
      <div className="max-w-[800px] mx-auto p-8 print:p-4">
        {/* Cabeçalho */}
        <header className="text-center mb-6 pb-4 border-b-2 border-black">
          {company.logo_url && (
            <img src={company.logo_url} alt={company.fantasy_name || company.name}
              className="h-20 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-3xl font-bold mb-1">{company.fantasy_name || company.name}</h1>
          {company.description && <p className="text-sm text-gray-700 italic mb-2">{company.description}</p>}
          <div className="text-sm text-gray-700 flex justify-center gap-4 flex-wrap">
            {company.whatsapp && <span>📱 {company.whatsapp}</span>}
            {company.phone && company.phone !== company.whatsapp && <span>☎️ {company.phone}</span>}
            <span>🌐 {company.subdomain}.anafood.vip</span>
          </div>
        </header>

        {/* Categorias e produtos */}
        {grouped.length === 0 ? (
          <p className="text-center py-12 text-gray-500">Nenhum produto disponível</p>
        ) : (
          grouped.map(({ category, products: catProducts }) => (
            <section key={category.id} className="mb-6 break-inside-avoid">
              <h2 className="text-xl font-bold border-b-2 border-gray-400 pb-1 mb-3 uppercase tracking-wide">
                {category.name}
              </h2>
              <div className="space-y-2">
                {catProducts.map(p => {
                  const hasPromo = p.promotional_price != null && p.promotional_price < p.price;
                  const finalPrice = hasPromo ? p.promotional_price! : p.price;
                  return (
                    <div key={p.id} className="flex gap-4 items-baseline break-inside-avoid">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold">{p.name}</span>
                          <span className="flex-1 border-b border-dotted border-gray-400" style={{ minWidth: 30 }} />
                          <span className="font-bold">
                            {hasPromo && (
                              <span className="text-xs text-gray-500 line-through mr-1">{formatCurrency(p.price)}</span>
                            )}
                            {formatCurrency(finalPrice)}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-gray-600 italic mt-0.5 leading-snug">{p.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Rodapé */}
        <footer className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-600">
          <p>Para fazer seu pedido: {company.subdomain}.anafood.vip</p>
          <p className="mt-1">Cardápio sujeito a alterações sem aviso prévio</p>
        </footer>
      </div>

      {/* CSS de impressão — esconde elementos UI + ajusta margens */}
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; }
          .print-menu { font-size: 11pt; }
          @page { size: A4; margin: 1cm; }
          h2 { page-break-after: avoid; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
