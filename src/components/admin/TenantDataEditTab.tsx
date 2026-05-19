// v1.0.0 — Edição dos dados básicos do cliente (admin master corrige erros)
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  fantasy_name?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  subdomain?: string;
}

interface Props {
  tenant: Tenant;
  onSaved?: () => void;
}

export function TenantDataEditTab({ tenant, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: tenant.name || "",
    fantasy_name: tenant.fantasy_name || "",
    cnpj: tenant.cnpj || "",
    email: tenant.email || "",
    phone: tenant.phone || "",
    subdomain: tenant.subdomain || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: form.name.trim(),
          fantasy_name: form.fantasy_name.trim() || null,
          cnpj: form.cnpj.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          subdomain: form.subdomain.trim() || null,
        })
        .eq("id", tenant.id);
      if (error) throw error;
      toast({ title: "Dados atualizados ✓" });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Edição dos dados cadastrais do cliente. Use pra corrigir informações erradas.
      </p>

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label>Razão Social *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Nome Fantasia</Label>
          <Input value={form.fantasy_name} onChange={e => setForm(f => ({ ...f, fantasy_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="XX.XXX.XXX/0001-XX" />
          </div>
          <div className="space-y-1.5">
            <Label>Subdomínio</Label>
            <Input value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} placeholder="meurestaurante" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(XX) XXXXX-XXXX" />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
