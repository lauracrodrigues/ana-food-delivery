// v1.0.0 — Card de programa de indicações (cardápio público)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Gift, Share2, Copy, Loader2 } from "lucide-react";
import { useMenuContextOptional } from "@/contexts/MenuContext";

interface ReferralStats {
  total: number;
  completed: number;
  pending: number;
  points_earned: number;
  list: Array<{ referred_phone: string; status: string; reward_points: number; created_at: string }>;
}

interface ReferralCardProps {
  companyId?: string;
  customerPhone?: string | null;
  storeSubdomain?: string | null;
  storeName?: string;
  rewardPoints?: number;
}

export function ReferralCard(props: ReferralCardProps) {
  const ctx = useMenuContextOptional();
  const companyId = props.companyId ?? ctx?.companyId ?? '';
  const customerPhone = props.customerPhone ?? ctx?.session?.phone ?? null;
  const storeSubdomain = props.storeSubdomain ?? ctx?.storeSubdomain ?? null;
  const storeName = props.storeName ?? ctx?.storeName ?? "loja";
  const rewardPoints = props.rewardPoints ?? ctx?.referralRewardPoints ?? 100;
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !customerPhone) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.rpc("get_my_referrals" as any, {
        p_company_id: companyId,
        p_phone: customerPhone,
      });
      if (data) setStats(data as ReferralStats);
      setLoading(false);
    })();
  }, [companyId, customerPhone]);

  if (!customerPhone) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-center">
        Identifique-se na aba Pedidos pra participar do programa de indicações
      </div>
    );
  }

  // Monta link compartilhável: https://{subdomain}.anafood.vip/?ref={phone}
  const phoneDigits = customerPhone.replace(/\D/g, "");
  const baseUrl = storeSubdomain
    ? `https://${storeSubdomain}.anafood.vip`
    : window.location.origin;
  const shareUrl = `${baseUrl}/?ref=${phoneDigits}`;
  const shareText = `Conhece a ${storeName}? Use meu link e a gente ganha juntos! ${shareUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: storeName, text: shareText, url: shareUrl });
      } catch { /* canceled */ }
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-3">
      {/* Card principal — convite */}
      <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-5 border border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-6 w-6 text-purple-600" />
          <h3 className="font-bold text-purple-900 dark:text-purple-100">Indique e ganhe</h3>
        </div>
        <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
          A cada amigo que fizer 1º pedido pelo seu link, você ganha <strong>{rewardPoints} pontos</strong>!
        </p>

        {/* Botões compartilhar */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={shareWhatsApp} className="bg-green-600 hover:bg-green-700 gap-1.5" size="sm">
            <Share2 className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button onClick={shareNative} variant="outline" size="sm" className="gap-1.5">
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        </div>
        <button onClick={copyLink} className="mt-2 w-full text-xs text-purple-700 hover:underline flex items-center justify-center gap-1">
          <Copy className="h-3 w-3" /> Copiar link
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : stats && stats.total > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Convidados</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Completos</p>
              <p className="text-xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Pontos</p>
              <p className="text-xl font-bold text-amber-600">{stats.points_earned}</p>
            </div>
          </div>

          {/* Lista compacta */}
          <div className="space-y-1.5">
            {stats.list.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2.5 py-1.5">
                <span className="font-mono">{item.referred_phone}</span>
                {item.status === "completed" ? (
                  <span className="text-green-700 font-medium">+{item.reward_points} pts ✓</span>
                ) : (
                  <span className="text-amber-700">⏳ aguardando 1º pedido</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-center text-muted-foreground py-2">
          Nenhuma indicação ainda. Compartilhe seu link!
        </p>
      )}
    </div>
  );
}
