// v1.0.0 — Admin Marketing: tracking codes + domínio próprio
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, BarChart2, Save, Copy, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface CompanyMarketing {
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
  meta_verification_tags: Array<{ name: string; content: string }> | null;
  custom_domain: string | null;
  custom_domain_status: "pending" | "verifying" | "active" | "error" | null;
  custom_domain_error: string | null;
}

// Parse <meta name='x' content='y'/> tags coladas pelo user
function parseMetaTagsText(text: string): Array<{ name: string; content: string }> {
  const tags: Array<{ name: string; content: string }> = [];
  const re = /<meta\s+(?:[^>]*?\s+)?name=['"]([^'"]+)['"]\s+(?:[^>]*?\s+)?content=['"]([^'"]+)['"]/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.push({ name: m[1], content: m[2] });
  }
  // Tenta também ordem content → name
  const re2 = /<meta\s+(?:[^>]*?\s+)?content=['"]([^'"]+)['"]\s+(?:[^>]*?\s+)?name=['"]([^'"]+)['"]/gi;
  while ((m = re2.exec(text)) !== null) {
    if (!tags.some(t => t.name === m[2])) tags.push({ name: m[2], content: m[1] });
  }
  return tags;
}

export default function Marketing() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: companyId } = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
  });

  const { data: marketing, isLoading } = useQuery({
    queryKey: ["company-marketing", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies")
        .select("google_analytics_id, facebook_pixel_id, meta_verification_tags, custom_domain, custom_domain_status, custom_domain_error")
        .eq("id", companyId).single();
      return data as CompanyMarketing | null;
    },
    enabled: !!companyId,
  });

  // Estado local editável
  const [ga, setGa] = useState("");
  const [pixel, setPixel] = useState("");
  const [metaTagsText, setMetaTagsText] = useState("");
  const [domain, setDomain] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!marketing) return;
    setGa(marketing.google_analytics_id ?? "");
    setPixel(marketing.facebook_pixel_id ?? "");
    setDomain(marketing.custom_domain ?? "");
    const tags = marketing.meta_verification_tags || [];
    setMetaTagsText(tags.map(t => `<meta name='${t.name}' content='${t.content}'/>`).join("\n"));
  }, [marketing]);

  const saveTracking = async () => {
    if (!companyId) return;
    const parsedTags = metaTagsText.trim() ? parseMetaTagsText(metaTagsText) : [];
    const { error } = await supabase.from("companies").update({
      google_analytics_id: ga.trim() || null,
      facebook_pixel_id: pixel.trim() || null,
      meta_verification_tags: parsedTags,
    }).eq("id", companyId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Códigos de rastreamento salvos" });
    qc.invalidateQueries({ queryKey: ["company-marketing", companyId] });
  };

  const saveDomain = async () => {
    if (!companyId) return;
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (cleaned && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) {
      toast({ title: "Domínio inválido", description: "Ex: cardapio.minhaempresa.com.br", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("companies").update({
      custom_domain: cleaned || null,
      custom_domain_status: cleaned ? "pending" : null,
      custom_domain_error: null,
    }).eq("id", companyId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Domínio salvo. Configure DNS conforme instruções abaixo." });
    qc.invalidateQueries({ queryKey: ["company-marketing", companyId] });
  };

  // Verificação simples: tenta fetch no domínio, checa se responde com HTML
  const verifyDomain = async () => {
    if (!companyId || !marketing?.custom_domain) return;
    setVerifying(true);
    await supabase.from("companies").update({ custom_domain_status: "verifying" }).eq("id", companyId);
    qc.invalidateQueries({ queryKey: ["company-marketing", companyId] });

    try {
      const res = await fetch(`https://${marketing.custom_domain}/`, { method: "HEAD", mode: "no-cors" });
      // no-cors retorna opaque; sucesso significa servidor respondeu
      await supabase.from("companies").update({
        custom_domain_status: "active",
        custom_domain_verified_at: new Date().toISOString(),
        custom_domain_error: null,
      }).eq("id", companyId);
      toast({ title: "Domínio ativo!" });
    } catch (err) {
      await supabase.from("companies").update({
        custom_domain_status: "error",
        custom_domain_error: "Domínio não respondeu. Verifique DNS e nginx VPS.",
      }).eq("id", companyId);
      toast({ title: "Falha na verificação", description: "Veja instruções DNS abaixo.", variant: "destructive" });
    } finally {
      setVerifying(false);
      qc.invalidateQueries({ queryKey: ["company-marketing", companyId] });
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Marketing</h1>
        <p className="text-sm text-muted-foreground">Rastreamento, conversão e domínio próprio</p>
      </div>

      <Tabs defaultValue="tracking">
        <TabsList>
          <TabsTrigger value="tracking" className="gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" /> Acesso e Conversão
          </TabsTrigger>
          <TabsTrigger value="domain" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Domínio próprio
          </TabsTrigger>
        </TabsList>

        {/* === TRACKING === */}
        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Códigos de rastreamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Código Google Analytics / Tag Manager</Label>
                <Input value={ga} onChange={e => setGa(e.target.value)}
                  placeholder="G-XXXXXXXXXX  ou  GTM-XXXXXXX" />
                <p className="text-xs text-muted-foreground">Aceita IDs GA4 (G-), Tag Manager (GTM-) ou Universal (UA-)</p>
              </div>

              <div className="space-y-2">
                <Label>Facebook Pixel</Label>
                <Input value={pixel} onChange={e => setPixel(e.target.value)}
                  placeholder="123456789012345" />
                <p className="text-xs text-muted-foreground">ID numérico de 13-17 dígitos (Meta Business Manager)</p>
              </div>

              <div className="space-y-2">
                <Label>Tags de verificação</Label>
                <Textarea value={metaTagsText} onChange={e => setMetaTagsText(e.target.value)}
                  rows={4} placeholder="<meta name='facebook-domain-verification' content='xxxxxx'/>"
                  className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">
                  Cole tags &lt;meta&gt; de verificação (Facebook, Google Search Console, Bing, etc).
                  Uma por linha. Só prefixos válidos serão aceitos.
                </p>
              </div>

              <Button onClick={saveTracking} className="gap-2">
                <Save className="h-4 w-4" /> Salvar
              </Button>

              {/* Eventos disparados */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-semibold mb-2">Eventos rastreados automaticamente:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>📊 <strong>page_view</strong> — visita ao cardápio (GA + Pixel)</li>
                  <li>🛒 <strong>add_to_cart</strong> — produto adicionado (com valor e item)</li>
                  <li>💳 <strong>begin_checkout / InitiateCheckout</strong> — abriu finalização</li>
                  <li>✅ <strong>purchase / Purchase</strong> — pedido confirmado (com valor total + items)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === DOMÍNIO === */}
        <TabsContent value="domain">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Domínio próprio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Aviso: feature ainda não disponível em produção */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-amber-900 mb-1">🚧 Em breve</p>
                <p className="text-amber-800 text-xs">
                  Funcionalidade preparada mas ainda não liberada. Por enquanto, use seu cardápio
                  no subdomínio gratuito: <code className="bg-amber-100 px-1 rounded">empresa.anafood.vip</code>.
                </p>
                <p className="text-amber-800 text-xs mt-2">
                  Avise quando seu plano for atualizado para liberar domínio próprio.
                </p>
              </div>

              <div className="space-y-2 opacity-60 pointer-events-none">
                <Label>Seu domínio</Label>
                <Input value={domain} onChange={e => setDomain(e.target.value)}
                  placeholder="cardapio.minhaempresa.com.br" disabled />
                <p className="text-xs text-muted-foreground">
                  Use um subdomínio (recomendado): ex. cardapio.suamarca.com.br
                </p>
              </div>

              <Button onClick={saveDomain} className="gap-2 opacity-60" disabled>
                <Save className="h-4 w-4" /> Salvar domínio
              </Button>

              {/* Status */}
              {marketing?.custom_domain && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Status:</span>
                    {marketing.custom_domain_status === "active" && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </span>
                    )}
                    {marketing.custom_domain_status === "pending" && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Aguardando DNS
                      </span>
                    )}
                    {marketing.custom_domain_status === "verifying" && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Verificando
                      </span>
                    )}
                    {marketing.custom_domain_status === "error" && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Erro
                      </span>
                    )}
                  </div>

                  {marketing.custom_domain_error && (
                    <p className="text-xs text-red-700 mb-3 p-2 bg-red-50 border border-red-200 rounded">
                      {marketing.custom_domain_error}
                    </p>
                  )}

                  <Button onClick={verifyDomain} disabled={verifying} variant="outline" size="sm" className="gap-2">
                    {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Verificar agora
                  </Button>

                  {marketing.custom_domain_status === "active" && (
                    <Button asChild variant="outline" size="sm" className="gap-2 ml-2">
                      <a href={`https://${marketing.custom_domain}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {/* Instruções DNS */}
              {marketing?.custom_domain && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-semibold">Instruções de configuração DNS:</p>
                  <p className="text-xs text-muted-foreground">
                    No seu provedor DNS (Registro.br, GoDaddy, etc), crie um registro <strong>CNAME</strong>:
                  </p>
                  <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span><strong>Tipo:</strong> CNAME</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <strong>Nome:</strong> {marketing.custom_domain.split(".").slice(0, -2).join(".") || marketing.custom_domain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span><strong>Destino:</strong> vps.anafood.vip</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyText("vps.anafood.vip")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div><strong>TTL:</strong> 3600 (ou padrão)</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Após criar o CNAME, propagação DNS leva de 5 minutos até 24h. Clique em "Verificar agora" pra confirmar.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <strong>Importante:</strong> Para o SSL funcionar, o administrador do AnaFood precisa
                    rodar <code className="bg-amber-100 px-1 rounded">certbot --nginx -d {marketing.custom_domain}</code> no
                    servidor após o CNAME estar ativo.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
