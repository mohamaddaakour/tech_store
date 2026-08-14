# Phase 9 — Console-grade navigation & motion

**Goal:** The dashboard behaves like the Xbox-inspired console UI the spec calls for: arrow-key/gamepad navigation between tiles with visible focus (scale + glow), a product tile that expands into the full product page via a shared-element transition, staggered load-in animations, and full `prefers-reduced-motion` support.
**Time:** ~6h · **Difficulty:** ●●●●○
**Depends on:** Phase 6 complete (needs the real product grid, search, and a product detail concept to animate between)

## ✅ What you'll have when this is done

Every interactive element in the grid is keyboard/gamepad-focusable in a 2D tile layout (arrow keys move focus row/column-aware, not just DOM tab order), focused tiles enlarge with a glow ring, Enter/click opens a product detail view that visually grows out of the tile's position, and toggling reduced-motion (OS setting or an in-app switch) strips all of it down to instant, functional transitions.

```bash
$ npm run dev
```
Load the grid → press arrow keys → focus visibly moves tile-to-tile with scale+glow → press Enter on a tile → it expands into a full product page → press Escape → it shrinks back to the grid at the same tile position.

## Why this phase now

This is genuinely the UI's differentiator per `SUBJECT.md`, but it's also the part most likely to fight with whatever ad-hoc layout earlier phases produced — building it once the real data (search, filters, admin) is stable means the navigation layer wraps working content instead of being built against placeholder tiles that change shape later.

## Before you start

```bash
cd frontend && npm install framer-motion
```

## Files in this phase

```
frontend/src/
├── hooks/useTileNavigation.ts        ← NEW  (2D arrow-key focus grid)
├── hooks/useReducedMotion.ts         ← NEW
├── components/ProductCard.tsx        ← MODIFIED  motion + focus states
├── components/ProductGrid.tsx        ← MODIFIED  staggered entrance, layoutId wiring
├── pages/ProductDetailPage.tsx       ← NEW  (shared-element target)
└── App.tsx / router                  ← MODIFIED  route to detail page
```

## Steps

### 1. Respect reduced motion first

**Why:** building this as an afterthought means retrofitting every animation later; building it first means every animation you add from here on checks it by construction.

`frontend/src/hooks/useReducedMotion.ts`
```ts
import { useEffect, useState } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = () => setReduced(mql.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])
  return reduced
}
```

Every `framer-motion` component below reads this and swaps its `transition` for `{ duration: 0 }` when true — shown once here, applied the same way everywhere else.

### 2. 2D keyboard/gamepad tile focus

**Why:** default browser Tab order is a flat list; a console dashboard needs arrow keys to move up/down/left/right through a *grid*, which requires knowing each tile's row/column.

`frontend/src/hooks/useTileNavigation.ts`
```ts
import { useEffect, useState } from 'react'

export function useTileNavigation(columns: number, itemCount: number) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const deltas: Record<string, number> = {
        ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns,
      }
      const delta = deltas[e.key]
      if (delta === undefined) return
      e.preventDefault()
      setFocusedIndex((i) => Math.min(Math.max(i + delta, 0), itemCount - 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [columns, itemCount])

  return focusedIndex   // ← ProductGrid maps this to which tile gets the focus ring
}
```

Gamepad support: poll `navigator.getGamepads()` inside a `requestAnimationFrame` loop and map D-pad/left-stick to the same `setFocusedIndex` deltas — add as a second effect in the same hook once keyboard nav is verified working, so you're debugging one input source at a time.

### 3. Focus glow + staggered entrance

`frontend/src/components/ProductCard.tsx` (motion additions)
```tsx
import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function ProductCard({ product, focused, index }: { product: Product; focused: boolean; index: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      layoutId={`product-${product.id}`}   // ← the key that makes the detail-page transition "shared element"
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, scale: focused ? 1.05 : 1 }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
      className={`bg-[var(--color-surface)] rounded-xl overflow-hidden ${
        focused ? 'ring-2 ring-[var(--color-accent)] shadow-[0_0_20px_var(--color-accent)]' : ''
      }`}
    >
      {/* existing image/name/price/button content from Phase 1–2 */}
    </motion.div>
  )
}
```

`ProductGrid.tsx` wraps its list in `<AnimatePresence>` (from `framer-motion`) and wires `useTileNavigation(columnCount, products.length)`'s result into each card's `focused` prop, plus a `<Link to={/product/${p.id}}>` (or programmatic navigate on Enter) to open the detail page.

### 4. Shared-element product detail transition

**Why:** matching `layoutId` between the grid tile and the detail page's hero element is what makes Framer Motion animate a *morph* between them instead of a hard cut.

`frontend/src/pages/ProductDetailPage.tsx`
```tsx
import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
// ... fetch the single product by id (extend api/products.ts with fetchProduct(id)) ...

export function ProductDetailPage() {
  const { id } = useParams()
  // const { data: product } = useProduct(id)  — fetch as in ProductGrid

  return (
    <motion.div layoutId={`product-${id}`} className="min-h-screen p-12">
      {/* full cinematic layout: large image, specs, add-to-cart — same layoutId
          as the grid tile is what produces the "tile expands into page" effect */}
    </motion.div>
  )
}
```

Both the grid and the detail page must be mounted under the same `<AnimatePresence>`/router transition boundary for the `layoutId` morph to animate rather than snap — see Framer Motion's [shared layout animations](https://motion.dev/docs/react-layout-animations) docs for the router-integration pattern (`AnimatePresence mode="wait"` around `<Routes>`).

## Verify it works

```bash
npm run dev
```
Tab through with arrow keys (not mouse) and confirm focus is always visible and moves in the expected 2D direction. Click/Enter a tile, confirm it visually grows into the detail page rather than a hard navigation cut. Toggle "Reduce motion" in your OS accessibility settings, reload, confirm the same interactions still work but instantly, with no glow/scale animation.

## Definition of done

- [ ] Full keyboard navigation with no mouse: arrow keys move focus, Enter opens, Escape/Back returns
- [ ] Focused tile is unambiguous (scale + glow), matching the spec's described focus behavior
- [ ] Detail page opens via a shared-element morph, not a hard cut
- [ ] With `prefers-reduced-motion: reduce` set, all animations collapse to instant with functionality intact
- [ ] Committed

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| Shared-element transition doesn't morph, just cuts | Grid and detail page aren't both inside the same `AnimatePresence`, or `layoutId` strings don't match exactly | Confirm identical `layoutId` string and a shared `AnimatePresence` ancestor |
| Arrow keys also scroll the page | Not calling `e.preventDefault()` in the keydown handler | Add it (already in the snippet above — verify it's not lost in a refactor) |

## Deliberately NOT in this phase

- Sound effects on focus/navigation → optional per spec, add last if time allows
- Full parallax/particle background effects → cosmetic polish, add after this phase's structural navigation is solid
- Mobile touch-optimized tile rows → responsive pass, can follow this phase using the same focus/motion primitives

## Commit

```bash
git commit -am "phase 9: console-style keyboard/gamepad navigation and shared-element motion"
```
