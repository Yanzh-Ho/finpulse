import { useMemo, useState, useEffect } from 'react';
import type { Stock, NewsItem } from '../types';
import type { Market } from '../utils/market';
import { priceColor, marketLabel, marketBadgeStyle, isTWMarket } from '../utils/market';
import { runAnalysis } from '../utils/analysis';
import { useFundamentals } from '../hooks/useFundamentals';
import { useNews } from '../hooks/useNews';
import { ChartSVG } from './Chart';

interface Props {
  stock: Stock | null;
  onQuickSelect?: (ticker: string) => void;
  inWatchlist?: boolean;
  onAddWatchlist?: () => void;
  onRemoveWatchlist?: () => void;
}

const card: React.CSSProperties = {
  background: '#101e35',
  border: '1px solid rgba(79,142,247,.13)',
  borderRadius: 10,
  padding: '16px 18px',
  marginBottom: 14,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: '#3a5878',
  marginBottom: 13,
};

function NewsModalInline({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(7,11,20,.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0f1b2e', border: '1px solid rgba(79,142,247,.25)',
          borderRadius: 12, padding: '28px 30px', maxWidth: 560, width: '100%',
          position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,.7)',
        }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#4a6890', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
        >
          ×
        </button>
        <div style={{ marginBottom: 14 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
            color: item.sent === 'bullish' ? '#00d98b' : item.sent === 'bearish' ? '#ff4060' : '#ffd666',
            background: item.sent === 'bullish' ? 'rgba(0,217,139,.1)' : item.sent === 'bearish' ? 'rgba(255,64,96,.1)' : 'rgba(255,214,102,.1)',
            border: `1px solid ${item.sent === 'bullish' ? '#00d98b' : item.sent === 'bearish' ? '#ff4060' : '#ffd666'}40`,
          }}>
            {item.sent === 'bullish' ? '看多' : item.sent === 'bearish' ? '看空' : '中性'}
          </span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#ccd8f5', lineHeight: 1.55, marginBottom: 16 }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#4a6890', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ color: '#4f8ef7', fontWeight: 500 }}>{item.src}</span>
          <span style={{ color: '#1e3050' }}>·</span>
          <span>{item.time}</span>
        </div>
        <div style={{ background: 'rgba(79,142,247,.05)', border: '1px solid rgba(79,142,247,.1)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#4a6890', lineHeight: 1.7, marginBottom: 20 }}>
          完整文章內容需至原始來源查看。
        </div>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.3)', color: '#4f8ef7', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            ↗ 開啟原始文章
          </a>
        ) : (
          <div style={{ fontSize: 12, color: '#2a4060' }}>暫無原始連結</div>
        )}
      </div>
    </div>
  );
}

function sentColor(s: string) {
  return s === 'bullish' ? '#00d98b' : s === 'bearish' ? '#ff4060' : '#ffd666';
}
function sentBg(s: string) {
  return s === 'bullish' ? 'rgba(0,217,139,.12)' : s === 'bearish' ? 'rgba(255,64,96,.12)' : 'rgba(255,214,102,.12)';
}
function sentLabel(s: string) {
  return s === 'bullish' ? '看多' : s === 'bearish' ? '看空' : '中性';
}

function MetricRow({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(79,142,247,.1)', fontSize: 12 }}>
      <span style={{ color: '#4a6890' }}>{label}</span>
      {loading ? (
        <span style={{ color: '#2a4060', fontStyle: 'italic', fontSize: 11 }}>載入中…</span>
      ) : (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: value === 'N/A' || value === '—' ? '#2a4060' : '#ccd8f5' }}>{value}</span>
      )}
    </div>
  );
}

