import { supabase } from "@/integrations/supabase/client";

/**
 * API Client para interagir com o backend AnáFood
 * Suporta tanto Supabase direto quanto Cloudflare Gateway
 */

// URL base - usar Cloudflare Gateway se disponível, senão Supabase direto
const USE_CLOUDFLARE = false; // Mudar para true após deploy do Cloudflare
const SUPABASE_BASE_URL = "https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1";
const CLOUDFLARE_BASE_URL = "https://api.anafood.vip";

const API_BASE_URL = USE_CLOUDFLARE ? CLOUDFLARE_BASE_URL : SUPABASE_BASE_URL;

/**
 * Cliente API seguro que valida JWT + API Token
 */
class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("Usuário não autenticado");
    }

    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    };
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getHeaders();
    
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: "Erro ao processar requisição" 
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Orders API
  async getOrders(companyId: string) {
    return this.request(`api-orders?action=list&company_id=${companyId}`);
  }

  async updateOrderStatus(orderId: string, status: string, companyId: string) {
    return this.request(`api-orders`, {
      method: "POST",
      body: JSON.stringify({ 
        action: "update_status",
        order_id: orderId,
        status,
        company_id: companyId
      }),
    });
  }

  async deleteOrder(orderId: string) {
    return this.request(`api-orders`, {
      method: "POST",
      body: JSON.stringify({ 
        action: "delete",
        order_id: orderId 
      }),
    });
  }

  async createOrder(orderData: any) {
    return this.request(`api-orders`, {
      method: "POST",
      body: JSON.stringify({
        action: "create",
        order: orderData
      }),
    });
  }

  // Store Settings API
  async getStoreSettings(companyId: string) {
    return this.request(`api-settings?company_id=${companyId}`);
  }

  async updateStoreSettings(companyId: string, settings: Record<string, any>) {
    return this.request(`api-settings`, {
      method: "POST",
      body: JSON.stringify({ 
        company_id: companyId,
        settings 
      }),
    });
  }
}

export const apiClient = new ApiClient();
