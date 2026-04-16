import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  variationId: string;
  productId: string;
  productName: string;
  variationName: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  shippingPrice?: number;
  bundleVariationId?: string;
  sku?: string | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variationId: string) => void;
  updateQuantity: (variationId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  shippingCost: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.variationId === item.variationId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variationId === item.variationId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
      },
      removeItem: (variationId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variationId !== variationId),
        })),
      updateQuantity: (variationId, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.variationId !== variationId)
            : state.items.map((i) =>
                i.variationId === variationId ? { ...i, quantity } : i
              ),
        })),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      shippingCost: () => {
        const items = get().items;
        if (items.length === 0) return 0;
        return Math.max(...items.map(i => i.shippingPrice || 0));
      },
    }),
    { name: "elwejha-cart" }
  )
);
