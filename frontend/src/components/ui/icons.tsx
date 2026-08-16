import type { SVGProps } from "react";

export type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export const Sparkles: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </Icon>
);

export const Moon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
  </Icon>
);

export const Sun: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const User: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
  </Icon>
);

export const ShoppingCart: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L20 8H6" />
  </Icon>
);

export const Search: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);

export const CornerDownLeft: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M20 4v7a4 4 0 0 1-4 4H4M9 11l-5 4 5 4" />
  </Icon>
);

export const Check: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

export const CreditCard: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </Icon>
);

export const MapPin: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

export const Receipt: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </Icon>
);

export const Package: IconComponent = (props) => (
  <Icon {...props}>
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    <path d="M3.3 7 12 2l8.7 5v10L12 22l-8.7-5Z" />
  </Icon>
);

export const Truck: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="1" y="6" width="14" height="11" rx="1" />
    <path d="M15 9h4l3 3v5h-7Z" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="17" cy="19" r="2" />
  </Icon>
);

export const XCircle: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Icon>
);

export const BarChart3: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4 20V10M12 20V4M20 20v-7" />
  </Icon>
);

export const ShoppingBag: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M6 8h12l1 13H5Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
);

export const Tags: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M11 3H4v7l9.3 9.3a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Icon>
);

export const Users: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c1.2-3.2 3.8-5 6.5-5s5.3 1.8 6.5 5" />
    <path d="M16.5 5.5c1.5.4 2.5 1.7 2.5 3.2s-1 2.8-2.5 3.2M21.5 20c-.7-2-2-3.6-3.7-4.5" />
  </Icon>
);

export const ShieldCheck: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const ChevronLeft: IconComponent = (props) => (
  <Icon {...props}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const ChevronRight: IconComponent = (props) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const SlidersHorizontal: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4 6h6M14 6h6M4 12h11M19 12h1M4 18h2M10 18h10" />
    <circle cx="12" cy="6" r="2" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="12" r="2" />
  </Icon>
);

export const ShieldAlert: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5Z" />
    <path d="M12 8v4M12 16h.01" />
  </Icon>
);

export const Home: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M3 11 12 3l9 8" />
    <path d="M5 10v10h14V10" />
  </Icon>
);

export const LayoutGrid: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </Icon>
);

export const Heart: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 20s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.6-9.5 9-9.5 9Z" />
  </Icon>
);

export const Settings: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Icon>
);

export const X: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const Zap: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M13 2 3 14h8l-1 8 10-12h-8Z" />
  </Icon>
);

export const ArrowRight: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const ArrowLeft: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Icon>
);

export const Plus: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const Minus: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
);

export const AlertTriangle: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 3 2 20h20Z" />
    <path d="M12 9v5M12 17h.01" />
  </Icon>
);

export const Boxes: IconComponent = (props) => (
  <Icon {...props}>
    <path d="m3 8 5-3 5 3v6l-5 3-5-3Z" />
    <path d="m13 8 5-3 5 3v6l-5 3-5-3" />
    <path d="M8 11v6l5 3 5-3v-6" />
  </Icon>
);

export const DollarSign: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 1v22" />
    <path d="M17 5.5c0-1.9-2.2-3.5-5-3.5s-5 1.4-5 3.2c0 4.3 10 2 10 6.3 0 1.8-2.2 3.2-5 3.2s-5-1.6-5-3.5" />
  </Icon>
);

export const TrendingUp: IconComponent = (props) => (
  <Icon {...props}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Icon>
);

export const Pencil: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);

export const Trash2: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
);
