// Lógica de criação de pedido via menu público.
// Encapsula chamadas à edge function e fluxo PIX, fora do componente de UI.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PixData {
  orderId: string;
  qrCode: string;
  qrCodeBase64?: string | null;
  expiresAt?: string | null;
}

interface OrderPayload {
  company_id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  items: Array<{ id: string; name: string; price: number; quantity: number; observations?: string }>;
  type: string;
  address?: string;
  payment_method: string;
  observations?: string;
  status: string;
  delivery_fee: number;
  estimated_time: number;
  source: string;
  table_id?: string;
  table_number?: string;
}

interface UseOrderCreationResult {
  createOrder: (
    payload: OrderPayload,
    onSuccess: (orderId: string) => void
  ) => Promise<void>;
  loading: boolean;
  pixData: PixData | null;
  clearPixData: () => void;
}

export function useOrderCreation(): UseOrderCreationResult {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);

  const createOrder = async (payload: OrderPayload, onSuccess: (orderId: string) => void) => {
    setLoading(true);
    try {
      const { data: newOrder, error: orderError } = await supabase.functions.invoke(
        "create-menu-order",
        { body: payload }
      );
      if (orderError) throw new Error(orderError.message);
      if (newOrder?.error) throw new Error(newOrder.error);

      const orderId: string = newOrder?.id;

      // Fluxo PIX Mercado Pago
      if (payload.payment_method === "pix_mp" && orderId) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("create-pix-payment", {
          body: {
            order_id:      orderId,
            company_id:    payload.company_id,
            customer_name: payload.customer_name,
            total:         payload.total,
          },
        });
        if (fnError || fnData?.error) throw new Error(fnData?.error ?? "Erro ao gerar PIX");
        setPixData({ orderId, qrCode: fnData.qr_code, qrCodeBase64: fnData.qr_code_base64, expiresAt: fnData.expires_at });
        return; // aguarda confirmação via polling
      }

      onSuccess(orderId);
    } finally {
      setLoading(false);
    }
  };

  return { createOrder, loading, pixData, clearPixData: () => setPixData(null) };
}
