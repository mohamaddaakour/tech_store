import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Heart, LayoutGrid, Package, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useOrderStore } from "../../store/orderStore";
import { useProducts } from "../../hooks/useProducts";
import { CountUp } from "../ui/CountUp";

/**
 * The dashboard's smaller "quick action" tiles — the console equivalent of the
 * shortcut row beneath the featured panel.
 *
 * Each one carries a live count, so the row doubles as an at-a-glance status
 * readout: how big the catalogue is, how many things you have saved, how many
 * orders are open. A grid of static links would be far less useful.
 */

interface Tile {
  label: string;
  hint: string;
  icon: LucideIcon;
  count: number;
  /** A route, or omit and pass `onClick` for a panel. */
  to?: string;
  onClick?: () => void;
}

export function QuickActions() {
  const setPanel = useUiStore((state) => state.setPanel);
  const savedCount = useWishlistStore((state) => state.ids.length);
  const orderCount = useOrderStore((state) => state.orders.length);
  const { data: products } = useProducts();

  const reduceMotion = useReducedMotion();

  const tiles: Tile[] = [
    {
      label: "Store",
      hint: "Browse everything",
      icon: LayoutGrid,
      count: products?.length ?? 0,
      to: "/store",
    },
    {
      label: "Collection",
      hint: "Saved for later",
      icon: Heart,
      count: savedCount,
      to: "/collection",
    },
    {
      label: "Orders",
      hint: "Track deliveries",
      icon: Package,
      count: orderCount,
      to: "/orders",
    },
    {
      label: "Assistant",
      hint: "Ask about products",
      icon: Sparkles,
      count: 0,
      onClick: () => setPanel("assistant"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile, index) => {
        const content = (
          <>
            {/* Hover glow, painted behind the content. `opacity-0` -> `group-hover`
                means it costs nothing until you reach for the tile. */}
            <div className="absolute inset-0 gradient-accent opacity-0 transition-opacity duration-300 group-hover:opacity-10" />

            <div className="relative flex items-start justify-between gap-2">
              <span className="grid size-9 place-items-center rounded-control bg-surface-2 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                <tile.icon className="size-4.5" />
              </span>

              {/* Counts of zero are hidden rather than shown as "0" — an empty
                  collection does not need a badge announcing its emptiness. */}
              {tile.count > 0 && (
                <span className="text-xl font-black tabular-nums text-ink">
                  <CountUp value={tile.count} />
                </span>
              )}
            </div>

            <div className="relative mt-3">
              <p className="text-sm font-semibold text-ink">{tile.label}</p>
              <p className="text-[11px] text-ink-faint">{tile.hint}</p>
            </div>
          </>
        );

        const tileClasses =
          "group relative flex w-full flex-col overflow-hidden rounded-tile bg-surface p-4 text-left ring-1 ring-line transition-shadow duration-300 hover:glow-accent focus-visible:glow-accent";

        return (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.4, delay: index * 0.06 }
            }
            whileHover={reduceMotion ? undefined : { y: -4 }}
          >
            {/* A real anchor for navigation, a button for a panel. Using a button to
                navigate would lose middle-click and "open in new tab"; using an
                anchor for a panel would lie about where it goes. */}
            {tile.to ? (
              <Link to={tile.to} className={tileClasses}>
                {content}
              </Link>
            ) : (
              <button onClick={tile.onClick} className={tileClasses}>
                {content}
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
