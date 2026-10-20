'use client';

import { useEffect, useState } from 'react';

type ScoreRingProps = {
  value: number | null | undefined;
  max?: number;
  label: string;
  color: string;
  size?: number;
  sub?: string;
  band?: string | null;
};

/** Animated SVG progress ring that fills from 0 on mount. */
export function ScoreRing({ value, max = 100, label, color, size = 140, sub, band }: ScoreRingProps) {
  const target = value == null ? 0 : Math.min(1, Math.max(0, value / max));
  const [p, setP] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setP(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // The band word is a server value, never derived from the score.
  const subName = sub && sub.toLowerCase() !== label.toLowerCase() ? ` ${sub}` : '';
  const baseName = value == null ? `${label} not available` : `${label} ${Math.round(value)}${subName}`;
  const ringName = band ? `${baseName}, band ${band}` : baseName;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={ringName}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tabular-nums text-white">
            {value == null ? 'n/a' : Math.round(value)}
          </span>
          {sub ? <span className="text-[11px] text-slate-400">{sub}</span> : null}
        </div>
      </div>
      <span className="text-sm font-bold text-slate-200">{label}</span>
      {band ? (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-200">{band}</span>
      ) : null}
      {value == null ? <span className="text-[11px] text-slate-500">Not available</span> : null}
    </div>
  );
}
