// v1.0.0 — Preview C: "Urgência & Timeline" — foco em tempo, barra de progresso, alertas visuais fortes
import { Clock, MapPin, Bike, Package, AlertTriangle, CheckCircle, Printer, MessageCircle, Zap } from "lucide-react";

const MOCK_ORDERS = [
  { id: "1", num: "047", name: "Carlos Silva", phone: "62 9 9876-5432", items: ["2x Frango Grelhado", "1x Suco de Laranja"], total: 52.90, type: "delivery", neighborhood: "Setor Bueno", elapsed: 4, maxTime: 15, payment: "Pix", itemCount: 3 },
  { id: "2", num: "048", name: "Ana Paula", phone: "62 9 9123-4567", items: ["1x Executivo P"], total: 18.50, type: "pickup", neighborhood: null, elapsed: 12, maxTime: 15, payment: "Cartão", itemCount: 1 },
  { id: "3", num: "049", name: "Roberto Nunes", phone: "62 9 8765-4321", items: ["3x Executivo G", "2x Guaraná"], total: 89.00, type: "delivery", neighborhood: "Jardim Goiás", elapsed: 16, maxTime: 15, payment: "Dinheiro", itemCount: 5 },
];
const PREP = [
  { id: "4", num: "044", name: "Fernanda Lima", phone: "62 9 9999-0000", items: ["1x Executivo M", "1x Vitamina"], total: 32.00, type: "delivery", neighborhood: "Setor Oeste", elapsed: 18, maxTime: 30, payment: "Pix", itemCount: 2 },
  { id: "5", num: "045", name: "João Marcos", phone: "62 9 7777-1234", items: ["2x Frango + Arroz"], total: 44.00, type: "pickup", neighborhood: null, elapsed: 8, maxTime: 30, payment: "Cartão", itemCount: 2 },
];
const READY = [
  { id: "6", num: "042", name: "Patrícia Moura", phone: "62 9 6666-5678", items: ["1x Executivo G"], total: 25.00, type: "delivery", neighborhood: "Asa Norte", elapsed: 5, maxTime: 10, payment: "Pix", itemCount: 1 },
];
const DELIVERING = [
  { id: "7", num: "040", name: "Lucas Sousa", phone: "62 9 5555-9876", items: ["2x Executivo P"], total: 37.00, type: "delivery", neighborhood: "Setor Sul", elapsed: 22, maxTime: 45, payment: "Cartão", itemCount: 2 },
];
const DONE = [
  { id: "8", num: "038", name: "Juliana Castro", phone: "62 9 4444-0011", items: ["1x Executivo M"], total: 21.00, type: "pickup", neighborhood: null, elapsed: 65, maxTime: 60, payment: "Dinheiro", itemCount: 1 },
  { id: "9", num: "039", name: "Marcos Dias", phone: "62 9 3333-2222", items: ["3x Frango G", "1x Suco"], total: 79.50, type: "delivery", neighborhood: "Bueno", elapsed: 72, maxTime: 60, payment: "Pix", itemCount: 4 },
];

const COLUMNS = [
  { id: "pending",   label: "Aguardando", icon: Zap,          color: "#f59e0b", orders: MOCK_ORDERS },
  { id: "preparing", label: "Preparando", icon: Clock,         color: "#3b82f6", orders: PREP },
  { id: "ready",     label: "Pronto",     icon: CheckCircle,   color: "#10b981", orders: READY },
  { id: "delivering",label: "Entrega",    icon: Bike,          color: "#8b5cf6", orders: DELIVERING },
  { id: "completed", label: "Concluído",  icon: CheckCircle,   color: "#6b7280", orders: DONE },
];

