# Phase 2 — Cart that survives a refresh

**Goal:** A shopper clicks "Add to cart" on a tile, sees a live cart count and total, and the cart is still there after reloading the page.
**Time:** ~2h · **Difficulty:** ●○○○○
**Depends on:** Phase 1 complete

## ✅ What you'll have when this is done

A Zustand store holding cart line items, persisted to `localStorage`, with an "Add to cart" button on each tile and a cart drawer showing items, quantities, and a running total.

```bash
$ npm run dev
```
Click "Add to cart" on two tiles → header cart badge shows `2` → open the drawer → see both items and a total → refresh the page → still there.

## Why this phase now

Cart-before-auth (guest cart) is the natural next widen of the spine: it's pure frontend state, no backend changes, and proves the shopping loop before accounts complicate it. Phase 3 will migrate this cart to be user-owned.

## Before you start

```bash
cd frontend && npm install zustand
```

## Files in this phase

```
frontend/src/
├── store/cartStore.ts       ← NEW
├── components/
│   ├── ProductCard.tsx      ← MODIFIED  add "Add to cart" button
│   ├── CartDrawer.tsx       ← NEW
│   └── CartBadge.tsx        ← NEW
└── App.tsx                  ← MODIFIED  render badge + drawer
```

## Steps

### 1. Create the persisted cart store

**Why:** Zustand's `persist` middleware gives `localStorage` survival for free — no manual `useEffect` read/write plumbing.

`frontend/src/store/cartStore.ts`
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../types/product'

export interface CartLine {
  product: Product
  quantity: number
}

interface CartState {
  lines: CartLine[]
  add: (product: Product) => void
  remove: (productId: number) => void
  totalCents: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (product) =>
        set((state) => {
          const existing = state.lines.find((l) => l.product.id === product.id)
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
              ),
            }
          }
          return { lines: [...state.lines, { product, quantity: 1 }] }
        }),
      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),
      totalCents: () => get().lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0),
      totalItems: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    { name: 'techstore-cart' }   // ← localStorage key
  )
)
```

**Check:** in a scratch component, `useCartStore.getState().add(someProduct)` then reload — `localStorage.getItem('techstore-cart')` has the item.

### 2. Wire the "Add to cart" button

**Why:** this is the only user action this phase adds.

`frontend/src/components/ProductCard.tsx` (add inside the `<div className="p-4">`)
```tsx
import { useCartStore } from '../store/cartStore'
// ...
export function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((s) => s.add)   // ←
  // ... existing price calc ...
  return (
    <div className="bg-[var(--color-surface)] rounded-xl overflow-hidden ...">
      <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="font-semibold">{product.name}</h3>
        <p className="text-sm text-gray-400">{price}</p>
        <p className="text-xs text-gray-500">{product.stock > 0 ? 'In stock' : 'Out of stock'}</p>
        <button
          onClick={() => add(product)}
          disabled={product.stock === 0}
          className="mt-2 w-full py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-sm font-medium disabled:opacity-40"
        >
          Add to cart
        </button>
      </div>
    </div>
  )
}
```

### 3. Add the badge and drawer

`frontend/src/components/CartBadge.tsx`
```tsx
import { useCartStore } from '../store/cartStore'

export function CartBadge({ onClick }: { onClick: () => void }) {
  const count = useCartStore((s) => s.totalItems())
  return (
    <button onClick={onClick} className="relative px-3 py-1.5 rounded-lg bg-[var(--color-surface)]">
      Cart
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-[var(--color-accent)] text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  )
}
```

`frontend/src/components/CartDrawer.tsx`
```tsx
import { useCartStore } from '../store/cartStore'

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lines = useCartStore((s) => s.lines)
  const remove = useCartStore((s) => s.remove)
  const total = useCartStore((s) => s.totalCents())

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-end" onClick={onClose}>
      <div className="w-80 h-full bg-[var(--color-surface)] p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold mb-4">Your cart</h2>
        {lines.length === 0 && <p className="text-gray-500">Empty</p>}
        {lines.map((l) => (
          <div key={l.product.id} className="flex justify-between items-center mb-2">
            <span>{l.product.name} × {l.quantity}</span>
            <button onClick={() => remove(l.product.id)} className="text-red-400 text-sm">remove</button>
          </div>
        ))}
        <div className="border-t border-gray-700 mt-4 pt-2 font-bold">
          Total: ${(total / 100).toFixed(2)}
        </div>
      </div>
    </div>
  )
}
```

`frontend/src/App.tsx`
```tsx
import { useState } from 'react'
import { ProductGrid } from './components/ProductGrid'
import { CartBadge } from './components/CartBadge'
import { CartDrawer } from './components/CartDrawer'

function App() {
  const [cartOpen, setCartOpen] = useState(false)
  return (
    <main className="min-h-screen">
      <header className="p-6 flex justify-between items-center">
        <span className="text-xl font-bold tracking-tight">TechStore</span>
        <CartBadge onClick={() => setCartOpen(true)} />
      </header>
      <ProductGrid />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </main>
  )
}

export default App
```

## Verify it works

```bash
npm run dev
```
Add two different products, open the cart drawer, confirm line items and total match, reload the browser tab, drawer still shows both items.

## Definition of done

- [ ] Adding the same product twice increments quantity instead of duplicating a line
- [ ] Reload survives — cart state comes back from `localStorage`
- [ ] Out-of-stock products have a disabled "Add to cart" button
- [ ] Committed

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| Cart empties on refresh | `persist` name collides with a leftover key from testing, or store not wrapped in `persist(...)` | Check `localStorage.getItem('techstore-cart')` in devtools |
| Badge count stuck at 0 | Selector reads `s.lines.length` instead of `s.totalItems()` (doesn't account for quantity) | Use `totalItems()` |

## Deliberately NOT in this phase

- Cart tied to a user account → Phase 3
- Checkout / order creation → Phase 4
- Cart quantity +/- stepper, remove animations → later polish (Phase 9)

## Commit

```bash
git commit -am "phase 2: guest cart persisted to localStorage"
```
