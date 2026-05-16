import { useState, useEffect, lazy, Suspense } from 'react';
import { useCashRegister } from '@/hooks/pdv/useCashRegister';
import { usePDVSettings } from '@/hooks/pdv/usePDVSettings';
import { usePOSStore } from '@/stores/posStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POSSettings } from '@/components/pdv/POSSettings';
import { POSCounter } from '@/components/pdv/POSCounter';
import { POSTables } from '@/components/pdv/POSTables';
import { POSDelivery } from '@/components/pdv/POSDelivery';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Wallet,
  ShoppingBag,
  LayoutGrid,
  Truck,
  Loader2,
} from 'lucide-react';

// Caixa lazy-loaded como aba dentro do PDV
const CashRegister = lazy(() => import('./CashRegister'));

type POSTab = 'cash' | 'counter' | 'tables' | 'delivery';

// Mapeia context vindo da rota pra tab interna
const CONTEXT_TO_TAB: Record<string, POSTab> = {
  counter: 'counter',
  table: 'tables',
  delivery: 'delivery',
};

// Tema visual contextual (Goomer/Linx style)
const CONTEXT_THEME: Record<POSTab, { label: string; emoji: string; color: string; ring: string }> = {
  cash:     { label: 'CAIXA',   emoji: '💼', color: 'bg-slate-100 text-slate-800 border-slate-300',     ring: 'ring-slate-300' },
  counter:  { label: 'BALCÃO',  emoji: '☕', color: 'bg-gray-100 text-gray-800 border-gray-300',         ring: 'ring-gray-300' },
  tables:   { label: 'MESA',    emoji: '🪑', color: 'bg-orange-100 text-orange-800 border-orange-300',   ring: 'ring-orange-400' },
  delivery: { label: 'ENTREGA', emoji: '🛵', color: 'bg-blue-100 text-blue-800 border-blue-300',         ring: 'ring-blue-400' },
};

interface POSProps {
  initialContext?: 'counter' | 'table' | 'delivery';
}

export default function POS({ initialContext }: POSProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isRegisterOpen } = useCashRegister();
  const { settings } = usePDVSettings();
  const { resetContext, context } = usePOSStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  // Default: caixa fechado → 'cash'. Senão: initialContext da rota OU tab default
  const defaultTab: POSTab = isRegisterOpen
    ? (initialContext ? CONTEXT_TO_TAB[initialContext] : 'counter')
    : 'cash';
  const [activeTab, setActiveTab] = useState<POSTab>(defaultTab);

  // Quando estado do caixa muda pra fechado, força tab cash + avisa
  useEffect(() => {
    if (!isRegisterOpen && activeTab !== 'cash') {
      setActiveTab('cash');
    }
  }, [isRegisterOpen]);

  // Sincroniza tab quando rota muda (ex: clicou Balcão→Mesa no sidebar sem reload)
  useEffect(() => {
    if (!isRegisterOpen || !initialContext) return;
    const tab = CONTEXT_TO_TAB[initialContext];
    if (tab && tab !== activeTab) setActiveTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContext, isRegisterOpen]);

  // Default tab das settings — só aplica se rota não impôs context
  useEffect(() => {
    if (!isRegisterOpen || initialContext) return;
    const defaultTab = (settings as any)?.default_tab;
    if (defaultTab && ['counter', 'tables', 'delivery'].includes(defaultTab)) {
      setActiveTab(defaultTab);
    }
  }, [settings, isRegisterOpen, initialContext]);

  // Mesa selecionada → vai pro Balcão (se caixa aberto)
  useEffect(() => {
    if (!isRegisterOpen) return;
    if (context.type === 'table' && context.table_id) {
      setActiveTab('counter');
    }
  }, [context, isRegisterOpen]);

  const handleTableSelected = () => setActiveTab('counter');

  const handleOrderSent = () => {
    if (context.type === 'table') {
      resetContext();
      setActiveTab('tables');
    }
  };

  const handleManageTables = () => navigate('/settings?tab=tables');

  // Intercepta troca de aba: se caixa fechado, redireciona pra cash com aviso
  const handleTabChange = (value: string) => {
    const tab = value as POSTab;
    if (tab !== 'cash' && !isRegisterOpen) {
      toast({
        title: "Caixa fechado",
        description: "Abra o caixa primeiro pra iniciar vendas.",
        variant: "destructive",
      });
      setActiveTab('cash');
      return;
    }
    setActiveTab(tab);
  };

  const theme = CONTEXT_THEME[activeTab];
  // Badge contextual: mostra MESA 12 / COMANDA COM-1024 se houver context detalhado
  const contextLabel = (() => {
    if (activeTab === 'tables' && (context as any)?.table_number) {
      const tableNum = (context as any).table_number;
      const checkNum = (context as any).check_number;
      return checkNum ? `MESA ${tableNum} · COM-${checkNum}` : `MESA ${tableNum}`;
    }
    return theme.label;
  })();

  return (
    <div className={`flex flex-col h-[calc(100vh-4rem)] border-t-4 ${theme.ring.replace('ring-', 'border-')}`}>
      {/* Header com Tabs + Badge Contextual */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="shrink-0"
        >
          <Settings className="w-5 h-5" />
        </Button>

        {/* Badge contextual */}
        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${theme.color}`}>
          <span>{theme.emoji}</span>
          <span>{contextLabel}</span>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="cash" className="gap-2 relative">
              <Wallet className="w-4 h-4" />
              Caixa
              {!isRegisterOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="counter" className="gap-2" disabled={!isRegisterOpen}>
              <ShoppingBag className="w-4 h-4" />
              Balcão
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-2" disabled={!isRegisterOpen}>
              <LayoutGrid className="w-4 h-4" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2" disabled={!isRegisterOpen}>
              <Truck className="w-4 h-4" />
              Entrega
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'cash' && (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
            <CashRegister />
          </Suspense>
        )}
        {activeTab === 'counter' && isRegisterOpen && (
          <div className="h-full p-4">
            <POSCounter onOrderSent={handleOrderSent} />
          </div>
        )}
        {activeTab === 'tables' && isRegisterOpen && (
          <POSTables
            onTableSelected={handleTableSelected}
            onManageTables={handleManageTables}
          />
        )}
        {activeTab === 'delivery' && isRegisterOpen && (
          <POSDelivery onOrderSent={handleOrderSent} />
        )}
      </div>

      {/* Settings Drawer */}
      <POSSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
