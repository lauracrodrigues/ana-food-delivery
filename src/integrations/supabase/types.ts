export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          name: string
          on_off: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          on_off?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          on_off?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: Json | null
          cnpj: string | null
          created_at: string | null
          delivery_mode: string | null
          description: string | null
          email: string | null
          fantasy_name: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string | null
          phone: string | null
          plan_id: string | null
          segment: string | null
          subdomain: string
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: Json | null
          cnpj?: string | null
          created_at?: string | null
          delivery_mode?: string | null
          description?: string | null
          email?: string | null
          fantasy_name?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          plan_id?: string | null
          segment?: string | null
          subdomain: string
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: Json | null
          cnpj?: string | null
          created_at?: string | null
          delivery_mode?: string | null
          description?: string | null
          email?: string | null
          fantasy_name?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          plan_id?: string | null
          segment?: string | null
          subdomain?: string
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          company_id: string
          coupon_id: string
          id: string
          used_at: string
        }
        Insert: {
          company_id: string
          coupon_id: string
          id?: string
          used_at?: string
        }
        Update: {
          company_id?: string
          coupon_id?: string
          id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          company_id: string | null
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          uses_count: number | null
          valid_until: string | null
        }
        Insert: {
          code: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          uses_count?: number | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          uses_count?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      delivery_fees: {
        Row: {
          company_id: string
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean | null
          max_distance_km: number | null
          min_order_value: number | null
          updated_at: string
          zone_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean | null
          max_distance_km?: number | null
          min_order_value?: number | null
          updated_at?: string
          zone_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean | null
          max_distance_km?: number | null
          min_order_value?: number | null
          updated_at?: string
          zone_name?: string
        }
        Relationships: []
      }
      extras: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          on_off: boolean | null
          price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          on_off?: boolean | null
          price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          on_off?: boolean | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          estimated_time: number | null
          id: string
          items: Json | null
          observations: string | null
          order_number: string | null
          payment_method: string | null
          status: string
          total: number
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          estimated_time?: number | null
          id?: string
          items?: Json | null
          observations?: string | null
          order_number?: string | null
          payment_method?: string | null
          status?: string
          total: number
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          estimated_time?: number | null
          id?: string
          items?: Json | null
          observations?: string | null
          order_number?: string | null
          payment_method?: string | null
          status?: string
          total?: number
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          max_orders_per_month: number | null
          max_products: number | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          max_orders_per_month?: number | null
          max_products?: number | null
          name: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          max_orders_per_month?: number | null
          max_products?: number | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          on_off: boolean | null
          price: number
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          on_off?: boolean | null
          price: number
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          on_off?: boolean | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          alert_time: number | null
          auto_accept: boolean | null
          company_id: string
          created_at: string | null
          default_whatsapp_session: string | null
          delivery_fee: number | null
          delivery_time: number | null
          id: string
          pickup_time: number | null
          printer_settings: Json | null
          sound_enabled: boolean | null
          store_open: boolean | null
          updated_at: string | null
          visible_columns: Json | null
        }
        Insert: {
          alert_time?: number | null
          auto_accept?: boolean | null
          company_id: string
          created_at?: string | null
          default_whatsapp_session?: string | null
          delivery_fee?: number | null
          delivery_time?: number | null
          id?: string
          pickup_time?: number | null
          printer_settings?: Json | null
          sound_enabled?: boolean | null
          store_open?: boolean | null
          updated_at?: string | null
          visible_columns?: Json | null
        }
        Update: {
          alert_time?: number | null
          auto_accept?: boolean | null
          company_id?: string
          created_at?: string | null
          default_whatsapp_session?: string | null
          delivery_fee?: number | null
          delivery_time?: number | null
          id?: string
          pickup_time?: number | null
          printer_settings?: Json | null
          sound_enabled?: boolean | null
          store_open?: boolean | null
          updated_at?: string | null
          visible_columns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_alerts: {
        Row: {
          company_id: string
          created_at: string | null
          customer_name: string
          id: string
          message: string | null
          phone: string
          read: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          customer_name: string
          id?: string
          message?: string | null
          phone: string
          read?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          customer_name?: string
          id?: string
          message?: string | null
          phone?: string
          read?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          agent_name: string
          agent_prompt: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          session_name: string
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          agent_prompt?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          session_name: string
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          agent_prompt?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          session_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_status_messages: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          message_template: string
          status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message_template: string
          status: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message_template?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _record_id?: string
          _table_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "company_admin" | "company_staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "company_admin", "company_staff"],
    },
  },
} as const
