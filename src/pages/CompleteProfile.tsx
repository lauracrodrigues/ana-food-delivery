// v1.0.0 — Completa perfil após login Google (coleta CPF/CNPJ, empresa, telefone)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { masks } from "@/lib/masks";
import { Loader2, Store, User, Building2, Phone, Mail, Briefcase } from "lucide-react";

const SEGMENTS = [
  "Restaurantes", "Pizzarias", "Hamburguerias", "Marmitarias",
  "Comida japonesa", "Açaiterias", "Lanchonetes", "Padarias", "Cafeterias",
  "Doceria/Confeitaria", "Comida saudável", "Comida regional", "Outros",
];

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    documentType: "cpf" as "cpf" | "cnpj",
    document: "",
    fantasyName: "",
    companyName: "",
    phone: "",
    email: "",
    segment: "Restaurantes",
  });

  // Carrega dados do usuário Google logado (pré-preenche nome/email)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      // Já tem company? redireciona pro dashboard
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (profile?.company_id) {
        navigate("/dashboard");
        return;
      }
      setUserEmail(user.email || "");
      setForm(f => ({
        ...f,
        fullName: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || "",
        email: user.email || "",
      }));
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validações
      if (!form.fullName.trim()) throw new Error("Informe seu nome completo");
      if (!form.fantasyName.trim()) throw new Error("Informe o nome da empresa");
      if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) throw new Error("Telefone inválido");
      const docDigits = form.document.replace(/\D/g, "");
      if (form.documentType === "cpf" && docDigits.length !== 11) throw new Error("CPF deve ter 11 dígitos");
      if (form.documentType === "cnpj" && docDigits.length !== 14) throw new Error("CNPJ deve ter 14 dígitos");

      const { data, error } = await supabase.functions.invoke("complete-google-profile", {
        body: {
          fullName: form.fullName.trim(),
          documentType: form.documentType,
          document: docDigits,
          fantasyName: form.fantasyName.trim(),
          companyName: (form.companyName || form.fantasyName).trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || userEmail,
          segment: form.segment,
          subdomain: "",
        },
      });

      if (error) throw new Error(error.message || "Erro ao salvar");
      if (!data?.success) throw new Error(data?.error || "Erro ao salvar");

      toast({ title: "Perfil concluído!", description: "Bem-vindo ao AnaFood 🎉" });
      // Pequeno delay pra sincronizar profile no client
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao completar perfil", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-primary rounded-2xl mb-3">
            <Store className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Quase lá!</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete seu perfil para começar a usar o AnaFood</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seus dados</CardTitle>
            <CardDescription>{userEmail && <>Conectado como <strong>{userEmail}</strong></>}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nome completo *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="João da Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de documento *</Label>
                <RadioGroup
                  value={form.documentType}
                  onValueChange={(v) => setForm({ ...form, documentType: v as "cpf" | "cnpj", document: "" })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cpf" id="cpf" />
                    <Label htmlFor="cpf" className="cursor-pointer">CPF (pessoa física)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cnpj" id="cnpj" />
                    <Label htmlFor="cnpj" className="cursor-pointer">CNPJ (empresa)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>{form.documentType === "cpf" ? "CPF" : "CNPJ"} *</Label>
                <Input
                  value={form.document}
                  onChange={(e) => {
                    const masked = form.documentType === "cpf"
                      ? masks.cpf(e.target.value)
                      : masks.cnpj(e.target.value);
                    setForm({ ...form, document: masked });
                  }}
                  placeholder={form.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  maxLength={form.documentType === "cpf" ? 14 : 18}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Nome da empresa *</Label>
                <Input
                  value={form.fantasyName}
                  onChange={(e) => setForm({ ...form, fantasyName: e.target.value })}
                  placeholder="Pizzaria do João"
                  required
                />
                <p className="text-xs text-muted-foreground">Nome exibido para os clientes no cardápio</p>
              </div>

              {form.documentType === "cnpj" && (
                <div className="space-y-2">
                  <Label>Razão social (opcional)</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="João da Silva LTDA"
                  />
                  <p className="text-xs text-muted-foreground">Se vazio, usamos o nome fantasia</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: masks.phone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email da empresa</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={userEmail}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Segmento *</Label>
                <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Criando sua loja..." : "Concluir cadastro"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
