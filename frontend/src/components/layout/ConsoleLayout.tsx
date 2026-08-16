import { useLocation, useOutlet } from "react-router-dom";
import { ToastViewport } from "../ui/ToastViewport";
import { AmbientBackground } from "./AmbientBackground";
import { MobileTabBar, NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { CartDrawer } from "../cart/CartDrawer";
import { SearchOverlay } from "../search/SearchOverlay";
import { AssistantPanel } from "../assistant/AssistantPanel";
import { useApplyTheme } from "../../hooks/useApplyTheme";
import { useGlobalShortcuts } from "../../hooks/useGlobalShortcuts";
import { useRestoreSession } from "../../hooks/useAuth";

export function ConsoleLayout() {
  const location = useLocation();

  const outlet = useOutlet();

  useApplyTheme();
  useGlobalShortcuts();

  useRestoreSession();

  return (
    <div className="min-h-screen">
      <AmbientBackground />
      <NavRail />

      <div className="lg:pl-[72px]">
        <TopBar />

        <main className="px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:pb-16">
          <div key={location.pathname} className="animate-rise mx-auto max-w-[1600px]">
            {outlet}
          </div>
        </main>
      </div>

      <MobileTabBar />

      <CartDrawer />
      <SearchOverlay />
      <AssistantPanel />

      <ToastViewport />
    </div>
  );
}
