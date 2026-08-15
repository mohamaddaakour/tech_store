import { ButtonLink } from "../components/ui/Button";

/**
 * 404. Reached by the catch-all `path="*"` route.
 *
 * Rendered inside the console shell rather than as a bare page, so the nav rail and
 * top bar stay available — a dead end that still lets you navigate is far less
 * frustrating than one that strands you.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {/* The gradient utilities from index.css: an animated accent gradient clipped
          to the glyphs. */}
      <p className="gradient-accent animate-gradient text-gradient text-7xl font-black tracking-tighter">
        404
      </p>

      <div>
        <h1 className="text-lg font-bold text-ink">This screen does not exist</h1>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          The page you were looking for has moved, or never existed.
        </p>
      </div>

      <div className="mt-2 flex gap-3">
        <ButtonLink to="/">Back to dashboard</ButtonLink>
        <ButtonLink to="/store" variant="secondary">
          Browse the store
        </ButtonLink>
      </div>
    </div>
  );
}
