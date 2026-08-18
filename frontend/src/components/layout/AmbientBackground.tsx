export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-ink) 1px, transparent 1px)," +
            "linear-gradient(to bottom, var(--color-ink) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="ambient-layer absolute -left-40 -top-40 size-[38rem] rounded-full bg-accent/20 blur-[120px] animate-glow-pulse" />
      <div
        className="ambient-layer absolute -right-52 top-1/3 size-[34rem] rounded-full bg-accent-alt/15 blur-[130px] animate-glow-pulse"

        style={{ animationDelay: "1.6s" }}
      />
      <div
        className="ambient-layer absolute -bottom-20 left-1/3 size-[26rem] rounded-full bg-accent/10 blur-[110px] animate-float"
        style={{ animationDelay: "0.8s" }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--color-bg)_100%)] opacity-70" />
    </div>
  );
}
