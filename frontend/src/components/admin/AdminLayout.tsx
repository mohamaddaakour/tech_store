import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Package, ShoppingBag, Tags, Users } from "../ui/icons";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";

const ADMIN_TABS = [
  { to: "/admin", label: "Overview", icon: BarChart3, end: true },
  { to: "/admin/products", label: "Products", icon: Package, end: false },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, end: false },
  { to: "/admin/catalog", label: "Catalogue", icon: Tags, end: false },
  { to: "/admin/users", label: "Users", icon: Users, end: false },
] as const;

export function AdminLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Admin</h1>
            <Badge tone="accent">Staff only</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Catalogue, orders, customers and analytics
          </p>
        </div>
      </div>

      <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
        {ADMIN_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}

            end={tab.end}
            className={({ isActive }) =>
              cn(
                "relative flex shrink-0 items-center gap-2 rounded-control px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "text-accent" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="animate-fade-in absolute inset-0 rounded-control bg-accent/10 ring-1 ring-accent/40" />
                )}
                <tab.icon className="relative size-4" />
                <span className="relative">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
