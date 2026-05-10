// v1.0.0 — Preview B: "Cards Coloridos" — fundo claro, borda lateral colorida, info rica nos cards
import { Clock, MapPin, Phone, Bike, Package, ChevronRight, Printer, MessageCircle } from "lucide-react";

const MOCK_ORDERS = [
  { id: "1", num: "047", name: "Carlos Silva", phone: "62 9 9876-5432", items: ["2x Frango Grelhado", "1x Suco de Laranja"], total: 52.90, type: "delivery", neighborhood: "Setor Bueno", elapsed: 4, urgent: true, payment: "Pix" },
  { id: "2", num: "048", name: "Ana Paula", phone: "62 9 9123-4567", items: ["1x Executivo P"], total: 18.50, type: "pickup", neighborhood: null, elapsed: 7, urgent: false, payment: "Cartão" },
  { id: "3", num: "049", name: "Roberto Nunes", phone: "62 9 8765-4321", items: ["3x Executivo G", "2x Guaraná"], total: 89.00, type: "delivery", neighborhood: "Jardim Goiás", elapsed: 12, urgent: true, payment: "Dinheiro" },
];
const PREP = [
  { id: "4", num: "044", name: "Fernanda Lima", phone: "62 9 9999-0000", items: ["1x Executivo M", "1x Vitamina"], total: 32.00, type: "delivery", neighborhood: "Setor Oeste", elapsed: 18, urgent: false, payment: "Pix" },
  { id: "5", num: "045", name: "João Marcos", phone: "62 9 7777-1234", items: ["2x Frango + Arroz"], total: 44.00, type: "pickup", neighborhood: null, elapsed: 22, urgent: false, payment: "Cartão" },
];
const READY = [
  { id: "6", num: "042", name: "Patrícia Moura", phone: "62 9 6666-5678", items: ["1x Executivo G"], total: 25.00, type: "delivery", neighborhood: "Asa Norte", elapsed: 35, urgent: false, payment: "Pix" },
];
const DELIVERING = [
  { id: "7", num: "040", name: "Lucas Sousa", phone: "62 9 5555-9876", items: ["2x Executivo P"], total: 37.00, type: "delivery", neighborhood: "Setor Sul", elapsed: 48, urgent: false, payment: "Cartão" },
];
const DONE = [
  { id: "8", num: "038", name: "Juliana Castro", phone: "62 9 4444-0011", items: ["1x Executivo M"], total: 21.00, type: "pickup", neighborhood: null, elapsed: 65, urgent: false, payment: "Dinheiro" },
  { id: "9", num: "039", name: "Marcos Dias", phone: "62 9 3333-2222", items: ["3x Frango G", "1x Suco"], total: 79.50, type: "delivery", neighborhood: "Bueno", elapsed: 72, urgent: false, payment: "Pix" },
];

type ColDef = {
  id: string; label: string; bg: string; border: string; headerBg: string; headerText: string; badge: string; orders: any[];
};

const COLUMNS: ColDef[] = [
  { id: "pending",   label: "Aguardando", bg: "bg-amber-50",  border: "border-l-amber-400",  headerBg: "bg-amber-400",  headerText: "text-white", badge: "bg-white text-amber-700", orders: MOCK_ORDERS },
  { id: "preparing", label: "Preparando", bg: "bg-blue-50",   border: "border-l-blue-500",   headerBg: "bg-blue-500",   headerText: "text-white", badge: "bg-white text-blue-700",  orders: PREP },
  { id: "ready",     label: "Pronto",     bg: "bg-green-50",  border: "border-l-green-500",  headerBg: "bg-green-500",  headerText: "text-white", badge: "bg-white text-green-700", orders: READY },
  { id: "delivering",label: "Em Entrega", bg: "bg-purple-50", border: "border-l-purple-500", headerBg: "bg-purple-500", headerText: "text-white", badge: "bg-white text-purple-700",orders: DELIVERING },
  { id: "completed", label: "Concluído",  bg: "bg-gray-50",   border: "border-l-gray-400",   headerBg: "bg-gray-400",   headerText: "text-white", badge: "bg-white text-gray-600",  orders: DONE },
];

function MockCardLight({ order, col }: { order: any; col: ColDef }) {
  const elapsedColor = order.elapsed > 20 ? "text-red-500" : order.elapsed > 10 ? "text-amber-500" : "text-emerald-600";
  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${col.border} shadow-sm cursor-pointer hover:shadow-md transition-shadow`}>
      {/* Card top */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">#{order.num}</span>
            {order.urgent && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">● URGENTE</span>
            )}
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold ${elapsedColor}`}>
            <Clock className="w-3.5 h-3.5" />
            {order.elapsed}min
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5">
          {order.type === "delivery" ? (
            <Bike className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          ) : (
            <Package className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-gray-800 truncate">{order.name}</span>
        </div>

        {order.neighborhood && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">{order.neighborhood}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="px-3 py-1.5 bg-gray-50/70 border-t border-gray-100">
        {order.items.slice(0, 2).map((item: string, i: number) => (
          <p key={i} className="text-[11px] text-gray-600 leading-snug">• {item}</p>
        ))}
        {order.items.length > 2 && (
          <p className="text-[11px] text-gray-400">+{order.items.length - 2} itens</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{order.payment}</span>
          <button className="text-gray-400 hover:text-green-500 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button className="text-gray-400 hover:text-blue-500 transition-colors">
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-sm font-bold text-gray-800">R$ {order.total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function KanbanPreviewB() {
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Gestão de Pedidos</h1>
            <p className="text-gray-400 text-xs">Layout B — Cards Coloridos · Preview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Loja Aberta
          </span>
          <input placeholder="🔍 Buscar..." className="border border-gray-200 text-sm px-3 py-1.5 rounded-lg w-40 bg-gray-50" />
          <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
            <span>Delivery: <b>30min</b></span>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 min-h-0 flex gap-3 p-4 overflow-x-auto">
        {COLUMNS.map(col => (
          <div key={col.id} className="flex-shrink-0 w-72 flex flex-col h-full">
            <div className={`flex-shrink-0 flex items-center justify-between px-3 py-2.5 rounded-t-xl ${col.headerBg}`}>
              <span className={`text-sm font-bold ${col.headerText}`}>{col.label}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{col.orders.length}</span>
            </div>
            <div className="flex-1 min-h-0 bg-gray-200/60 rounded-b-xl overflow-y-auto p-2 space-y-2 border border-t-0 border-gray-200">
              {col.orders.map(o => <MockCardLight key={o.id} order={o} col={col} />)}
              {col.orders.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">Sem pedidos</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 text-center py-2 bg-white border-t border-gray-200">
        <span className="text-gray-400 text-xs">🎨 Layout B — Cards Coloridos | Compare: <a href="/kanban-preview/a" className="text-blue-500 hover:underline">Layout A</a> · <a href="/kanban-preview/c" className="text-blue-500 hover:underline">Layout C</a></span>
      </div>
    </div>
  );
}
