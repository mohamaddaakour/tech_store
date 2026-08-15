import { Home, LayoutGrid, Heart, Package, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown on the mobile tab bar, where space is tight. */
  shortLabel: string;
}

/**
 * The primary destinations, defined once.
 *
 * The desktop rail and the mobile tab bar both render from this array, which is
 * what guarantees they cannot drift out of sync — adding a section is a one-line
 * change here rather than an edit in two components that someone will forget.
 *
 * The names follow SUBJECT.md's "store sections as console experiences" idea,
 * adapted into original TechStore terminology rather than copying Xbox's:
 * Dashboard, Store, Collection (wishlist), Orders, Settings.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Dashboard", shortLabel: "Home", icon: Home },
  { to: "/store", label: "Store", shortLabel: "Store", icon: LayoutGrid },
  { to: "/collection", label: "Collection", shortLabel: "Saved", icon: Heart },
  { to: "/orders", label: "Orders", shortLabel: "Orders", icon: Package },
  { to: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];