export function AnalysisPanel({ stock, onQuickSelect, inWatchlist, onAddWatchlist, onRemoveWatchlist }: Props) {
  const { data: fundamentals, loading: fundamentalsLoading } = useFundamentals(stock?.ticker ?? null);
  const { news: realNews } = useNews(stock?.ticker ?? null);
  const [newsModal, setNewsModal] = useState<NewsItem | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const analysis = useMemo(() => {
    if (!stock) return null;
    try { return runAnalysis(stock); } catch { return null; }
  }, [stock]);

  // News-based sentiment — computed from real news only, no fake scores
  const sentimentInfo = useMemo(() => {
    if (realNews.length === 0) return null;
    const bull = realNews.filter(n => n.sent === 'bullish').length;
    const bear = realNews.filter(n => n.sent === 'bearish').length;
    const score = Math.round(50 + ((bull - bear) / realNews.length) * 35);
    const label = score >= 62 ? '偏多' : score <= 38 ? '偏空' : '中性';
    const color = score >= 62 ? '#00d98b' : score <= 38 ? '#ff4060' : '#ffd666';
    return { score, label, color };
  }, [realNews]);

  if (!stock) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6890', textAlign: 'center', padding: 48 }}>
        <div>
          <div style={{ fontSize: 44, marginBottom: 18, opacity: 0.1, lineHeight: 1 }}>◎</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#8aa0c0' }}>
            尚未選擇股票
          </div>
          <div style={{ fontSize: 12, color: '#3a5878', lineHeight: 1.7, maxWidth: 240, marginBottom: 24 }}>
            向 AI 分析師詢問，或從自選股中選擇
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {['TSM', 'NVDA', 'TSLA', 'AAPL', '2330'].map((t) => (
              <button
                key={t}
                onClick={() => onQuickSelect?.(t)}
                style={{
                  padding: '5px 14px', border: '1px solid rgba(79,142,247,.18)', borderRadius: 5,
                  background: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: '#3a5878', cursor: 'pointer', transition: 'all .15s',
                }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = 'rgba(79,142,247,.4)'; el.style.color = '#4f8ef7'; }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = 'rgba(79,142,247,.18)'; el.style.color = '#3a5878'; }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const market = stock.market as Market;
  const isTW   = isTWMarket(market);
  const sym    = stock.sym;
  const isUp   = stock.pct >= 0;
  const pctC   = priceColor(stock.pct, market);
  const badge  = marketBadgeStyle(market);
  const label  = marketLabel(market);

  const verdict = analysis?.verdict ?? 'HOLD';
  const conf    = analysis?.conf    ?? 50;
  const signals = analysis?.signals ?? [];

  const vC   = verdict === 'BUY' ? '#00d98b' : verdict === 'SELL' ? '#ff4060' : '#ffd666';
  const vBg  = verdict === 'BUY' ? 'rgba(0,217,139,.12)' : verdict === 'SELL' ? 'rgba(255,64,96,.12)' : 'rgba(255,214,102,.12)';
  const vBrd = verdict === 'BUY' ? 'rgba(0,217,139,.3)'  : verdict === 'SELL' ? 'rgba(255,64,96,.3)'  : 'rgba(255,214,102,.3)';
  const verdictLabel = verdict === 'BUY' ? '買進' : verdict === 'SELL' ? '賣出' : '持有';

  // Real fundamentals — no fallback to fake stock data
  const pe            = fundamentals?.pe            ?? 'N/A';
  const eps           = fundamentals?.eps           ?? 'N/A';
  const cap           = fundamentals?.cap           ?? 'N/A';
  const beta          = fundamentals?.beta          ?? 'N/A';
  const div           = fundamentals?.div           ?? '—';
  const profitMargin  = fundamentals?.profitMargin  ?? 'N/A';
  const revenueGrowth = fundamentals?.revenueGrowth ?? 'N/A';
  const vol           = fundamentals?.vol           ?? stock.vol;    // vol also in chart data
  const avgVol        = fundamentals?.avgVol        ?? stock.avgVol;
  const displaySummary = fundamentals?.summary || '';
  const limitedData   = stock.limitedData || fundamentals?.limitedData || false;

  // Real analysts — no fake defaults
  const analysts = fundamentals?.analysts ?? { buy: 0, hold: 0, sell: 0 };
  const analystTotal = analysts.buy + analysts.hold + analysts.sell;

  // Real target prices — only show when meaningfully different from current price
  const target = fundamentals?.target ?? { lo: 0, mid: 0, hi: 0 };
  const hasTarget =
    target.mid > 0 &&
    stock.price > 0 &&
    Math.abs(target.mid - stock.price) / stock.price > 0.02;
  const tgtPct = hasTarget && target.hi > target.lo
    ? Math.min(100, Math.max(0, ((stock.price - target.lo) / (target.hi - target.lo)) * 100))
    : 50;
  const upside = hasTarget ? (((target.mid - stock.price) / stock.price) * 100).toFixed(1) : null;

  const metrics: [string, string][] = [
    ['市值',           cap],
    ['本益比 (TTM)',   pe],
    ['每股盈餘 (TTM)', eps],
    ['Beta 值',        beta],
    ['殖利率',         div],
    ['毛利率',         profitMargin],
    ['營收成長',       revenueGrowth],
    ['成交量',         vol],
    ['均量 (3M)',       avgVol],
    ['52週高點',       stock.hi52 > 0 ? `${sym}${stock.hi52.toLocaleString()}` : 'N/A'],
    ['52週低點',       stock.lo52 > 0 ? `${sym}${stock.lo52.toLocaleString()}` : 'N/A'],
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '22px 24px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(79,142,247,.2) transparent',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, letterSpacing: '.04em' }}>
            {stock.ticker}
          </div>
          <div style={{ fontSize: 12, color: '#4a6890', margin: '3px 0 6px' }}>
            {stock.fullName} · {stock.sector !== 'N/A' ? stock.sector : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 600, ...badge }}>
              {isTW ? '🇹🇼' : '🇺🇸'} {label}
            </span>
            {limitedData && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: 'rgba(255,136,0,.1)', border: '1px solid rgba(255,136,0,.25)', color: '#ff9900' }}>
                ⚠ 部分資料受限
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {stock.price > 0 ? (
            <>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700 }}>
                {sym}{stock.price.toLocaleString()}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: pctC, marginTop: 3 }}>
                {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.pct.toFixed(2)}%)
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#4a6890', animation: 'pulse 1.5s ease-in-out infinite' }}>
              正在取得報價…
            </div>
          )}
          <div style={{ marginTop: 9, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                color: vC, background: vBg, border: `1px solid ${vBrd}`,
                padding: '4px 10px', borderRadius: 4, letterSpacing: '.06em',
              }}
            >
              ● {stock.history.length >= 20 ? verdictLabel : '計算中'}
            </span>
            {inWatchlist ? (
              <button
                onClick={() => { onRemoveWatchlist?.(); setToast('已移除自選股'); }}
                style={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#4f8ef7', background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.35)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,142,247,.22)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,142,247,.12)')}
              >
                ★ 已加入自選股
              </button>
            ) : (
              <button
                onClick={() => { onAddWatchlist?.(); setToast('已加入自選股'); }}
                style={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#4a6890', background: 'none', border: '1px solid rgba(79,142,247,.2)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#4f8ef7'; b.style.borderColor = 'rgba(79,142,247,.4)'; }}
                onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#4a6890'; b.style.borderColor = 'rgba(79,142,247,.2)'; }}
              >
                ☆ 加入自選股
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ ...card, padding: '12px 12px 8px' }}>
        {stock.history.length >= 2 ? (
          <ChartSVG
            history={stock.history}
            W={720}
            H={185}
            accent="#4f8ef7"
            gradId={`ap-${stock.ticker}`}
            isUp={isTW ? !isUp : isUp}
            initMode="candle"
            initPeriod="m3"
            market={market}
          />
        ) : (
          <div style={{ height: 185, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: 12 }}>
            圖表資料載入中…
          </div>
        )}
      </div>

      {/* Technical Analysis */}
      <div style={card}>
        <div style={sectionTitle}>技術分析</div>

        {stock.history.length >= 20 ? (
          <>
            <div style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: '#4a6890' }}>
                <span>信心指數</span>
                <span style={{ color: vC, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{conf}%</span>
              </div>
              <div style={{ height: 4, background: '#1e3050', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${conf}%`, background: `linear-gradient(90deg,#4f8ef780,${vC})`, borderRadius: 2, transition: 'width .6s ease' }} />
              </div>
            </div>

            {signals.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {signals.map((sig, i) => (
                  <div key={i} style={{ display: 'flex', gap: 7, fontSize: 11, color: '#4a6890', marginBottom: 5, alignItems: 'flex-start' }}>
                    <span style={{ color: '#4f8ef7', flexShrink: 0, marginTop: 1 }}>▸</span>
                    {sig}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#2a4060', marginBottom: 12, padding: '8px 10px', background: 'rgba(79,142,247,.04)', borderRadius: 6 }}>
            歷史K線資料不足，技術指標計算中…
          </div>
        )}

        {displaySummary && (
          <p style={{ fontSize: 12, color: '#4a6890', lineHeight: 1.72, margin: '0 0 10px' }}>
            {displaySummary.slice(0, 280)}{displaySummary.length > 280 ? '…' : ''}
          </p>
        )}

        {/* Real analyst target price — only shown when real data available */}
        {upside !== null && hasTarget && (
          <>
            <div style={{ fontSize: 11, color: '#4a6890', marginBottom: 7 }}>分析師共識目標價</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{sym}{target.lo.toLocaleString()}</span>
              <div style={{ flex: 1, height: 3, background: '#1e3050', borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, height: '100%', width: `${tgtPct}%`, background: vC, borderRadius: 2 }} />
                <div style={{ position: 'absolute', left: `${tgtPct}%`, top: -4, width: 11, height: 11, borderRadius: '50%', background: vC, border: '2px solid #070b14', transform: 'translateX(-50%)' }} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{sym}{target.hi.toLocaleString()}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#4a6890' }}>
              共識目標{' '}
              <span style={{ color: vC, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{sym}{target.mid.toLocaleString()}</span>
              <span style={{ color: vC, marginLeft: 6 }}>{+upside > 0 ? '+' : ''}{upside}% 空間</span>
            </div>
          </>
        )}

        <p style={{ fontSize: 10, color: '#2a4060', lineHeight: 1.5, margin: '12px 0 0', borderTop: '1px solid rgba(79,142,247,.08)', paddingTop: 10 }}>
          ⚠️ 本分析僅供參考，不構成投資建議。投資有風險，請自行評估風險承受能力。
        </p>
      </div>

      {/* Metrics + Analysts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={sectionTitle}>關鍵指標</div>
          {metrics.map(([lbl, val]) => (
            <MetricRow key={lbl} label={lbl} value={val} loading={fundamentalsLoading && !fundamentals && val === 'N/A'} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Real analyst consensus */}
          {analystTotal > 0 ? (
            <div style={{ ...card, marginBottom: 0 }}>
              <div style={sectionTitle}>分析師建議（{analystTotal} 位）</div>
              <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
                <div style={{ flex: analysts.buy,  background: '#00d98b' }} />
                <div style={{ flex: analysts.hold, background: '#ffd666' }} />
                <div style={{ flex: analysts.sell, background: '#ff4060' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 12, marginBottom: sentimentInfo ? 10 : 0 }}>
                <span style={{ color: '#00d98b' }}>● 買進 {analysts.buy}</span>
                <span style={{ color: '#ffd666' }}>● 持有 {analysts.hold}</span>
                <span style={{ color: '#ff4060' }}>● 賣出 {analysts.sell}</span>
              </div>
              {sentimentInfo && (
                <div style={{ fontSize: 11, color: '#4a6890' }}>
                  新聞情緒：
                  <span style={{ color: sentimentInfo.color }}>
                    {sentimentInfo.label} {sentimentInfo.score}%
                  </span>
                  <span style={{ color: '#2a4060', marginLeft: 5 }}>({realNews.length} 則)</span>
                </div>
              )}
            </div>
          ) : fundamentalsLoading ? (
            <div style={{ ...card, marginBottom: 0 }}>
              <div style={sectionTitle}>分析師建議</div>
              <div style={{ fontSize: 12, color: '#2a4060', fontStyle: 'italic' }}>載入中…</div>
            </div>
          ) : (
            <div style={{ ...card, marginBottom: 0 }}>
              <div style={sectionTitle}>分析師建議</div>
              <div style={{ fontSize: 12, color: '#2a4060' }}>資料尚未取得</div>
              {sentimentInfo && (
                <div style={{ fontSize: 11, color: '#4a6890', marginTop: 8 }}>
                  新聞情緒：
                  <span style={{ color: sentimentInfo.color }}>
                    {sentimentInfo.label} {sentimentInfo.score}%
                  </span>
                  <span style={{ color: '#2a4060', marginLeft: 5 }}>({realNews.length} 則)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* News — real only, no fake fallback */}
      <div style={card}>
        <div style={{ ...sectionTitle as React.CSSProperties, marginBottom: realNews.length > 0 ? 13 : 0 }}>相關新聞</div>
        {realNews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {realNews.slice(0, 5).map((n, i) => (
              <div
                key={i}
                onClick={() => setNewsModal(n)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                  padding: '9px 10px', borderRadius: 7, cursor: 'pointer', transition: 'background .12s',
                  borderBottom: i < Math.min(realNews.length, 5) - 1 ? '1px solid rgba(79,142,247,.07)' : 'none',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,.06)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#ccd8f5', lineHeight: 1.5, marginBottom: 3 }}>{n.title}</div>
                  <div style={{ fontSize: 10, color: '#4a6890', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ color: '#4f8ef7' }}>{n.src}</span>
                    <span style={{ color: '#1e3050' }}>·</span>
                    <span>{n.time}</span>
                    {n.url && <span style={{ color: '#2a4a6a' }}>· 點擊查看</span>}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: sentColor(n.sent), background: sentBg(n.sent), border: `1px solid ${sentColor(n.sent)}40`, padding: '2px 7px', borderRadius: 3, flexShrink: 0, letterSpacing: '.02em' }}>
                  {sentLabel(n.sent)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#2a4060', padding: '4px 0' }}>
            暫無相關新聞資料
          </div>
        )}
      </div>

      {newsModal && <NewsModalInline item={newsModal} onClose={() => setNewsModal(null)} />}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#0f1b2e', border: '1px solid rgba(79,142,247,.35)',
          borderRadius: 8, padding: '10px 20px',
          fontSize: 13, fontWeight: 600, color: '#ccd8f5',
          boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 500,
          animation: 'fadeIn .2s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
