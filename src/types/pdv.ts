// PDV Types - AnáFood Point of Sale System
import { Database } from '@/integrations/supabase/types';

// Base table types from database
export type PDVSettings = Database['public']['Tables']['pdv_settings']['Row'];
export type Waiter = Database['public']['Tables']['waiters']['Row'];
export type Promotion = Database['public']['Tables']['promotions']['Row'];
export type PromotionProduct = Database['public']['Tables']['promotion_products']['Row'];
export type CashRegister = Database['public']['Tables']['cash_registers']['Row'];
export type CashMovement = Database['public']['Tables']['cash_movements']['Row'];
export type TableArea = Database['public']['Tables']['table_areas']['Row'];
export type Table = Database['public']['Tables']['tables']['Row'];
export type Check = Database['public']['Tables']['checks']['Row'];
export type CheckItem = Database['public']['Tables']['check_items']['Row'];
export type CheckPayment = Database['public']['Tables']['check_payments']['Row'];
export type PendingSale = Database['public']['Tables']['pending_sales']['Row'];

// Extended types for UI
export interface TableWithStatus extends Table {
  area_name?: string;
  active_check?: Check | null;
  check_items_count?: number;
  check_total?: number;
  idle_minutes?: number;
  idle_color?: string;
}

export interface CheckWithItems extends Check {
  items: CheckItem[];
  payments: CheckPayment[];
  table?: Table;
  waiter?: Waiter;
}

export interface CartItemExtra {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string; // temporary cart ID
  product_id: string;
  product_name: string;
  product_sku?: string;
  unit_price: number;
  quantity: number;
  extras: CartItemExtra[];
  extras_total: number;
  notes?: string;
  promotion_id?: string;
  discount_amount?: number;
  total_price: number;
}

// Sale context
export type SaleType = 'counter' | 'table' | 'delivery' | 'pickup';
export type SaleSource = 'pdv' | 'whatsapp' | 'website' | 'ifood' | 'rappi';

export interface SaleContext {
  type: SaleType;
  source: SaleSource;
  table_id?: string;
  table_number?: number;
  check_id?: string;
  check_number?: number;
  waiter_id?: string;
  waiter_name?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  // Delivery info
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  delivery_fee?: number;
  estimated_time?: number;
}

// Cash register
export interface CashRegisterSummary extends CashRegister {
  total_sales: number;
  total_cash: number;
  total_card: number;
  total_pix: number;
  total_withdrawals: number;
  total_deposits: number;
  movements: CashMovement[];
}

// PDV Store state
export interface POSState {
  // Cart
  cart: CartItem[];
  
  // Context
  context: SaleContext;
  
  // Values
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  service_amount: number;
  service_percent: number;
  couvert_amount: number;
  delivery_fee: number;
  total: number;
  
  // Session
  cash_register_id?: string;
  operator_id?: string;
  operator_name?: string;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'total_price'>) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  
  setContext: (context: Partial<SaleContext>) => void;
  resetContext: () => void;
  
  setDiscount: (amount: number, percent?: number) => void;
  setService: (percent: number) => void;
  setCouvert: (amount: number) => void;
  setDeliveryFee: (fee: number) => void;
  
  setSession: (registerId: string, operatorId: string, operatorName: string) => void;
  clearSession: () => void;
  
  // Computed
  calculateTotals: () => void;
}

// Payment dialog
export interface PaymentInfo {
  method_id: string;
  method_name: string;
  method_type: string;
  amount: number;
  received_amount?: number;
  change_amount?: number;
  tip_amount?: number;
  card_brand?: string;
  card_last_digits?: string;
}

// Idle time configuration
export interface IdleTimeConfig {
  minutes_1: number;
  minutes_2: number;
  minutes_3: number;
  color_1: string;
  color_2: string;
  color_3: string;
}

// Cash shortcuts
export interface CashShortcut {
  value: number;
  label: string;
}
