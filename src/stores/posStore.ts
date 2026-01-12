import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POSState, CartItem, SaleContext, SaleType } from '@/types/pdv';

const generateCartId = () => `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const defaultContext: SaleContext = {
  type: 'counter',
  source: 'pdv',
};

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      // Cart
      cart: [],
      
      // Context
      context: defaultContext,
      
      // Values
      subtotal: 0,
      discount_amount: 0,
      discount_percent: 0,
      service_amount: 0,
      service_percent: 0,
      couvert_amount: 0,
      delivery_fee: 0,
      total: 0,
      
      // Session
      cash_register_id: undefined,
      operator_id: undefined,
      operator_name: undefined,
      
      // Actions
      addItem: (item) => {
        const id = generateCartId();
        const total_price = (item.unit_price * item.quantity) + item.extras_total - (item.discount_amount || 0);
        
        set((state) => ({
          cart: [...state.cart, { ...item, id, total_price }],
        }));
        get().calculateTotals();
      },
      
      updateItem: (id, updates) => {
        set((state) => ({
          cart: state.cart.map((item) => {
            if (item.id !== id) return item;
            
            const updated = { ...item, ...updates };
            // Recalculate total
            updated.total_price = 
              (updated.unit_price * updated.quantity) + 
              updated.extras_total - 
              (updated.discount_amount || 0);
            
            return updated;
          }),
        }));
        get().calculateTotals();
      },
      
      removeItem: (id) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        }));
        get().calculateTotals();
      },
      
      clearCart: () => {
        set({
          cart: [],
          subtotal: 0,
          discount_amount: 0,
          discount_percent: 0,
          service_amount: 0,
          couvert_amount: 0,
          delivery_fee: 0,
          total: 0,
        });
      },
      
      setContext: (updates) => {
        set((state) => ({
          context: { ...state.context, ...updates },
        }));
        get().calculateTotals();
      },
      
      resetContext: () => {
        set({
          context: defaultContext,
          delivery_fee: 0,
        });
        get().calculateTotals();
      },
      
      setDiscount: (amount, percent) => {
        set({ discount_amount: amount, discount_percent: percent || 0 });
        get().calculateTotals();
      },
      
      setService: (percent) => {
        set({ service_percent: percent });
        get().calculateTotals();
      },
      
      setCouvert: (amount) => {
        set({ couvert_amount: amount });
        get().calculateTotals();
      },
      
      setDeliveryFee: (fee) => {
        set({ delivery_fee: fee });
        get().calculateTotals();
      },
      
      setSession: (registerId, operatorId, operatorName) => {
        set({
          cash_register_id: registerId,
          operator_id: operatorId,
          operator_name: operatorName,
        });
      },
      
      clearSession: () => {
        set({
          cash_register_id: undefined,
          operator_id: undefined,
          operator_name: undefined,
        });
      },
      
      calculateTotals: () => {
        const state = get();
        
        // Subtotal = sum of all item totals
        const subtotal = state.cart.reduce((acc, item) => acc + item.total_price, 0);
        
        // Service = percent of subtotal (configurable if on subtotal or total)
        const service_amount = subtotal * (state.service_percent / 100);
        
        // Total = subtotal + service + couvert + delivery - discount
        const total = 
          subtotal + 
          service_amount + 
          state.couvert_amount + 
          state.delivery_fee - 
          state.discount_amount;
        
        set({
          subtotal,
          service_amount,
          total: Math.max(0, total), // Never negative
        });
      },
    }),
    {
      name: 'anafood-pos-store',
      partialize: (state) => ({
        // Only persist cart and context
        cart: state.cart,
        context: state.context,
        cash_register_id: state.cash_register_id,
        operator_id: state.operator_id,
        operator_name: state.operator_name,
      }),
    }
  )
);
