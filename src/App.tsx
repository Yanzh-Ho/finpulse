import { useState, useMemo, useCallback } from 'react';
import type { ViewId, Stock } from './types';
import type { Market } from './utils/market';
import { priceColor, marketLabel, marketBadgeStyle, isTWMarket } from './utils/market';
import { STOCKS as MOCK_STOCKS } from './data/stocks';
import { API_BASE } from './utils/api';
import { useWatchlist } from './hooks/useWatchlist';
import { useAuth } from './hooks/useAuth';
import { findInUniverse, searchUniverse } from './data/stockUniverse';
import { useMarketData } from './hooks/useMarketData';
import { useStockSearch } from './hooks/useStockSearch';
import type { SearchResult } from './hooks/useStockSearch';
import { LoginView } from './components/Login';
import { ChatPanel } from './components/Chat';
import { AnalysisPanel } from './components/Analysis';
import { PortfolioView } from './components/Portfolio';
import { WatchlistView } from './components/Watchlist';
import { NewsView } from './components/News';
import { SettingsView } from './components/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';

const NAV: { id: ViewId; icon: string; label: string }[] = [
  { id: 'chat', icon: '◈', label: 'AI 分析師' },
  { id: 'portfolio', icon: '▦', label: '投資組合' },
  { id: 'watchlist', icon: '◉', label: '自選股' },
  { id: 'news', icon: '◧', label: '新聞' },
  { id: 'settings', icon: '⊙', label: '設定' },
];

const STATIC_TICKERS = [
  { l: 'S&P 500', v: '+0.84%', up: true },
  { l: 'NASDAQ',  v: '+1.21%', up: true },
  { l: 'VIX',     v: '18.43',  up: false },
];

function buildDynamicStock(data: {
  ticker: string; name: string; fullName?: string;
  market: string; currency: string; sym: string;
  price: number; change: number; pct: number;
  hi52: number; lo52: number; history: Stock['history'];
  limitedData?: boolean;
}): Stock {
  return {
    ticker: data.ticker,
    name: data.name,
    fullName: data.fullName || data.name,
    market: data.market as Market,
    currency: data.currency as 'TWD' | 'USD',
    sym: data.sym,
    price:  data.price,
    change: data.change,
    pct:    data.pct,
    hi52:   data.hi52,
    lo52:   data.lo52,
    history: data.history,
    cap: 'N/A', pe: 'N/A', eps: 'N/A', beta: 'N/A',
    vol: 'N/A', avgVol: 'N/A', div: '—',
    sector: 'N/A',
    verdict: 'HOLD', conf: 50,
    target: { lo: data.lo52 || 0, mid: data.price || 0, hi: data.hi52 || 0 },
    risks: [],
    sentimentScore: 50, sentimentLabel: '中性',
    analysts: { buy: 0, hold: 0, sell: 0 },
    summary: '', tags: [], news: [],
    limitedData: data.limitedData,
  };
}

function buildPlaceholder(ticker: string, name: string, fullName: string, market: Market): Stock {
  const tw = isTWMarket(market);
  return {
    ticker, name, fullName, market,
    currency: tw ? 'TWD' : 'USD',
    sym: tw ? 'NT$' : '$',
    price: 0, change: 0, pct: 0, hi52: 0, lo52: 0,
    history: [],
    cap: 'N/A', pe: 'N/A', eps: 'N/A', beta: 'N/A',
    vol: 'N/A', avgVol: 'N/A', div: '—',
    sector: 'N/A',
    verdict: 'HOLD', conf: 50,
    target: { lo: 0, mid: 0, hi: 0 },
    risks: [],
    sentimentScore: 50, sentimentLabel: '中性',
    analysts: { buy: 0, hold: 0, sell: 0 },
    summary: '', tags: [], news: [],
    limitedData: true,
  };
}

