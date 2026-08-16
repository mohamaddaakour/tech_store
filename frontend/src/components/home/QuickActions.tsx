import { Link } from "react-router-dom";
import { Heart, LayoutGrid, Package, Sparkles } from "../ui/icons";
import type { IconComponent } from "../ui/icons";
import { useUiStore } from "../../store/uiStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useMyOrders } from "../../hooks/useOrders";
import { useAuthStore } from "../../store/authStore";
import { useAllProducts } from "../../hooks/useProducts";
import { CountUp } from "../ui/CountUp";

interface Tile {
  label: string;
  hint: string;
  icon: IconComponent;
  count: number;

  to?: string;
  onClick?: () => void;
}

export function QuickActions() {
  const setPanel = useUiStore((state) => state.setPanel);
  const savedCount = useWishlistStore((state) => state.ids.length);

  const isSignedIn = useAuthStore((state) => state.user !== null);
  const { data: myOrders } = useMyOrders(0, { enabled: isSignedIn });
  const orderCount = myOrders?.totalElements ?? 0;
  const { data: products } = useAllProducts();

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
            <div className="absolute inset-0 gradient-accent opacity-0 transition-opacity duration-300 group-hover:opacity-10" />

            <div className="relative flex items-start justify-between gap-2">
              <span className="grid size-9 place-items-center rounded-control bg-surface-2 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                <tile.icon className="size-4.5" />
              </span>

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
          <div
            key={tile.label}
            style={{ animationDelay: `${index * 60}ms` }}
            className="animate-rise transition-transform duration-300 hover:-translate-y-1"
          >
            {tile.to ? (
              <Link to={tile.to} className={tileClasses}>
                {content}
              </Link>
            ) : (
              <button onClick={tile.onClick} className={tileClasses}>
                {content}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
