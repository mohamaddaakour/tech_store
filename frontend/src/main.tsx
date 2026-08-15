import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

/**
 * The TanStack Query cache, created once outside the component tree.
 *
 * Creating it inside a component would build a new cache on every render, discarding
 * everything fetched so far — which presents as "my queries refetch constantly for no
 * reason".
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Do not refetch merely because the tab regained focus. The default (`true`)
       * suits a dashboard whose data goes stale by the second; for a product
       * catalogue it means a request every time the user alt-tabs back.
       * `useProducts` sets its own `staleTime` for finer control.
       */
      refetchOnWindowFocus: false,

      /**
       * One retry, not the default three. Three retries with exponential backoff mean
       * a genuinely-down backend takes several seconds to report an error, during
       * which the user just watches a spinner. One still absorbs a transient blip.
       */
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  /**
   * StrictMode double-invokes renders and effects in development to surface bugs
   * (missing cleanup, effects unsafe to run twice). It does nothing in production. If
   * something breaks only in dev, StrictMode is usually reporting a real bug rather
   * than causing one — see the ref guard in `useRestoreSession`.
   */
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter uses the History API for clean URLs (`/store`, not `/#/store`).
          It must sit above <App /> because every route, Link and navigation hook reads
          from its context. Note this needs the dev/production server to serve
          index.html for unknown paths, or a hard refresh on /store would 404. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
