import { cookies } from "next/headers";

const CART_COOKIE = "fc_cart";
const MAX_ITEMS = 20;

export type CartItem = { productId: string; qty: number };

export function parseCart(raw: string | undefined): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CartItem =>
          typeof item === "object" &&
          item !== null &&
          typeof item.productId === "string" &&
          typeof item.qty === "number" &&
          item.qty > 0
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function serializeCart(items: CartItem[]): string {
  return JSON.stringify(items.slice(0, MAX_ITEMS));
}

export async function readCart(): Promise<CartItem[]> {
  const c = await cookies();
  return parseCart(c.get(CART_COOKIE)?.value);
}

export function addItem(items: CartItem[], productId: string): CartItem[] {
  const existing = items.find((i) => i.productId === productId);
  if (existing) return items; // already in cart, no duplicate
  return [...items, { productId, qty: 1 }];
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.productId !== productId);
}
