/** Animated futuristic background (CSS only, deterministic so server and client markup match). */
export function FxBackground() {
  const dots = Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    top: (i * 53 + 7) % 100,
    size: 1 + (i % 3),
    dur: 6 + ((i * 7) % 9),
    delay: -((i * 5) % 13),
  }));
  return (
    <div className="fx-bg" aria-hidden>
      <div className="fx-grid" />
      <div className="fx-blob a" />
      <div className="fx-blob b" />
      <div className="fx-blob c" />
      {dots.map((d, i) => (
        <span key={i} className="fx-dot" style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />
      ))}
    </div>
  );
}
