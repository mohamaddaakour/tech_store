/**
 * The living backdrop behind every page: a faint blueprint grid plus slow
 * drifting colour orbs.
 *
 * This is what stops a dark UI reading as "flat black rectangle". It gives the
 * interface depth and a sense of being a lit environment rather than a document.
 *
 * Three things make it safe to have on every page:
 *
 * - `fixed inset-0 -z-10` — it sits behind all content and never scrolls, so it
 *   costs nothing in layout and cannot trap clicks.
 * - `pointer-events-none` — clicks pass straight through to the page.
 * - `aria-hidden` — it is pure decoration; a screen reader must not narrate it.
 *
 * The orbs carry `ambient-layer`, which `index.css` removes entirely under
 * reduced-motion / low-motion. For ambient movement the right response is to
 * delete it, not freeze it mid-drift.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Blueprint grid. Two crossed repeating gradients, kept at very low
          opacity — it should register as texture, not as a visible table. */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-ink) 1px, transparent 1px)," +
            "linear-gradient(to bottom, var(--color-ink) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Colour orbs. Enormous, heavily blurred and low opacity, so they read as
          light spilling into the scene rather than as circles. */}
      <div className="ambient-layer absolute -left-40 -top-40 size-[38rem] rounded-full bg-accent/20 blur-[120px] animate-glow-pulse" />
      <div
        className="ambient-layer absolute -right-52 top-1/3 size-[34rem] rounded-full bg-accent-alt/15 blur-[130px] animate-glow-pulse"
        // Offset so the two orbs breathe out of phase; in sync they would look
        // like one mechanism pulsing.
        style={{ animationDelay: "1.6s" }}
      />
      <div
        className="ambient-layer absolute -bottom-20 left-1/3 size-[26rem] rounded-full bg-accent/10 blur-[110px] animate-float"
        style={{ animationDelay: "0.8s" }}
      />

      {/* Vignette: darkens the edges to pull the eye toward the centre. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--color-bg)_100%)] opacity-70" />
    </div>
  );
}
