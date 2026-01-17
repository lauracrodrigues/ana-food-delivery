import { useState, useEffect } from 'react';
import { useCashRegister } from '@/hooks/pdv/useCashRegister';
import { usePDVSettings } from '@/hooks/pdv/usePDVSettings';
import { usePOSStore } from '@/stores/posStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POSSettings } from '@/components/pdv/POSSettings';
import { POSCounter } from '@/components/pdv/POSCounter';
import { POSTables } from '@/components/pdv/POSTables';
import { POSDelivery } from '@/components/pdv/POSDelivery';
import { 
  Settings,
  Wallet,
  AlertCircle,
  ShoppingBag,
  LayoutGrid,
  Truck,
} from 'lucide-react';

type POSTab = 'counter' | 'tables' | 'delivery';

export default function POS() {
  const navigate = useNavigate();
  const { isRegisterOpen } = useCashRegister();
  const { settings } = usePDVSettings();
  const { resetContext, context } = usePOSStore();
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<POSTab>('counter');

  // Set default tab from settings
  useEffect(() => {
    const defaultTab = (settings as any)?.default_tab;
    if (defaultTab && ['counter', 'tables', 'delivery'].includes(defaultTab)) {
      setActiveTab(defaultTab);
    }
  }, [settings]);

  // If coming from table context, switch to counter with table context
  useEffect(() => {
    if (context.type === 'table' && context.table_id) {
      setActiveTab('counter');
    }
  }, [context]);

  const handleTableSelected = () => {
    setActiveTab('counter');
  };

  const handleOrderSent = () => {
    if (context.type === 'table') {
      resetContext();
      setActiveTab('tables');
    }
  };

  const handleManageTables = () => {
    navigate('/settings?tab=tables');
  };

  // Show warning if register is not open
  if (!isRegisterOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-16 h-16 text-warning" />
        <h2 className="text-2xl font-semibold">Caixa Fechado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          É necessário abrir o caixa antes de iniciar as vendas.
        </p>
        <Button onClick={() => navigate('/caixa')}>
          <Wallet className="w-4 h-4 mr-2" />
          Ir para Caixa
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header with Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="shrink-0"
        >
          <Settings className="w-5 h-5" />
        </Button>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as POSTab)} className="flex-1">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="counter" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Balcão
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              <Truck className="w-4 h-4" />
              Entrega
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'counter' && (
          <div className="h-full p-4">
            <POSCounter onOrderSent={handleOrderSent} />
          </div>
        )}
        {activeTab === 'tables' && (
          <POSTables 
            onTableSelected={handleTableSelected}
            onManageTables={handleManageTables}
          />
        )}
        {activeTab === 'delivery' && (
          <POSDelivery onOrderSent={handleOrderSent} />
        )}
      </div>

      {/* Settings Drawer */}
      <POSSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
