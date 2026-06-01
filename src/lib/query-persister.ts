// v1.0.0 — Persister React Query via IndexedDB (Fase 3A ecossistema)
// Persiste cache pra leitura offline (mesas, pedidos, cardápio)
// IndexedDB tem limite maior que localStorage (>50MB vs 5MB)
import { get, set, del } from "idb-keyval";
import type { Persister } from "@tanstack/react-query-persist-client";

const STORAGE_KEY = "anafood-react-query-v1";

export const idbPersister: Persister = {
  persistClient: async (client) => {
    await set(STORAGE_KEY, client);
  },
  restoreClient: async () => {
    return (await get(STORAGE_KEY)) ?? undefined;
  },
  removeClient: async () => {
    await del(STORAGE_KEY);
  },
};

// Dehydrate options: persistir só queries operacionais (mesas/pedidos/cardápio)
// Skip queries com dados sensíveis (auth, billing, admin)
export function shouldDehydrateQuery(query: any): boolean {
  const key = query.queryKey?.[0];
  if (typeof key !== "string") return false;
  const allowList = [
    "orders", "tables", "comandas", "cash-register",
    "products", "categories", "modifier-groups",
    "customers", "deliverers", "store-settings",
    "company", "company-profile", "menu", "extras",
  ];
  return allowList.some(k => key.startsWith(k));
}
