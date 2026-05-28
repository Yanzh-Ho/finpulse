import { useState, useCallback, useMemo } from 'react';
import type { Candle } from '../types';
import { isTWMarket } from '../utils/market';
import type { Market } from '../utils/market';

const PERIODS = [
  { key: 'w1', label: '1W', days: 5 },
  { key: 'm1', label: '1M', days: 21 },
  { key: 'm3', label: '3M', days: 63 },
  { key: 'm6', label: '6M', days: 126 },
  { key: 'y1', label: '1Y', days: 252 },
] as const;

type PeriodKey = typeof PERIODS[number]['key'];
type ChartMode = 'candle' | 'line';

interface ChartSVGProps {
  history: Candle[];
  W?: number;
  H?: number;
  accent?: string;
  gradId?: string;
  isUp?: boolean;
  showControls?: boolean;
  initMode?: ChartMode;
  initPeriod?: PeriodKey;
  market?: Market;
}

export function ChartSVG({
  history,
  W = 600,
  H = 160,
  accent = '#4f8ef7',
  gradId = 'g0',
  isUp = true,
  showControls = true,
  initMode = 'candle',
  initPeriod = 'm3',
  market = 'US',
}: ChartSVGProps) {
  // ── ALL hooks must be declared unconditionally before any early return ──────
  const [mode, setMode] = useState<ChartMode>(initMode);
  const [period, setPeriod] = useState<PeriodKey>(initPeriod);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    const pd = PERIODS.find((p) => p.key === period) ?? PERIODS[2];
    return history.slice(-pd.days);
  }, [history, period]);

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (data.length < 2) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      const i = Math.round((x / W) * (data.length - 1));
      setHoverIdx(Math.max(0, Math.min(data.length - 1, i)));
    },
    [W, data],
  );

  // Loading / empty-data guard — all hooks already declared above
  if (data.length < 2) return null;

  const allH = data.map((d) => d.h);
  const allL = data.map((d) => d.l);
  const minP = Math.min(...allL) * 0.998;
  const maxP = Math.max(...allH) * 1.002;
  const rng = maxP - minP || 1;

  const xOf = (i: number) => (i / (data.length - 1)) * W;
  const yOf = (v: number) => 4 + (1 - (v - minP) / rng) * (H - 8);
  const bw = Math.max((W / data.length) * 0.55, 1.5);

  // TW: up candle = red, down candle = green; US: up = green, down = red
  const tw = isTWMarket(market);
  const upCandleColor   = tw ? '#ff4060' : '#00d98b';
  const downCandleColor = tw ? '#00d98b' : '#ff4060';
  const lineColor = isUp ? upCandleColor : downCandleColor;

  const hov = hoverIdx !== null ? data[hoverIdx] : null;
  const pts = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)} ${yOf(d.c).toFixed(1)}`)
    .join(' ');
  const area = `${pts} L${W} ${H} L0 ${H}Z`;

  return (
    <div>
      {showControls && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '3px 9px',
                border: 'none',
                background: period === p.key ? 'rgba(79,142,247,.15)' : 'none',
                color: period === p.key ? '#4f8ef7' : '#4a6890',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            {(['candle', 'line'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '3px 9px',
                  border: `1px solid ${mode === m ? 'rgba(79,142,247,.4)' : 'rgba(79,142,247,.15)'}`,
                  background: mode === m ? 'rgba(79,142,247,.12)' : 'none',
                  color: mode === m ? '#4f8ef7' : '#4a6890',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {m === 'candle' ? '╫ K線' : '∿ 折線'}
              </button>
            ))}
            {hov && (
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: '#ccd8f5',
                  fontWeight: 600,
                }}
              >
                {hov.c.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', cursor: showControls ? 'crosshair' : 'default' }}
        onMouseMove={showControls ? onMove : undefined}
        onMouseLeave={showControls ? () => setHoverIdx(null) : undefined}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {mode === 'candle'
          ? data.map((d, i) => {
              const candleUp = d.c >= d.o;
              const col = candleUp ? upCandleColor : downCandleColor;
              const bTop = Math.min(yOf(d.o), yOf(d.c));
              const bH = Math.max(Math.abs(yOf(d.o) - yOf(d.c)), 1);
              return (
                <g key={i}>
                  <line
                    x1={xOf(i)}
                    y1={yOf(d.h)}
                    x2={xOf(i)}
                    y2={yOf(d.l)}
                    stroke={col}
                    strokeWidth="1"
                    opacity={0.55}
                  />
                  <rect
                    x={xOf(i) - bw / 2}
                    y={bTop}
                    width={bw}
                    height={bH}
                    fill={col}
                    opacity={0.85}
                  />
                </g>
              );
            })
          : (
            <>
              <path d={area} fill={`url(#${gradId})`} />
              <path
                d={pts}
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

        {hov && hoverIdx !== null && (
          <>
            <line
              x1={xOf(hoverIdx)}
              y1="0"
              x2={xOf(hoverIdx)}
              y2={H}
              stroke={accent}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <circle
              cx={xOf(hoverIdx)}
              cy={yOf(hov.c)}
              r="4"
              fill={accent}
              stroke="#070b14"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  );
}
