import { Home, LayoutGrid, Heart, Package, Settings } from "../ui/icons";
import type { IconComponent } from "../ui/icons";

export interface NavItem {
  to: string;
  label: string;
  icon: IconComponent;

  shortLabel: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Dashboard", shortLabel: "Home", icon: Home },
  { to: "/store", label: "Store", shortLabel: "Store", icon: LayoutGrid },
  { to: "/collection", label: "Collection", shortLabel: "Saved", icon: Heart },
  { to: "/orders", label: "Orders", shortLabel: "Orders", icon: Package },
  { to: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];
