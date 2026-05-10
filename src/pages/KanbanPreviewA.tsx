// v1.0.0 — Preview A: "Pro Dark" — colunas escuras, cards densos, máxima densidade de info
import { Clock, MapPin, Phone, ChefHat, Bike, Package, Star } from "lucide-react";

const MOCK_ORDERS = [
  { id: "1", num: "047", name: "Carlos Silva", phone: "62 9 9876-5432", items: ["2x Frango Grelhado", "1x Suco de Laranja"], total: 52.90, type: "delivery", neighborhood: "Setor Bueno", elapsed: 4, urgent: true },
  { id: "2", num: "048", name: "Ana Paula", phone: "62 9 9123-4567", items: ["1x Executivo P"], total: 18.50, type: "pickup", neighborhood: null, elapsed: 7, urgent: false },
  { id: "3", num: "049", name: "Roberto Nunes", phone: "62 9 8765-4321", items: ["3x Executivo G", "2x Guaraná"], total: 89.00, type: "delivery", neighborhood: "Jardim Goiás", elapsed: 12, urgent: true },
];
const PREP = [
  { id: "4", num: "044", name: "Fernanda Lima", phone: "62 9 9999-0000", items: ["1x Executivo M", "1x Vitamina"], total: 32.00, type: "delivery", neighborhood: "Setor Oeste", elapsed: 18, urgent: false },
  { id: "5", num: "045", name: "João Marcos", phone: "62 9 7777-1234", items: ["2x Frango + Arroz"], total: 44.00, type: "pickup", neighborhood: null, elapsed: 22, urgent: false },
];
const READY = [
  { id: "6", num: "042", name: "Patrícia Moura", phone: "62 9 6666-5678", items: ["1x Executivo G"], total: 25.00, type: "delivery", neighborhood: "Asa Norte", elapsed: 35, urgent: false },
];
const DELIVERING = [
  { id: "7", num: "040", name: "Lucas Sousa", phone: "62 9 5555-9876", items: ["2x Executivo P"], total: 37.00, type: "delivery", neighborhood: "Setor Sul", elapsed: 48, urgent: false },
];
const DONE = [
  { id: "8", num: "038", name: "Juliana Castro", phone: "62 9 4444-0011", items: ["1x Executivo M"], total: 21.00, type: "pickup", neighborhood: null, elapsed: 65, urgent: false },
  { id: "9", num: "039", name: "Marcos Dias", phone: "62 9 3333-2222", items: ["3x Frango G", "1x Suco"], total: 79.50, type: "delivery", neighborhood: "Bueno", elapsed: 72, urgent: false },
];

const COLUMNS = [
  { id: "pending", label: "Aguardando", accent: "#f59e0b", orders: MOCK_ORDERS },
  { id: "preparing", label: "Preparando", accent: "#3b82f6", orders: PREP },
  { id: "ready", label: "Pronto", accent: "#10b981", orders: READY },
  { id: "delivering", label: "Em Entrega", accent: "#8b5cf6", orders: DELIVERING },
  { id: "completed", label: "Concluído", accent: "#6b7280", orders: DONE },
];

function MockCardDark({ order }: { order: typeof MOCK_ORDERS[0] }) {
  const urgentBg = order.urgent ? "ring-1 ring-amber-500/60" : "";
  return (
    <div className={`bg-zinc-800 rounded-lg p-3 cursor-pointer hover:bg-zinc-750 transition-colors border border-zinc-700 ${urgentBg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">#{order.num}</span>
          {order.urgent && <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold">URGENTE</span>}
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          <Clock className="w-3 h-3" />
          <span className="text-[11px]">{order.elapsed}min</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        {order.type === "delivery" ? (
          <Bike className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        ) : (
          <Package className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-white truncate">{order.name}</span>
      </div>

      {order.neighborhood && (
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          <span className="text-[11px] text-zinc-400">{order.neighborhood}</span>
        </div>
      )}

      <div className="space-y-0.5 mb-2">
        {order.items.map((item, i) => (
          <p key={i} className="text-[11px] text-zinc-400 leading-tight">• {item}</p>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Phone className="w-3 h-3" />{order.phone}
        </span>
        <span className="text-sm font-bold text-emerald-400">R$ {order.total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function KanbanPreviewA() {
  return (
    <div className="h-screen bg-zinc-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-zinc-800">
        <div>
          <h1 className="text-white font-bold text-lg">Gestão de Pedidos</h1>
          <p className="text-zinc-500 text-xs">Layout A — Pro Dark · Preview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-900/40 text-emerald-400 px-3 py-1.5 rounded-md text-sm font-medium border border-emerald-800/60">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Loja Aberta
          </div>
          <input placeholder="Buscar pedido..." className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm px-3 py-1.5 rounded-md w-44" />
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 min-h-0 flex gap-3 p-4 overflow-x-auto">
        {COLUMNS.map(col => (
          <div key={col.id} className="flex-shrink-0 w-72 flex flex-col h-full">
            {/* Column header */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 rounded-t-lg mb-0"
              style={{ backgroundColor: col.accent + "22", borderBottom: `2px solid ${col.accent}` }}
            >
              <span className="text-sm font-bold" style={{ color: col.accent }}>{col.label}</span>
              <span
                className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
                style={{ backgroundColor: col.accent, color: "#000" }}
              >{col.orders.length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 min-h-0 bg-zinc-900/60 border border-zinc-800 rounded-b-lg overflow-y-auto p-2 space-y-2">
              {col.orders.map(o => <MockCardDark key={o.id} order={o as any} />)}
              {col.orders.length === 0 && (
                <div className="text-center py-10 text-zinc-600 text-sm">Vazio</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tag de preview */}
      <div className="flex-shrink-0 text-center py-2 bg-zinc-950 border-t border-zinc-800">
        <span className="text-zinc-600 text-xs">🎨 Layout A — Pro Dark | Compare: <a href="/kanban-preview/b" className="text-blue-500 hover:underline">Layout B</a> · <a href="/kanban-preview/c" className="text-blue-500 hover:underline">Layout C</a></span>
      </div>
    </div>
  );
}
