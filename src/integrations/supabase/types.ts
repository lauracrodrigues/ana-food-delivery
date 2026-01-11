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
          ip_address: unknown
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          authorized_by: string | null
          authorized_by_name: string | null
          cash_register_id: string
          company_id: string
          created_at: string | null
          created_by: string
          created_by_name: string | null
          id: string
          movement_type: string
          reason: string | null
        }
        Insert: {
          amount: number
          authorized_by?: string | null
          authorized_by_name?: string | null
          cash_register_id: string
          company_id: string
          created_at?: string | null
          created_by: string
          created_by_name?: string | null
          id?: string
          movement_type: string
          reason?: string | null
        }
        Update: {
          amount?: number
          authorized_by?: string | null
          authorized_by_name?: string | null
          cash_register_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string
          created_by_name?: string | null
          id?: string
          movement_type?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_register_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          closing_notes: string | null
          company_id: string
          created_at: string | null
          difference: number | null
          expected_amount: number | null
          id: string
          opened_at: string | null
          opening_amount: number
          opening_notes: string | null
          operator_id: string
          operator_name: string | null
          status: string | null
          terminal_name: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_notes?: string | null
          company_id: string
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string | null
          opening_amount?: number
          opening_notes?: string | null
          operator_id: string
          operator_name?: string | null
          status?: string | null
          terminal_name?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_notes?: string | null
          company_id?: string
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string | null
          opening_amount?: number
          opening_notes?: string | null
          operator_id?: string
          operator_name?: string | null
          status?: string | null
          terminal_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          company_id: string
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          on_off: boolean | null
          print_sector: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          on_off?: boolean | null
          print_sector?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          on_off?: boolean | null
          print_sector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      check_items: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_id: string
          company_id: string
          created_at: string | null
          created_by: string
          delivered_at: string | null
          discount_amount: number | null
          extras: Json | null
          extras_total: number | null
          id: string
          notes: string | null
          original_price: number | null
          print_count: number | null
          print_location: string | null
          printed_at: string | null
          product_id: string
          product_name: string
          product_sku: string | null
          promotion_id: string | null
          quantity: number | null
          ready_at: string | null
          seat_number: number | null
          sent_at: string | null
          split_from_id: string | null
          status: string | null
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_id: string
          company_id: string
          created_at?: string | null
          created_by: string
          delivered_at?: string | null
          discount_amount?: number | null
          extras?: Json | null
          extras_total?: number | null
          id?: string
          notes?: string | null
          original_price?: number | null
          print_count?: number | null
          print_location?: string | null
          printed_at?: string | null
          product_id: string
          product_name: string
          product_sku?: string | null
          promotion_id?: string | null
          quantity?: number | null
          ready_at?: string | null
          seat_number?: number | null
          sent_at?: string | null
          split_from_id?: string | null
          status?: string | null
          total_price: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string
          delivered_at?: string | null
          discount_amount?: number | null
          extras?: Json | null
          extras_total?: number | null
          id?: string
          notes?: string | null
          original_price?: number | null
          print_count?: number | null
          print_location?: string | null
          printed_at?: string | null
          product_id?: string
          product_name?: string
          product_sku?: string | null
          promotion_id?: string | null
          quantity?: number | null
          ready_at?: string | null
          seat_number?: number | null
          sent_at?: string | null
          split_from_id?: string | null
          status?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_items_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_items_split_from_id_fkey"
            columns: ["split_from_id"]
            isOneToOne: false
            referencedRelation: "check_items"
            referencedColumns: ["id"]
          },
        ]
      }
      check_payments: {
        Row: {
          amount: number
          authorization_code: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          card_brand: string | null
          card_last_digits: string | null
          cash_register_id: string | null
          change_amount: number | null
          check_id: string
          company_id: string
          created_at: string | null
          id: string
          nsu: string | null
          payment_method_id: string | null
          payment_method_name: string
          payment_method_type: string | null
          processed_at: string | null
          processed_by: string
          received_amount: number | null
          status: string | null
          tip_amount: number | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_brand?: string | null
          card_last_digits?: string | null
          cash_register_id?: string | null
          change_amount?: number | null
          check_id: string
          company_id: string
          created_at?: string | null
          id?: string
          nsu?: string | null
          payment_method_id?: string | null
          payment_method_name: string
          payment_method_type?: string | null
          processed_at?: string | null
          processed_by: string
          received_amount?: number | null
          status?: string | null
          tip_amount?: number | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_brand?: string | null
          card_last_digits?: string | null
          cash_register_id?: string | null
          change_amount?: number | null
          check_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          nsu?: string | null
          payment_method_id?: string | null
          payment_method_name?: string
          payment_method_type?: string | null
          processed_at?: string | null
          processed_by?: string
          received_amount?: number | null
          status?: string | null
          tip_amount?: number | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_payments_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_payments_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_register_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_payments_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      check_sequences: {
        Row: {
          company_id: string
          last_number: number | null
          last_reset_date: string | null
          reset_daily: boolean | null
        }
        Insert: {
          company_id: string
          last_number?: number | null
          last_reset_date?: string | null
          reset_daily?: boolean | null
        }
        Update: {
          company_id?: string
          last_number?: number | null
          last_reset_date?: string | null
          reset_daily?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "check_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          address_reference: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_register_id: string | null
          check_number: number
          city: string | null
          closed_at: string | null
          closed_by: string | null
          company_id: string
          couvert_amount: number | null
          couvert_count: number | null
          couvert_unit_price: number | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          discount_amount: number | null
          discount_by: string | null
          discount_percent: number | null
          discount_reason: string | null
          estimated_time: number | null
          external_id: string | null
          guest_count: number | null
          id: string
          internal_notes: string | null
          last_item_at: string | null
          neighborhood: string | null
          notes: string | null
          opened_at: string | null
          opened_by: string
          order_id: string | null
          paid_amount: number | null
          paid_at: string | null
          printed_at: string | null
          sent_at: string | null
          service_amount: number | null
          service_percent: number | null
          source: string | null
          state: string | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          total_amount: number | null
          type: string
          updated_at: string | null
          waiter_id: string | null
          waiter_name: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          address_reference?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_register_id?: string | null
          check_number: number
          city?: string | null
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          couvert_amount?: number | null
          couvert_count?: number | null
          couvert_unit_price?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          discount_amount?: number | null
          discount_by?: string | null
          discount_percent?: number | null
          discount_reason?: string | null
          estimated_time?: number | null
          external_id?: string | null
          guest_count?: number | null
          id?: string
          internal_notes?: string | null
          last_item_at?: string | null
          neighborhood?: string | null
          notes?: string | null
          opened_at?: string | null
          opened_by: string
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          printed_at?: string | null
          sent_at?: string | null
          service_amount?: number | null
          service_percent?: number | null
          source?: string | null
          state?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          total_amount?: number | null
          type?: string
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          address_reference?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_register_id?: string | null
          check_number?: number
          city?: string | null
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          couvert_amount?: number | null
          couvert_count?: number | null
          couvert_unit_price?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          discount_amount?: number | null
          discount_by?: string | null
          discount_percent?: number | null
          discount_reason?: string | null
          estimated_time?: number | null
          external_id?: string | null
          guest_count?: number | null
          id?: string
          internal_notes?: string | null
          last_item_at?: string | null
          neighborhood?: string | null
          notes?: string | null
          opened_at?: string | null
          opened_by?: string
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          printed_at?: string | null
          sent_at?: string | null
          service_amount?: number | null
          service_percent?: number | null
          source?: string | null
          state?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          total_amount?: number | null
          type?: string
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checks_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_register_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "v_tables_with_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: Json | null
          banner_url: string | null
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
          schedule: Json | null
          segment: string | null
          subdomain: string
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: Json | null
          banner_url?: string | null
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
          schedule?: Json | null
          segment?: string | null
          subdomain: string
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: Json | null
          banner_url?: string | null
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
          schedule?: Json | null
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
            foreignKeyName: "coupon_uses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
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
          {
            foreignKeyName: "coupons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          addresses: Json | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          last_order_at: string | null
          last_order_data: Json | null
          last_order_id: string | null
          name: string
          notes: string | null
          pending_order: Json | null
          phone: string
          total_orders: number | null
          updated_at: string
        }
        Insert: {
          addresses?: Json | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          last_order_data?: Json | null
          last_order_id?: string | null
          name: string
          notes?: string | null
          pending_order?: Json | null
          phone: string
          total_orders?: number | null
          updated_at?: string
        }
        Update: {
          addresses?: Json | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          last_order_data?: Json | null
          last_order_id?: string | null
          name?: string
          notes?: string | null
          pending_order?: Json | null
          phone?: string
          total_orders?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_last_order_id_fkey"
            columns: ["last_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      group_extras: {
        Row: {
          created_at: string | null
          display_order: number | null
          extra_id: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          extra_id: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          extra_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_extras_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_banners: {
        Row: {
          company_id: string
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          link_type: string | null
          link_value: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_type?: string | null
          link_value?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_type?: string | null
          link_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_banners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_banners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      msg_history: {
        Row: {
          company_id: string | null
          created_at: string
          history_msg: string | null
          id: number
          id_msg: string | null
          message: Json | null
          name: string | null
          phone: string | null
          session_id: string | null
          timestamp: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          history_msg?: string | null
          id?: number
          id_msg?: string | null
          message?: Json | null
          name?: string | null
          phone?: string | null
          session_id?: string | null
          timestamp?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          history_msg?: string | null
          id?: number
          id_msg?: string | null
          message?: Json | null
          name?: string | null
          phone?: string | null
          session_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          city: string | null
          company_id: string
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          estimated_time: number | null
          id: string
          items: Json | null
          neighborhood: string | null
          observations: string | null
          order_number: string | null
          payment_method: string | null
          source: string
          state: string | null
          status: string
          total: number
          type: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          company_id: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          estimated_time?: number | null
          id?: string
          items?: Json | null
          neighborhood?: string | null
          observations?: string | null
          order_number?: string | null
          payment_method?: string | null
          source: string
          state?: string | null
          status?: string
          total: number
          type?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          company_id?: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          estimated_time?: number | null
          id?: string
          items?: Json | null
          neighborhood?: string | null
          observations?: string | null
          order_number?: string | null
          payment_method?: string | null
          source?: string
          state?: string | null
          status?: string
          total?: number
          type?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
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
          type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pdv_settings: {
        Row: {
          allow_negative_stock: boolean | null
          auto_print_on_send: boolean | null
          cash_shortcuts: Json | null
          cash_shortcuts_enabled: boolean | null
          company_id: string
          couvert_description: string | null
          couvert_enabled: boolean | null
          couvert_price: number | null
          created_at: string | null
          default_service_percent: number | null
          id: string
          idle_alert_minutes_1: number | null
          idle_alert_minutes_2: number | null
          idle_alert_minutes_3: number | null
          idle_color_1: string | null
          idle_color_2: string | null
          idle_color_3: string | null
          max_discount_percent: number | null
          nfce_default_emit: boolean | null
          nfce_enabled: boolean | null
          pending_sales_enabled: boolean | null
          pending_sales_expire_hours: number | null
          receipt_footer: string | null
          receipt_header: string | null
          require_open_register: boolean | null
          require_waiter_on_table: boolean | null
          service_on_subtotal: boolean | null
          service_optional: boolean | null
          updated_at: string | null
          withdrawal_limit: number | null
        }
        Insert: {
          allow_negative_stock?: boolean | null
          auto_print_on_send?: boolean | null
          cash_shortcuts?: Json | null
          cash_shortcuts_enabled?: boolean | null
          company_id: string
          couvert_description?: string | null
          couvert_enabled?: boolean | null
          couvert_price?: number | null
          created_at?: string | null
          default_service_percent?: number | null
          id?: string
          idle_alert_minutes_1?: number | null
          idle_alert_minutes_2?: number | null
          idle_alert_minutes_3?: number | null
          idle_color_1?: string | null
          idle_color_2?: string | null
          idle_color_3?: string | null
          max_discount_percent?: number | null
          nfce_default_emit?: boolean | null
          nfce_enabled?: boolean | null
          pending_sales_enabled?: boolean | null
          pending_sales_expire_hours?: number | null
          receipt_footer?: string | null
          receipt_header?: string | null
          require_open_register?: boolean | null
          require_waiter_on_table?: boolean | null
          service_on_subtotal?: boolean | null
          service_optional?: boolean | null
          updated_at?: string | null
          withdrawal_limit?: number | null
        }
        Update: {
          allow_negative_stock?: boolean | null
          auto_print_on_send?: boolean | null
          cash_shortcuts?: Json | null
          cash_shortcuts_enabled?: boolean | null
          company_id?: string
          couvert_description?: string | null
          couvert_enabled?: boolean | null
          couvert_price?: number | null
          created_at?: string | null
          default_service_percent?: number | null
          id?: string
          idle_alert_minutes_1?: number | null
          idle_alert_minutes_2?: number | null
          idle_alert_minutes_3?: number | null
          idle_color_1?: string | null
          idle_color_2?: string | null
          idle_color_3?: string | null
          max_discount_percent?: number | null
          nfce_default_emit?: boolean | null
          nfce_enabled?: boolean | null
          pending_sales_enabled?: boolean | null
          pending_sales_expire_hours?: number | null
          receipt_footer?: string | null
          receipt_header?: string | null
          require_open_register?: boolean | null
          require_waiter_on_table?: boolean | null
          service_on_subtotal?: boolean | null
          service_optional?: boolean | null
          updated_at?: string | null
          withdrawal_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_sales: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          created_by: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          expires_at: string | null
          id: string
          items: Json
          neighborhood: string | null
          notes: string | null
          reference: string | null
          subtotal: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          items?: Json
          neighborhood?: string | null
          notes?: string | null
          reference?: string | null
          subtotal?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          items?: Json
          neighborhood?: string | null
          notes?: string | null
          reference?: string | null
          subtotal?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_staff_view"
            referencedColumns: ["id"]
          },
        ]
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
      product_group_links: {
        Row: {
          created_at: string | null
          display_order: number | null
          group_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          group_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          group_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_group_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_group_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_selection: number | null
          min_selection: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_selection?: number | null
          min_selection?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_selection?: number | null
          min_selection?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_weekdays: string[] | null
          category_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          internal_code: string | null
          name: string
          on_off: boolean | null
          price: number
          print_sector: string | null
        }
        Insert: {
          available_weekdays?: string[] | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          internal_code?: string | null
          name: string
          on_off?: boolean | null
          price: number
          print_sector?: string | null
        }
        Update: {
          available_weekdays?: string[] | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          internal_code?: string | null
          name?: string
          on_off?: boolean | null
          price?: number
          print_sector?: string | null
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
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
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
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_products: {
        Row: {
          id: string
          product_id: string
          promotion_id: string
          special_price: number | null
        }
        Insert: {
          id?: string
          product_id: string
          promotion_id: string
          special_price?: number | null
        }
        Update: {
          id?: string
          product_id?: string
          promotion_id?: string
          special_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string | null
          apply_to_counter: boolean | null
          apply_to_delivery: boolean | null
          apply_to_table: boolean | null
          category_id: string | null
          company_id: string
          created_at: string | null
          days_of_week: number[] | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          start_date: string | null
          start_time: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          applies_to?: string | null
          apply_to_counter?: boolean | null
          apply_to_delivery?: boolean | null
          apply_to_table?: boolean | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          start_date?: string | null
          start_time?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          applies_to?: string | null
          apply_to_counter?: boolean | null
          apply_to_delivery?: boolean | null
          apply_to_table?: boolean | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          start_date?: string | null
          start_time?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
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
          delivery_time: number | null
          id: string
          notification_sound: string | null
          order_numbering_mode: string | null
          order_numbering_reset_time: string | null
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
          delivery_time?: number | null
          id?: string
          notification_sound?: string | null
          order_numbering_mode?: string | null
          order_numbering_reset_time?: string | null
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
          delivery_time?: number | null
          id?: string
          notification_sound?: string | null
          order_numbering_mode?: string | null
          order_numbering_reset_time?: string | null
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
          {
            foreignKeyName: "store_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      table_areas: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          area_id: string | null
          capacity: number | null
          company_id: string
          created_at: string | null
          height: number | null
          id: string
          is_active: boolean | null
          name: string | null
          position_x: number | null
          position_y: number | null
          shape: string | null
          status: string | null
          table_number: string
          updated_at: string | null
          width: number | null
        }
        Insert: {
          area_id?: string | null
          capacity?: number | null
          company_id: string
          created_at?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          position_x?: number | null
          position_y?: number | null
          shape?: string | null
          status?: string | null
          table_number: string
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          area_id?: string | null
          capacity?: number | null
          company_id?: string
          created_at?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          position_x?: number | null
          position_y?: number | null
          shape?: string | null
          status?: string | null
          table_number?: string
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "table_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
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
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      waiters: {
        Row: {
          assigned_area_id: string | null
          code: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          assigned_area_id?: string | null
          code?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          assigned_area_id?: string | null
          code?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiters_assigned_area_id_fkey"
            columns: ["assigned_area_id"]
            isOneToOne: false
            referencedRelation: "table_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          agent_name: string | null
          agent_prompt: string | null
          company_id: string
          config_type: string
          created_at: string
          id: string
          is_active: boolean | null
          message: string | null
          message_template: string | null
          session_name: string | null
          status: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_prompt?: string | null
          company_id: string
          config_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          message_template?: string | null
          session_name?: string | null
          status?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_prompt?: string | null
          company_id?: string
          config_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          message_template?: string | null
          session_name?: string | null
          status?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      companies_staff_view: {
        Row: {
          banner_url: string | null
          description: string | null
          fantasy_name: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          schedule: Json | null
        }
        Insert: {
          banner_url?: string | null
          description?: string | null
          fantasy_name?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          schedule?: Json | null
        }
        Update: {
          banner_url?: string | null
          description?: string | null
          fantasy_name?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          schedule?: Json | null
        }
        Relationships: []
      }
      customers_staff_view: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_cash_register_summary: {
        Row: {
          card_sales: number | null
          cash_sales: number | null
          closed_at: string | null
          closing_amount: number | null
          company_id: string | null
          difference: number | null
          expected_amount: number | null
          expected_cash: number | null
          id: string | null
          opened_at: string | null
          opening_amount: number | null
          operator_id: string | null
          operator_name: string | null
          pix_sales: number | null
          status: string | null
          terminal_name: string | null
          tips_total: number | null
          total_sales: number | null
          total_supplies: number | null
          total_withdrawals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tables_with_checks: {
        Row: {
          area_id: string | null
          area_name: string | null
          capacity: number | null
          company_id: string | null
          current_total: number | null
          height: number | null
          id: string | null
          is_active: boolean | null
          last_item_at: string | null
          minutes_idle: number | null
          minutes_occupied: number | null
          name: string | null
          oldest_opened_at: string | null
          open_checks_count: number | null
          position_x: number | null
          position_y: number | null
          shape: string | null
          status: string | null
          table_number: string | null
          waiter_name: string | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "table_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_pending_sales: {
        Args: never
        Returns: {
          deleted_count: number
          oldest_deleted: string
        }[]
      }
      get_next_check_number: { Args: { p_company_id: string }; Returns: number }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
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
