import { useState, useEffect, useRef } from 'react';
import type { Stock, PortfolioHolding } from '../types';
import type { Market } from '../utils/market';
import { priceColor, isTWMarket } from '../utils/market';
import { usePortfolio } from '../hooks/usePortfolio';
import { ChartSVG } from './Chart';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Props {
  stocks: Record<string, Stock>;
  onSelectStock: (ticker: string) => void;
  onLoadStock: (ticker: string) => Promise<void>;
}

type ModalState = { type: 'add' } | { type: 'edit'; holding: PortfolioHolding } | null;

interface FormState {
  ticker: string;
  shares: string;
  avgCost: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number, d = 0) {
  return n.toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function verdictLabel(v?: string) {
  return v === 'BUY' ? '買進' : v === 'SELL' ? '賣出' : '持有';
}
function verdictColor(v?: string) {
  return v === 'BUY' ? '#00d98b' : v === 'SELL' ? '#ff4060' : '#ffd666';
}
function verdictBg(v?: string) {
  return v === 'BUY' ? 'rgba(0,217,139,.12)' : v === 'SELL' ? 'rgba(255,64,96,.12)' : 'rgba(255,214,102,.12)';
}
function verdictBorder(v?: string) {
  return v === 'BUY' ? 'rgba(0,217,139,.3)' : v === 'SELL' ? 'rgba(255,64,96,.3)' : 'rgba(255,214,102,.3)';
}

// ─── Add / Edit modal ──────────────────────────────────────────────────────

function HoldingModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: PortfolioHolding;
  onSave: (h: PortfolioHolding) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    ticker:  initial?.ticker  ?? '',
    shares:  initial ? String(initial.shares)  : '',
    avgCost: initial ? String(initial.avgCost) : '',
  });
  const [err, setErr] = useState('');
  const isEdit = !!initial;

  function set(k: keyof FormState, v: string) { setForm((f) => ({ ...f, [k]: v })); setErr(''); }

  function handleSave() {
    const ticker  = form.ticker.trim().toUpperCase();
    const shares  = parseFloat(form.shares);
    const avgCost = parseFloat(form.avgCost);
    if (!ticker)           return setErr('請輸入股票代碼');
    if (isNaN(shares) || shares <= 0)   return setErr('持股數量必須大於 0');
    if (isNaN(avgCost) || avgCost <= 0) return setErr('平均成本必須大於 0');
    onSave({ ticker, shares, avgCost });
    onClose();
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: '#101e35',
    border: '1px solid rgba(79,142,247,.18)',
    borderRadius: 7,
    padding: '10px 13px',
    color: '#ccd8f5',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#4a6890',
    fontWeight: 600,
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(7,11,20,.85)',
        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0d1929',
          border: '1px solid rgba(79,142,247,.25)',
          borderRadius: 14,
          padding: '28px 24px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 24px 80px rgba(0,0,0,.7)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>
          {isEdit ? '編輯持股' : '新增持股'}
        </div>

        {/* Ticker */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>股票代碼</label>
          <input
            value={form.ticker}
            onChange={(e) => set('ticker', e.target.value)}
            disabled={isEdit}
            placeholder="如 NVDA、2330、AMD"
            style={{ ...fieldStyle, opacity: isEdit ? 0.6 : 1 }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(79,142,247,.5)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(79,142,247,.18)')}
          />
        </div>

        {/* Shares */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>持股數量（股）</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.shares}
            onChange={(e) => set('shares', e.target.value)}
            placeholder="如 100"
            style={fieldStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(79,142,247,.5)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(79,142,247,.18)')}
          />
        </div>

        {/* Avg cost */}
        <div style={{ marginBottom: err ? 12 : 24 }}>
          <label style={labelStyle}>平均成本（每股）</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.avgCost}
            onChange={(e) => set('avgCost', e.target.value)}
            placeholder="如 148.50"
            style={fieldStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(79,142,247,.5)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(79,142,247,.18)')}
          />
        </div>

        {err && (
          <div style={{ fontSize: 12, color: '#ff4060', marginBottom: 16 }}>⚠ {err}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid rgba(79,142,247,.2)',
              background: 'none', color: '#4a6890', fontSize: 14, cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 8, border: 'none',
              background: 'linear-gradient(90deg,#4f8ef7,#2970e0)', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isEdit ? '儲存變更' : '新增持股'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '60px 20px', gap: 16 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>▦</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: '#ccd8f5' }}>尚未新增持股</div>
      <div style={{ fontSize: 13, color: '#4a6890', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
        追蹤您的持倉成本與損益，AI 即時提供操作建議。
      </div>
      <button
        onClick={onAdd}
        style={{
          marginTop: 8, padding: '12px 28px', borderRadius: 10,
          border: 'none', background: 'linear-gradient(90deg,#4f8ef7,#2970e0)',
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        + 新增第一筆持股
      </button>
    </div>
  );
}

// ─── Mobile holding card ───────────────────────────────────────────────────

function MobileCard({
  h,
  onEdit,
  onRemove,
  onSelect,
}: {
  h: ReturnType<typeof buildRow>;
  onEdit: () => void;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const pctC   = priceColor(h.pct, h.market as Market);
  const gainC  = priceColor(h.gainPct, h.market as Market);

  return (
    <div
      style={{
        background: '#101e35',
        border: '1px solid rgba(79,142,247,.15)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        onClick={onSelect}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 16px 10px', cursor: 'pointer' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15 }}>
              {h.ticker}
            </span>
            {h.verdict && (
              <span style={{ fontSize: 10, fontWeight: 700, color: verdictColor(h.verdict), background: verdictBg(h.verdict), border: `1px solid ${verdictBorder(h.verdict)}`, padding: '1px 7px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                {verdictLabel(h.verdict)}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#4a6890' }}>{h.name || '—'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 15 }}>
            {h.price > 0 ? `${h.sym}${fmt(h.price, h.sym === '$' ? 2 : 0)}` : '—'}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: pctC, marginTop: 2 }}>
            {h.pct >= 0 ? '+' : ''}{h.pct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(79,142,247,.06)', borderTop: '1px solid rgba(79,142,247,.08)', borderBottom: '1px solid rgba(79,142,247,.08)' }}>
        {[
          { label: '持股', value: `${fmt(h.shares)} 股` },
          { label: '均價', value: h.price > 0 ? `${h.sym}${fmt(h.avgCost, h.sym === '$' ? 2 : 1)}` : '—' },
          { label: '市值', value: h.price > 0 ? `${h.sym}${fmt(h.val, 0)}` : '—' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: '#101e35', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#4a6890', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{stat.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* P&L row */}
      <div style={{ padding: '11px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 10, color: '#4a6890', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 6 }}>未實現損益</span>
          {h.price > 0 ? (
            <>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: gainC }}>
                {h.gainPct >= 0 ? '+' : ''}{h.gainPct.toFixed(1)}%
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: gainC, marginLeft: 6 }}>
                ({h.gain >= 0 ? '+' : ''}{h.sym}{fmt(Math.abs(h.gain), 0)})
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#2a4060' }}>載入中…</span>
          )}
        </div>
        {h.conf && h.price > 0 && (
          <span style={{ fontSize: 11, color: '#4a6890' }}>AI {h.conf}%</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 14px', justifyContent: 'flex-end' }}>
        <button
          onClick={onEdit}
          style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid rgba(79,142,247,.25)', background: 'none', color: '#4f8ef7', fontSize: 12, cursor: 'pointer' }}
        >
          編輯
        </button>
        <button
          onClick={onRemove}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,64,96,.2)', background: 'none', color: '#ff4060', fontSize: 12, cursor: 'pointer' }}
        >
          刪除
        </button>
      </div>
    </div>
  );
}

// ─── Row computation ───────────────────────────────────────────────────────

function buildRow(h: PortfolioHolding, stocks: Record<string, Stock>) {
  const s      = stocks[h.ticker];
  const sym    = s?.sym    ?? (h.ticker.match(/^\d/) ? 'NT$' : '$');
  const price  = s?.price  ?? 0;
  const pct    = s?.pct    ?? 0;
  const market = s?.market ?? (h.ticker.match(/^\d/) ? 'TWSE' : 'US');
  const val    = price * h.shares;
  const cost   = h.avgCost * h.shares;
  const gain   = val - cost;
  const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
  return {
    ...h,
    name:    s?.name    ?? '',
    sym, price, pct, market, val, cost, gain, gainPct,
    verdict: s?.verdict,
    conf:    s?.conf,
    history: s?.history ?? [],
    loading: !s || s.limitedData,
  };
}

// ─── Main component ────────────────────────────────────────────────────────

export function PortfolioView({ stocks, onSelectStock, onLoadStock }: Props) {
  const { holdings, addHolding, updateHolding, removeHolding } = usePortfolio();
  const [modal, setModal] = useState<ModalState>(null);
  const loadedRef = useRef<Set<string>>(new Set());

  // Pre-load prices for all holdings when the ticker list changes
  useEffect(() => {
    holdings.forEach((h) => {
      const upper = h.ticker.toUpperCase();
      if (!loadedRef.current.has(upper)) {
        loadedRef.current.add(upper);
        onLoadStock(upper).catch(() => {});
      }
    });
  }, [holdings.map((h) => h.ticker).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = holdings.map((h) => buildRow(h, stocks));

  const totalVal      = rows.reduce((a, r) => a + r.val, 0);
  const totalCost     = rows.reduce((a, r) => a + r.cost, 0);
  const totalGain     = totalVal - totalCost;
  const totalGainPct  = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const todayTotal    = rows.reduce((a, r) => a + (stocks[r.ticker]?.change ?? 0) * r.shares, 0);
  const hasAnyPrice   = rows.some((r) => r.price > 0);

  const summaryItems = [
    {
      label: '持倉市值',
      value: hasAnyPrice ? `$${fmt(totalVal, 0)}` : '—',
      sub: `${holdings.length} 檔持股`,
    },
    {
      label: '總損益',
      value: hasAnyPrice ? `${totalGain >= 0 ? '+' : ''}$${fmt(Math.abs(totalGain), 0)}` : '—',
      sub: hasAnyPrice ? `${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}%` : '—',
      color: hasAnyPrice ? (totalGain >= 0 ? '#00d98b' : '#ff4060') : '#4a6890',
    },
    {
      label: '今日損益',
      value: hasAnyPrice ? `${todayTotal >= 0 ? '+' : ''}$${fmt(Math.abs(todayTotal), 0)}` : '—',
      sub: hasAnyPrice && totalVal > 0 ? `${((todayTotal / totalVal) * 100).toFixed(2)}%` : '—',
      color: hasAnyPrice ? (todayTotal >= 0 ? '#00d98b' : '#ff4060') : '#4a6890',
    },
    { label: '持股數', value: `${holdings.length}`, sub: '個股' },
  ];

  const cardBase: React.CSSProperties = {
    background: '#101e35',
    border: '1px solid rgba(79,142,247,.15)',
    borderRadius: 9,
    padding: '14px 16px',
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(79,142,247,.2) transparent' }}>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>投資組合</div>
          <div style={{ fontSize: 13, color: '#4a6890' }}>
            {holdings.length > 0 ? `${holdings.length} 檔持股 · 即時市場資料` : '自行管理持倉 · 即時損益追蹤'}
          </div>
        </div>
        <button
          onClick={() => setModal({ type: 'add' })}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(90deg,#4f8ef7,#2970e0)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          + 新增持股
        </button>
      </div>

      {holdings.length === 0 ? (
        <EmptyState onAdd={() => setModal({ type: 'add' })} />
      ) : (
        <>
          {/* Summary cards — 2-col on mobile, 4-col on desktop */}
          <div className="port-summary-grid" style={{ marginBottom: 20 }}>
            {summaryItems.map((s) => (
              <div key={s.label} style={cardBase}>
                <div style={{ fontSize: 11, color: '#4a6890', fontWeight: 500, marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: s.color ?? '#ccd8f5' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: '#4a6890', marginTop: 3 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ────────────────────────────────────────── */}
          <div className="port-desktop">
            <div style={{ background: '#101e35', border: '1px solid rgba(79,142,247,.15)', borderRadius: 9, overflow: 'hidden', marginBottom: 20 }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.1fr 1fr 1.1fr 0.8fr 80px', padding: '10px 16px', borderBottom: '1px solid rgba(79,142,247,.12)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#4a6890', alignItems: 'center' }}>
                <span>股票</span>
                <span>股價 / 漲跌</span>
                <span>市值</span>
                <span>持股數</span>
                <span>總損益</span>
                <span>AI 信號</span>
                <span />
              </div>

              {rows.map((h) => {
                const pctC  = priceColor(h.pct, h.market as Market);
                const gainC = priceColor(h.gainPct, h.market as Market);
                return (
                  <div
                    key={h.ticker}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.1fr 1fr 1.1fr 0.8fr 80px', padding: '13px 16px', borderBottom: '1px solid rgba(79,142,247,.07)', alignItems: 'center', fontSize: 13, transition: 'background .15s', cursor: 'pointer' }}
                    onClick={() => onSelectStock(h.ticker)}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'none')}
                  >
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{h.ticker}</div>
                      <div style={{ fontSize: 11, color: '#4a6890', marginTop: 1 }}>{h.name || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {h.price > 0 ? `${h.sym}${fmt(h.price, h.sym === '$' ? 2 : 0)}` : '—'}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: pctC, marginTop: 1 }}>
                        {h.pct !== 0 ? `${h.pct >= 0 ? '+' : ''}${h.pct.toFixed(2)}%` : '—'}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {h.price > 0 ? `${h.sym}${fmt(h.val, 0)}` : '—'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(h.shares)}</div>
                      <div style={{ fontSize: 11, color: '#4a6890', marginTop: 1 }}>
                        均 {h.sym}{fmt(h.avgCost, h.sym === '$' ? 2 : 1)}
                      </div>
                    </div>
                    <div>
                      {h.price > 0 ? (
                        <>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: gainC }}>
                            {h.gainPct >= 0 ? '+' : ''}{h.gainPct.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 11, color: '#4a6890', marginTop: 1 }}>
                            {h.gain >= 0 ? '+' : ''}{h.sym}{fmt(Math.abs(h.gain), 0)}
                          </div>
                        </>
                      ) : <div style={{ color: '#2a4060', fontSize: 12 }}>載入中…</div>}
                    </div>
                    <div>
                      {h.verdict && (
                        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: verdictColor(h.verdict), background: verdictBg(h.verdict), border: `1px solid ${verdictBorder(h.verdict)}`, padding: '2px 7px', borderRadius: 3 }}>
                          {verdictLabel(h.verdict)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setModal({ type: 'edit', holding: { ticker: h.ticker, shares: h.shares, avgCost: h.avgCost } })} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(79,142,247,.2)', background: 'none', color: '#4f8ef7', fontSize: 11, cursor: 'pointer' }}>
                        編輯
                      </button>
                      <button onClick={() => removeHolding(h.ticker)} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(255,64,96,.2)', background: 'none', color: '#ff4060', fontSize: 11, cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Mobile cards ─────────────────────────────────────────── */}
          <div className="port-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {rows.map((h) => (
              <MobileCard
                key={h.ticker}
                h={h}
                onEdit={() => setModal({ type: 'edit', holding: { ticker: h.ticker, shares: h.shares, avgCost: h.avgCost } })}
                onRemove={() => removeHolding(h.ticker)}
                onSelect={() => onSelectStock(h.ticker)}
              />
            ))}
          </div>

          {/* ── Performance charts (desktop only) ────────────────────── */}
          <div className="port-desktop">
            <div style={{ ...cardBase }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6890', marginBottom: 16 }}>
                3 月績效走勢
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
                {rows.map((h) => {
                  const market = h.market as Market;
                  const isTW   = isTWMarket(market);
                  const gainC  = priceColor(h.gainPct, market);
                  const chartIsUp = isTW ? h.gainPct < 0 : h.gainPct >= 0;
                  return (
                    <div key={h.ticker}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12 }}>{h.ticker}</span>
                        {h.price > 0 && (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: gainC }}>
                            {h.gainPct >= 0 ? '+' : ''}{h.gainPct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div style={{ height: 50 }}>
                        {h.history.length > 1 ? (
                          <ChartSVG
                            history={h.history}
                            W={200} H={50}
                            accent={gainC}
                            gradId={`pf-${h.ticker}`}
                            isUp={chartIsUp}
                            showControls={false}
                            initMode="line"
                            initPeriod="m3"
                            market={market}
                          />
                        ) : (
                          <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: 11 }}>
                            載入中…
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#4a6890', marginTop: 4 }}>
                        {fmt(h.shares)} 股 · 均 {h.sym}{fmt(h.avgCost, h.sym === '$' ? 2 : 1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <HoldingModal
          initial={modal.type === 'edit' ? modal.holding : undefined}
          onSave={modal.type === 'edit' ? updateHolding : addHolding}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