function ProgressBar({ elapsed, maxTime }: { elapsed: number; maxTime: number }) {
  const pct = Math.min((elapsed / maxTime) * 100, 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MockCardTimeline({ order }: { order: any }) {
  const pct = (order.elapsed / order.maxTime) * 100;
  const overdue = pct >= 100;
  const warning = pct >= 75 && !overdue;

  return (
    <div className={`bg-white rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
      overdue ? "border-red-300 ring-1 ring-red-300" : warning ? "border-amber-200" : "border-gray-100"
    }`}>
      {/* Alert banner */}
      {overdue && (
        <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-t-xl flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          ATRASADO — {order.elapsed}min (limite: {order.maxTime}min)
        </div>
      )}
      {warning && !overdue && (
        <div className="bg-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-t-xl flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          ATENÇÃO — {order.elapsed}min de {order.maxTime}min
        </div>
      )}

      <div className={`p-3 ${overdue || warning ? "rounded-b-xl" : "rounded-xl"}`}>
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-bold text-gray-800">#{order.num}</span>
          <div className="flex items-center gap-2">
            {order.type === "delivery" ? (
              <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                <Bike className="w-3 h-3" />Delivery
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium border border-purple-100">
                <Package className="w-3 h-3" />Retirada
              </span>
            )}
          </div>
        </div>

        {/* Client */}
        <p className="text-sm font-semibold text-gray-800 truncate">{order.name}</p>
        {order.neighborhood && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />{order.neighborhood}
          </p>
        )}

        {/* Progress */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
            <span>{order.elapsed}min aguardando</span>
            <span>limite {order.maxTime}min</span>
          </div>
          <ProgressBar elapsed={order.elapsed} maxTime={order.maxTime} />
        </div>

        {/* Items summary */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{order.itemCount} {order.itemCount === 1 ? "item" : "itens"}</span>
            <span className="text-xs text-gray-400">{order.payment}</span>
          </div>
          <span className="text-sm font-bold text-gray-800">R$ {order.total.toFixed(2)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
          <button className="flex-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 hover:text-green-600 bg-gray-50 hover:bg-green-50 rounded-lg py-1.5 transition-colors border border-gray-100">
            <MessageCircle className="w-3.5 h-3.5" />WhatsApp
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg py-1.5 transition-colors border border-gray-100">
            <Printer className="w-3.5 h-3.5" />Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanPreviewC() {
  const totalOrders = COLUMNS.reduce((s, c) => s + c.orders.length, 0);
  const overdueCount = [...MOCK_ORDERS, ...PREP, ...READY, ...DELIVERING].filter(o => (o.elapsed / o.maxTime) >= 1).length;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-bold text-gray-900">Gestão de Pedidos</h1>
            <p className="text-gray-400 text-xs">Layout C — Urgência & Timeline · Preview</p>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-blue-700">{totalOrders} pedidos</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-red-600">{overdueCount} atrasados</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Loja Aberta
          </span>
          <input placeholder="🔍 Buscar pedido..." className="border border-gray-200 text-sm px-3 py-1.5 rounded-lg w-44" />
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 min-h-0 flex gap-3 p-4 overflow-x-auto">
        {COLUMNS.map(col => {
          const ColIcon = col.icon;
          return (
            <div key={col.id} className="flex-shrink-0 w-72 flex flex-col h-full">
              <div
                className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 rounded-t-xl"
                style={{ backgroundColor: col.color + "18", borderBottom: `2px solid ${col.color}` }}
              >
                <div className="flex items-center gap-2">
                  <ColIcon className="w-4 h-4" style={{ color: col.color }} />
                  <span className="text-sm font-bold" style={{ color: col.color }}>{col.label}</span>
                </div>
                <span
                  className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: col.color }}
                >{col.orders.length}</span>
              </div>
              <div className="flex-1 min-h-0 bg-slate-100/80 border border-t-0 rounded-b-xl overflow-y-auto p-2 space-y-2" style={{ borderColor: col.color + "30" }}>
                {col.orders.map(o => <MockCardTimeline key={o.id} order={o} />)}
                {col.orders.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-gray-200" />
                    Sem pedidos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 text-center py-2 bg-white border-t border-gray-200">
        <span className="text-gray-400 text-xs">🎨 Layout C — Urgência & Timeline | Compare: <a href="/kanban-preview/a" className="text-blue-500 hover:underline">Layout A</a> · <a href="/kanban-preview/b" className="text-blue-500 hover:underline">Layout B</a></span>
      </div>
    </div>
  );
}
