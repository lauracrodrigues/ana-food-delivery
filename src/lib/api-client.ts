import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

  async updateOrderStatus(orderId: string, status: string) {
    return this.request(`api-orders`, {
      method: "POST",
      body: JSON.stringify({ 
        action: "update_status",
        order_id: orderId,
        status 
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
