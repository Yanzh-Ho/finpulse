import { useState } from 'react';
import type { Stock } from '../types';
import type { Market } from '../utils/market';
import { isTWMarket, priceColor, marketLabel, marketBadgeStyle } from '../utils/market';
import { ChartSVG } from './Chart';

interface Props {
  stocks: Record<string, Stock>;
  onSelectStock: (ticker: string) => void;
  watchlist: string[];
  onRemoveFromWatchlist: (ticker: string) => void;
}

type MarketFilter = 'all' | 'US' | 'TWSE' | 'TPEx' | 'Emerging' | 'InnovationBoard';

const FILTERS: [MarketFilter, string][] = [
  ['all', '全部市場'],
  ['US', '🇺🇸 美股'],
  ['TWSE', '🇹🇼 上市'],
  ['TPEx', '🇹🇼 上櫃'],
  ['Emerging', '興櫃'],
  ['InnovationBoard', '創新板'],
];

export function WatchlistView({ stocks, onSelectStock, watchlist, onRemoveFromWatchlist }: Props) {
  const [mktFilter, setMktFilter] = useState<MarketFilter>('all');

  const filtered = watchlist.filter((t) => {
    const s = stocks[t];
    if (!s) return false;
    if (mktFilter === 'all') return true;
    return s.market === mktFilter;
  });

  // Only show filter tabs that have stocks or are always visible (all/US/TWSE)
  const visibleFilters = FILTERS.filter(([k]) => {
    if (k === 'all' || k === 'US' || k === 'TWSE') return true;
    return watchlist.some(t => stocks[t]?.market === k);
  });

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 24,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(79,142,247,.2) transparent',
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>自選股</div>
      <div style={{ fontSize: 13, color: '#4a6890', marginBottom: 16 }}>
        {watchlist.length} 檔股票 · AI 監控中
      </div>

      {/* Market filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {visibleFilters.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setMktFilter(k)}
            style={{
              padding: '6px 16px',
              border: `1px solid ${mktFilter === k ? 'rgba(79,142,247,.45)' : 'rgba(79,142,247,.18)'}`,
              background: mktFilter === k ? 'rgba(79,142,247,.14)' : 'none',
              color: mktFilter === k ? '#4f8ef7' : '#4a6890',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12,
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: mktFilter === k ? 600 : 400,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((ticker) => {
          const s = stocks[ticker];
          if (!s) return null;
          const isUp = s.pct >= 0;
          const pctC = priceColor(s.pct, s.market as Market);
          const badge = marketBadgeStyle(s.market as Market);
          const label = marketLabel(s.market as Market);
          const vC =
            s.verdict === 'BUY' ? '#00d98b' : s.verdict === 'SELL' ? '#ff4060' : '#ffd666';
          const vBg =
            s.verdict === 'BUY'
              ? 'rgba(0,217,139,.12)'
              : s.verdict === 'SELL'
              ? 'rgba(255,64,96,.12)'
              : 'rgba(255,214,102,.12)';
          const vBrd =
            s.verdict === 'BUY'
              ? 'rgba(0,217,139,.3)'
              : s.verdict === 'SELL'
              ? 'rgba(255,64,96,.3)'
              : 'rgba(255,214,102,.3)';
          const verdictLabel = s.verdict === 'BUY' ? '買進' : s.verdict === 'SELL' ? '賣出' : '持有';
          const chartUp = isTWMarket(s.market as Market) ? !isUp : isUp;

          return (
            <div
              key={ticker}
              onClick={() => onSelectStock(ticker)}
              style={{
                background: '#101e35',
                border: '1px solid rgba(79,142,247,.15)',
                borderRadius: 9,
                padding: 14,
                cursor: 'pointer',
                transition: 'border-color .2s, transform .2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,142,247,.45)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,142,247,.15)';
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                    >
                      {ticker}
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: '1px 6px',
                        borderRadius: 3,
                        ...badge,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4a6890' }}>{s.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    {s.sym}{s.price.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: pctC,
                      marginTop: 2,
                    }}
                  >
                    {isUp ? '+' : ''}{s.pct.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div style={{ height: 68, marginBottom: 10 }}>
                <ChartSVG
                  history={s.history}
                  W={260}
                  H={68}
                  accent={pctC}
                  gradId={`wl-${ticker}`}
                  isUp={chartUp}
                  showControls={false}
                  initMode="line"
                  initPeriod="m3"
                  market={s.market as Market}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                    color: vC,
                    background: vBg,
                    border: `1px solid ${vBrd}`,
                    padding: '2px 9px',
                    borderRadius: 3,
                  }}
                >
                  {verdictLabel}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: '#4a6890' }}>
                    AI 信心：{s.conf}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFromWatchlist(ticker); }}
                    style={{
                      background: 'none', border: 'none', color: '#2a4060',
                      fontSize: 16, lineHeight: 1, cursor: 'pointer', padding: '0 2px',
                      transition: 'color .15s',
                    }}
                    title="移除自選股"
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#ff4060')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#2a4060')}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