export default function App() {
  const { user, login, register, logout } = useAuth();
  const [view, setView]           = useState<ViewId>('chat');
  const [ticker, setTicker]       = useState<string | null>(null);
  const [searchQ, setSearchQ]     = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [dynamicStocks, setDynamicStocks] = useState<Record<string, Stock>>({});
  const [loadingTicker, setLoadingTicker] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { list: watchlist, has: inWatchlist, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist();

  const { results: marketResults } = useMarketData();
  const { serverResults } = useStockSearch(searchQ);

  // Merge real prices onto mock + dynamic stocks
  const STOCKS = useMemo(() => {
    const merged: Record<string, Stock> = { ...MOCK_STOCKS, ...dynamicStocks };
    for (const [t, real] of Object.entries(marketResults)) {
      if (!merged[t]) continue;
      merged[t] = {
        ...merged[t],
        price:   real.price,
        change:  real.change,
        pct:     real.pct,
        hi52:    real.hi52 || merged[t].hi52,
        lo52:    real.lo52 || merged[t].lo52,
        history: real.history.length > 10 ? real.history : merged[t].history,
      };
    }
    return merged;
  }, [marketResults, dynamicStocks]);

  // Navigate to any stock — shows placeholder immediately, loads real data in background
  const goStockAny = useCallback(async (t: string, hint?: SearchResult) => {
    const upper = t.toUpperCase();
    setSearchQ('');
    setSearchOpen(false);
    setLoadError(null);

    // Already fully loaded — just navigate
    if (STOCKS[upper] && !STOCKS[upper].limitedData) {
      setTicker(upper);
      setView('chat');
      return;
    }

    // Resolve best available name/market for placeholder
    let phName = upper, phFull = upper, phMarket: Market = 'US';
    const universeInfo = findInUniverse(upper);
    if (universeInfo) {
      phName = universeInfo.name;
      phFull = universeInfo.fullName;
      phMarket = universeInfo.market;
    } else if (hint) {
      phName = hint.name;
      phFull = hint.fullName || hint.name;
      phMarket = hint.market;
    } else if (/^\d{4}$/.test(upper)) {
      phMarket = 'TWSE';
    }

    // Show placeholder immediately so UI is never blank
    const placeholder = buildPlaceholder(upper, phName, phFull, phMarket);
    setDynamicStocks(prev => ({ ...prev, [upper]: placeholder }));
    setTicker(upper);
    setView('chat');
    setLoadingTicker(upper);

    // Fetch real data in background
    try {
      const res = await fetch(`${API_BASE}/quote/${encodeURIComponent(upper)}`);
      const data = await res.json();
      setDynamicStocks(prev => ({ ...prev, [upper]: buildDynamicStock(data) }));
    } catch {
      // Keep placeholder silently — limitedData badge shown in Analysis panel
    } finally {
      setLoadingTicker(null);
    }
  }, [STOCKS]);

  // Build combined search results: loaded stocks → universe (instant) → server (debounced)
  const searchResults: SearchResult[] = useMemo(() => {
    const q = searchQ.trim();
    if (!q) return [];
    const ql = q.toLowerCase();

    // 1. Already-loaded stocks — show with live prices
    const loaded: SearchResult[] = Object.values(STOCKS)
      .filter(s =>
        s.ticker.toLowerCase().includes(ql) ||
        s.name.toLowerCase().includes(ql) ||
        (s.fullName && s.fullName.toLowerCase().includes(ql))
      )
      .filter(s => !s.limitedData)
      .slice(0, 4)
      .map(s => ({
        ticker: s.ticker, name: s.name, fullName: s.fullName,
        market: s.market as Market, price: s.price, pct: s.pct,
        sym: s.sym, isLocal: true,
      }));

    const loadedSet = new Set(loaded.map(r => r.ticker));

    // 2. Stock universe — instant, no network, no prices
    const universe: SearchResult[] = searchUniverse(q, 6)
      .filter(s => !loadedSet.has(s.ticker))
      .map(s => ({
        ticker: s.ticker, name: s.name, fullName: s.fullName,
        market: s.market, isLocal: true,
      }));

    const universeSet = new Set(universe.map(r => r.ticker));

    // 3. Server results — dedupe against local
    const remote = serverResults
      .filter(r => !loadedSet.has(r.ticker) && !universeSet.has(r.ticker))
      .slice(0, Math.max(0, 8 - loaded.length - universe.length));

    return [...loaded, ...universe, ...remote];
  }, [searchQ, STOCKS, serverResults]);

  const loadStockSilently = useCallback(async (t: string) => {
    const upper = t.toUpperCase();
    if (STOCKS[upper] && !STOCKS[upper].limitedData) return;
    let phName = upper, phFull = upper, phMarket: Market = 'US';
    const universeInfo = findInUniverse(upper);
    if (universeInfo) { phName = universeInfo.name; phFull = universeInfo.fullName; phMarket = universeInfo.market; }
    else if (/^\d{4,6}$/.test(upper)) phMarket = 'TWSE';
    setDynamicStocks(prev => ({ ...prev, [upper]: buildPlaceholder(upper, phName, phFull, phMarket) }));
    try {
      const res = await fetch(`${API_BASE}/quote/${encodeURIComponent(upper)}`);
      const data = await res.json();
      setDynamicStocks(prev => ({ ...prev, [upper]: buildDynamicStock(data) }));
    } catch {}
  }, [STOCKS]);

  // Load a stock triggered from chat — fetches real data and returns it for immediate analysis
  const loadStockForChat = useCallback(async (t: string): Promise<Stock | null> => {
    const upper = t.toUpperCase();
    setLoadError(null);

    if (STOCKS[upper] && !STOCKS[upper].limitedData) {
      setTicker(upper);
      setView('chat');
      return STOCKS[upper];
    }

    let phName = upper, phFull = upper, phMarket: Market = 'US';
    const universeInfo = findInUniverse(upper);
    if (universeInfo) {
      phName = universeInfo.name; phFull = universeInfo.fullName; phMarket = universeInfo.market;
    } else if (/^\d{4,6}$/.test(upper)) {
      phMarket = 'TWSE';
    }

    const placeholder = buildPlaceholder(upper, phName, phFull, phMarket);
    setDynamicStocks(prev => ({ ...prev, [upper]: placeholder }));
    setTicker(upper);
    setView('chat');
    setLoadingTicker(upper);

    try {
      const res = await fetch(`${API_BASE}/quote/${encodeURIComponent(upper)}`);
      const data = await res.json();
      const built = buildDynamicStock(data);
      setDynamicStocks(prev => ({ ...prev, [upper]: built }));
      return built;
    } catch {
      return placeholder;
    } finally {
      setLoadingTicker(null);
    }
  }, [STOCKS]);

  // Auth guard — placed after all hooks to satisfy React Rules of Hooks
  if (!user) return <LoginView onLogin={login} onRegister={register} />;

  const stock = ticker ? STOCKS[ticker] : null;

  function goStock(t: string) {
    setTicker(t);
    setView('chat');
    setSearchQ('');
    setSearchOpen(false);
    setLoadError(null);
  }

  return (
    <div className="app-root" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <header
        style={{
          height: 52,
          background: '#0c1422',
          borderBottom: '1px solid rgba(79,142,247,.15)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, letterSpacing: '-.02em', flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#4f8ef7,#1e4fd8)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>◈</div>
          FinPulse
        </div>

        {/* Search */}
        <div className="hdr-search" style={{ flex: '0 0 400px', position: 'relative' }}>
          <div
            style={{
              background: '#101e35',
              border: `1px solid ${searchOpen ? 'rgba(79,142,247,.45)' : 'rgba(79,142,247,.15)'}`,
              borderRadius: 7, height: 34, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, transition: 'border-color .2s',
            }}
          >
            <span style={{ fontSize: 15, color: '#4a6890', flexShrink: 0 }}>⌕</span>
            <input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 160)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSearchQ(''); setSearchOpen(false); }
                if (e.key === 'Enter') {
                  const q = searchQ.trim();
                  if (searchResults.length > 0) {
                    goStockAny(searchResults[0].ticker, searchResults[0]);
                  } else if (/^\d{4}$/.test(q)) {
                    goStockAny(q);
                  }
                }
              }}
              placeholder="搜尋股票代號"
              style={{ background: 'none', border: 'none', outline: 'none', color: '#ccd8f5', fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, width: '100%' }}
            />
            {searchQ && (
              <span onClick={() => { setSearchQ(''); }} style={{ color: '#4a6890', cursor: 'pointer', flexShrink: 0, fontSize: 16, lineHeight: 1 }}>×</span>
            )}
          </div>

          {/* Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: '#0d1929', border: '1px solid rgba(79,142,247,.28)', borderRadius: 10, zIndex: 200, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.6)' }}>
              {searchResults.map((r, idx) => {
                const market = r.market as Market;
                const badge  = marketBadgeStyle(market);
                const label  = marketLabel(market);
                const isUp   = (r.pct ?? 0) >= 0;
                const pctC   = r.pct !== undefined ? priceColor(r.pct, market) : '#4a6890';
                const isLoading = loadingTicker === r.ticker;
                const hasPrice  = r.price !== undefined && r.price > 0;
                return (
                  <div
                    key={r.ticker}
                    onMouseDown={(e) => { e.preventDefault(); goStockAny(r.ticker, r); }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', cursor: 'pointer', borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(79,142,247,.08)' : 'none', transition: 'background .12s' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,.07)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: '#e0e8ff' }}>{r.ticker}</span>
                          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 600, ...badge }}>{label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#5a7aaa', marginTop: 2 }}>{r.name}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 72 }}>
                      {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                          <div style={{ width: 10, height: 10, border: '1.5px solid rgba(79,142,247,.2)', borderTop: '1.5px solid #4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          <span style={{ fontSize: 10, color: '#4a6890' }}>載入中</span>
                        </div>
                      ) : hasPrice ? (
                        <>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#e0e8ff' }}>
                            {r.sym}{r.price!.toLocaleString()}
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: pctC }}>
                            {isUp ? '+' : ''}{r.pct?.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 10, color: '#2a4a6a', letterSpacing: '.02em' }}>點選載入 →</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {searchOpen && searchQ.trim().length > 0 && searchResults.length === 0 && (
            <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: '#0c1422', border: '1px solid rgba(79,142,247,.2)', borderRadius: 8, zIndex: 200, padding: '14px 16px', fontSize: 12, color: '#4a6890', boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
              找不到「{searchQ}」— 請嘗試按 Enter 直接查詢
            </div>
          )}

          {/* Load error */}
          {loadError && (
            <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: '#0c1422', border: '1px solid rgba(255,64,96,.3)', borderRadius: 8, zIndex: 200, padding: '12px 16px', fontSize: 12, color: '#ff4060', boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
              ⚠ {loadError}
            </div>
          )}
        </div>

        {/* Market tickers */}
        <div className="hdr-mkts" style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {(() => {
            const twii = marketResults['TWII'];
            const twiiTicker = twii
              ? { l: '台股大盤', v: `${twii.pct >= 0 ? '+' : ''}${twii.pct.toFixed(2)}%`, up: twii.pct >= 0 }
              : { l: '台股大盤', v: '—', up: true };
            return [...STATIC_TICKERS, twiiTicker].map((m) => (
              <div key={m.l} style={{ display: 'flex', gap: 6, padding: '4px 10px', background: '#101e35', border: '1px solid rgba(79,142,247,.15)', borderRadius: 5, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: '#4a6890' }}>{m.l}</span>
                <span style={{ color: m.up ? '#00d98b' : '#ff4060' }}>{m.v}</span>
              </div>
            ));
          })()}
        </div>

        {/* Avatar */}
        <div
          onClick={() => setView('settings')}
          title={user.email}
          style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#4f8ef7,#00d98b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#070b14', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
        >
          {user.name.charAt(0)}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside className="sidebar" style={{ width: 210, flexShrink: 0, background: '#0c1422', borderRight: '1px solid rgba(79,142,247,.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <nav style={{ padding: '10px 0' }}>
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', border: 'none', background: view === n.id ? 'rgba(79,142,247,.1)' : 'none', color: view === n.id ? '#4f8ef7' : '#4a6890', fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'color .15s, background .15s', borderLeft: `2px solid ${view === n.id ? '#4f8ef7' : 'transparent'}` }}
                onMouseEnter={(e) => { if (view !== n.id) { (e.currentTarget as HTMLButtonElement).style.color = '#ccd8f5'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.04)'; } }}
                onMouseLeave={(e) => { if (view !== n.id) { (e.currentTarget as HTMLButtonElement).style.color = '#4a6890'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; } }}
              >
                <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>

          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#1e3050', padding: '14px 16px 7px' }}>
            Watchlist
          </div>

          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(79,142,247,.2) transparent', paddingBottom: 8 }}>
            {watchlist.map((t) => {
              const s = STOCKS[t];
              if (!s) return null;
              const market = s.market as Market;
              const isTW   = isTWMarket(market);
              const isUp   = s.pct >= 0;
              const pctC   = priceColor(s.pct, market);
              const badge  = marketBadgeStyle(market);
              const active = ticker === t;
              return (
                <div
                  key={t}
                  onClick={() => goStock(t)}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px 7px 16px', background: active ? 'rgba(79,142,247,.07)' : 'none', borderLeft: `2px solid ${active ? '#4f8ef7' : 'transparent'}`, cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.025)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'none'; }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 12 }}>{t}</div>
                      <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 2, fontWeight: 600, ...badge }}>
                        {isTW ? '台' : 'US'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#4a6890', marginTop: 1 }}>{s.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{s.sym}{s.price.toLocaleString()}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: pctC }}>
                      {isUp ? '+' : ''}{s.pct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logout */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(79,142,247,.1)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#2a4a6a', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            <button
              onClick={logout}
              style={{ width: '100%', padding: '6px 10px', background: 'none', border: '1px solid rgba(79,142,247,.12)', borderRadius: 6, color: '#4a6890', fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, cursor: 'pointer', textAlign: 'left', transition: 'color .15s, border-color .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff6080'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,64,96,.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4a6890'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(79,142,247,.12)'; }}
            >
              ↩ 登出
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>

          {/* Subtle loading bar — shown while background fetch is in progress */}
          {loadingTicker && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #4f8ef7, #00d98b, #4f8ef7)', backgroundSize: '200% 100%', animation: 'pulse 1.2s ease-in-out infinite', zIndex: 50 }} />
          )}

          {view === 'chat' && (
            <>
              <div className="chat-split" style={{ width: 440, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ErrorBoundary>
                  <ChatPanel stocks={STOCKS} onStockSelect={goStock} onStockLoad={loadStockForChat} selectedTicker={ticker} />
                </ErrorBoundary>
              </div>
              <div className="analysis-split" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <ErrorBoundary>
                  <AnalysisPanel
                    stock={stock}
                    onQuickSelect={goStock}
                    inWatchlist={ticker ? inWatchlist(ticker) : false}
                    onAddWatchlist={() => ticker && addToWatchlist(ticker)}
                    onRemoveWatchlist={() => ticker && removeFromWatchlist(ticker)}
                  />
                </ErrorBoundary>
              </div>
            </>
          )}
          {view === 'portfolio' && (
            <ErrorBoundary><PortfolioView stocks={STOCKS} onSelectStock={goStockAny} onLoadStock={loadStockSilently} /></ErrorBoundary>
          )}
          {view === 'watchlist' && (
            <ErrorBoundary><WatchlistView stocks={STOCKS} onSelectStock={goStock} watchlist={watchlist} onRemoveFromWatchlist={removeFromWatchlist} /></ErrorBoundary>
          )}
          {view === 'news' && (
            <ErrorBoundary><NewsView stock={stock} /></ErrorBoundary>
          )}
          {view === 'settings' && <SettingsView user={user} onLogout={logout} />}
        </main>
      </div>

      {/* ── MOBILE NAV ── */}
      <nav
        className="mob-nav"
        style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0c1422', borderTop: '1px solid rgba(79,142,247,.15)', height: 60, justifyContent: 'space-around', alignItems: 'center', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.slice(0, 4).map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: view === n.id ? '#4f8ef7' : '#4a6890', fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, cursor: 'pointer', padding: '4px 10px' }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
