// A faint kids-book "adventure trail" drawn down the slide: a dotted path with a
// marker per stop, filled up to the current one, "X marks the spot" at the end.
// Low opacity — it's background texture + a progress cue, never the focus.
export function JourneyMap({ total, idx }: { total: number; idx: number }) {
  const n = Math.max(total, 2);
  const pts = Array.from({ length: n }, (_, i) => {
    const y = 14 + (i / (n - 1)) * 172; // top → bottom
    const x = 50 + Math.sin(i * 1.2) * 28; // gentle wander
    return { x, y };
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`)).join(" ");

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      viewBox="0 0 100 200"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.13 }}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth="1.1"
        strokeDasharray="2.5 3"
        strokeLinecap="round"
      />
      {pts.map((p, i) => {
        const done = i <= idx;
        const isLast = i === n - 1;
        return (
          <g key={i}>
            {i === idx && (
              <circle cx={p.x} cy={p.y} r={5.5} fill="none" stroke="white" strokeWidth="0.7" />
            )}
            {isLast ? (
              <>
                <line
                  x1={p.x - 2.4}
                  y1={p.y - 2.4}
                  x2={p.x + 2.4}
                  y2={p.y + 2.4}
                  stroke="white"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
                <line
                  x1={p.x - 2.4}
                  y1={p.y + 2.4}
                  x2={p.x + 2.4}
                  y2={p.y - 2.4}
                  stroke="white"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <circle
                cx={p.x}
                cy={p.y}
                r={2.6}
                fill={done ? "white" : "none"}
                stroke="white"
                strokeWidth="0.9"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
