import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../utils/api';
import type { Stock, NewsItem } from '../types';
import type { Market } from '../utils/market';
import { priceColor, isTWMarket } from '../utils/market';
import { useFundamentals } from '../hooks/useFundamentals';
import type { Fundamentals } from '../hooks/useFundamentals';
import { useNews } from '../hooks/useNews';
import { ChartSVG } from './Chart';

const SUGGESTIONS = [
  { label: '分析台積電（台股）', query: '分析2330台積電', ticker: '2330' },
  { label: '分析聯發科', query: '分析聯發科2454', ticker: '2454' },
  { label: '輝達前景如何？', query: '輝達的投資前景如何？', ticker: 'NVDA' },
  { label: '鴻海值得買嗎？', query: '鴻海2317現在值得買嗎？', ticker: '2317' },
  { label: '台積電ADR vs 台股', query: 'TSM美股和2330台股有什麼差異？', ticker: 'TSM' },
];

interface Message {
  id: number;
  role: 'user' | 'ai';
  text?: string;
  ticker?: string | null;
  typing?: boolean;
}

// Known US tickers for word-boundary detection — longest first avoids GOOG matching GOOGL
const US_TICKERS_KNOWN = [
  'GOOGL', 'AVGO', 'QCOM', 'LRCX', 'NFLX', 'ADBE', 'ORCL', 'BABA',
  'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOG', 'INTC', 'AMAT',
  'AMD', 'TSM', 'ARM', 'CRM', 'IBM', 'JPM', 'WMT', 'DIS', 'MU',
];

function detectTicker(text: string, stocks: Record<string, Stock>): string | null {
  // 1. TW 4-digit codes — any 4-digit number not followed by year/unit chars
  const twMatch = text.match(/(?<!\d)(\d{4})(?!\d)(?![年月日元萬億千百%％])/);
  if (twMatch) return twMatch[1];

  // 2. Known US tickers via word-boundary match
  const upper = text.toUpperCase();
  for (const ticker of US_TICKERS_KNOWN) {
    if (new RegExp(`\\b${ticker}\\b`).test(upper)) return ticker;
  }

  // 3. Already-loaded tickers not in the known list (custom loaded stocks)
  const extraTickers = Object.keys(stocks)
    .filter((k) => !/^\d+$/.test(k) && !US_TICKERS_KNOWN.includes(k))
    .sort((a, b) => b.length - a.length);
  for (const k of extraTickers) {
    if (new RegExp(`\\b${k}\\b`).test(upper)) return k;
  }

  // 4. Chinese name → TW ticker
  if (/台積電/.test(text)) return '2330';
  if (/聯發科|mediatek/i.test(text)) return '2454';
  if (/鴻海|foxconn/i.test(text)) return '2317';
  if (/中華電|chunghwa telecom/i.test(text)) return '2412';
  if (/國泰金/.test(text)) return '2882';
  if (/台達電/.test(text)) return '2308';
  if (/廣達/.test(text)) return '2382';
  if (/聯電/.test(text)) return '2303';
  if (/華碩|asus/i.test(text)) return '2357';
  if (/大立光/.test(text)) return '3008';
  if (/環球晶/.test(text)) return '6488';
  if (/華邦電/.test(text)) return '2344';

  // 5. Chinese name → US ticker
  if (/nvidia|輝達/i.test(text)) return 'NVDA';
  if (/蘋果|apple/i.test(text)) return 'AAPL';
  if (/微軟|microsoft/i.test(text)) return 'MSFT';
  if (/特斯拉|tesla/i.test(text)) return 'TSLA';
  if (/美光|micron/i.test(text)) return 'MU';
  if (/亞馬遜|amazon/i.test(text)) return 'AMZN';
  if (/谷歌|google|alphabet/i.test(text)) return 'GOOGL';
  if (/臉書|facebook|meta/i.test(text)) return 'META';
  if (/netflix/i.test(text)) return 'NFLX';
  if (/intel/i.test(text)) return 'INTC';
  if (/博通|broadcom/i.test(text)) return 'AVGO';
  if (/高通|qualcomm/i.test(text)) return 'QCOM';
  if (/tsmc/i.test(text)) return 'TSM';

  // 6. Name match in already-loaded stocks
  const tl = text.toLowerCase();
  for (const [ticker, s] of Object.entries(stocks)) {
    const nm = s.name?.toLowerCase() ?? '';
    const fn = s.fullName?.toLowerCase() ?? '';
    if (nm.length >= 2 && tl.includes(nm)) return ticker;
    if (fn.length >= 4 && tl.includes(fn)) return ticker;
  }

  return null;
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '5px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#4a6890',
            animation: `bounce 1.2s ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function parseAI(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 5 }} />;
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.*?)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      parts.push(
        <strong key={m.index} style={{ color: '#4f8ef7' }}>
          {m[1]}
        </strong>,
      );
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <div key={i} style={{ lineHeight: 1.65, margin: '1px 0' }}>
        {parts}
      </div>
    );
  });
}

function MiniStockCard({ stock, onSelect }: { stock: Stock; onSelect: (t: string) => void }) {
  const market = stock.market as Market;
  const isTW   = isTWMarket(market);
  const isUp   = stock.pct >= 0;
  const pctC   = priceColor(stock.pct, market);
  const chartIsUp = isTW ? !isUp : isUp;
  const vC =
    stock.verdict === 'BUY' ? '#00d98b' : stock.verdict === 'SELL' ? '#ff4060' : '#ffd666';
  const vBg =
    stock.verdict === 'BUY'
      ? 'rgba(0,217,139,.12)'
      : stock.verdict === 'SELL'
      ? 'rgba(255,64,96,.12)'
      : 'rgba(255,214,102,.12)';
  const vBrd =
    stock.verdict === 'BUY'
      ? 'rgba(0,217,139,.3)'
      : stock.verdict === 'SELL'
      ? 'rgba(255,64,96,.3)'
      : 'rgba(255,214,102,.3)';
  const verdictLabel = stock.verdict === 'BUY' ? '買進' : stock.verdict === 'SELL' ? '賣出' : '持有';

  return (
    <div
      onClick={() => onSelect(stock.ticker)}
      style={{
        background: '#070b14',
        border: '1px solid rgba(79,142,247,.18)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color .2s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,142,247,.5)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,142,247,.18)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px 4px' }}>
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {stock.ticker}
          </div>
          <div style={{ fontSize: 10, color: '#4a6890', marginTop: 1 }}>{stock.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {stock.sym}{stock.price.toLocaleString()}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: pctC,
            }}
          >
            {isUp ? '+' : ''}{stock.pct.toFixed(2)}%
          </div>
        </div>
      </div>
      <div style={{ height: 54, padding: '0 8px' }}>
        <ChartSVG
          history={stock.history}
          W={340}
          H={54}
          accent="#4f8ef7"
          gradId={`mc-${stock.ticker}`}
          isUp={chartIsUp}
          showControls={false}
          initMode="candle"
          initPeriod="m3"
          market={market}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '7px 12px',
          borderTop: '1px solid rgba(79,142,247,.1)',
          background: 'rgba(255,255,255,.02)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            color: vC,
            background: vBg,
            border: `1px solid ${vBrd}`,
            padding: '2px 8px',
            borderRadius: 3,
            letterSpacing: '.06em',
          }}
        >
          ● {verdictLabel}
        </span>
        <span style={{ fontSize: 11, color: '#4a6890' }}>
          信心：{stock.conf}%{' '}
          <span style={{ color: '#4f8ef7', cursor: 'pointer' }}>· 查看完整分析 →</span>
        </span>
      </div>
    </div>
  );
}

interface ChatPanelProps {
  stocks: Record<string, Stock>;
  onStockSelect: (ticker: string) => void;
  onStockLoad: (ticker: string) => Promise<Stock | null>;
  selectedTicker: string | null;
}

export function ChatPanel({ stocks, onStockSelect, onStockLoad, selectedTicker }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'ai',
      text: '您好！我是您的 AI 投資分析師。我從基本面、技術面與市場情緒三個維度分析股票，為您提供明確的**買進 / 持有 / 賣出**建議，附帶信心指數與風險評估。\n\n試著問我：**「分析台積電」** 或 **「現在應該買特斯拉嗎？」**',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const showSuggestions = messages.length === 1;

  // Fetch real fundamentals + news for the selected ticker so analysis text uses real data
  const { data: fundamentals } = useFundamentals(selectedTicker);
  const { news: realNews } = useNews(selectedTicker);

  // Keep refs so stale setTimeout closures can read latest values
  const stocksRef = useRef(stocks);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);

  const fundamentalsRef = useRef(fundamentals);
  useEffect(() => { fundamentalsRef.current = fundamentals; }, [fundamentals]);
  const realNewsRef = useRef(realNews);
  useEffect(() => { realNewsRef.current = realNews; }, [realNews]);

  // Track which ticker was already handled by send() to avoid duplicate auto-analysis
  const lastSendTickerRef  = useRef<string | null>(null);
  const autoAnalysisAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      const parent = bottomRef.current.parentElement!;
      parent.scrollTop = parent.scrollHeight;
    }
  }, [messages]);

  // ── callChatAPI — streams a Claude response into the message list ──────────
  // typingId: id of the existing typing-indicator message to replace on first chunk
  async function callChatAPI(
    typingId: number,
    msgs: Array<{ role: 'user' | 'assistant'; content: string }>,
    stockCtx: { stock: Stock; fundamentals: Fundamentals | null; news: NewsItem[] } | null,
    signal?: AbortSignal,
  ): Promise<void> {
    const msgId = Date.now();
    const responseTicker = stockCtx?.stock.ticker ?? null;
    let firstChunk = true;
    let accumulated = '';

    const stockContext = stockCtx
      ? {
          ticker:    stockCtx.stock.ticker,
          name:      stockCtx.stock.name,
          market:    stockCtx.stock.market,
          sym:       stockCtx.stock.sym,
          price:     stockCtx.stock.price,
          pct:       stockCtx.stock.pct,
          hi52:      stockCtx.stock.hi52,
          lo52:      stockCtx.stock.lo52,
          pe:        stockCtx.fundamentals?.pe        ?? stockCtx.stock.pe,
          eps:       stockCtx.fundamentals?.eps       ?? stockCtx.stock.eps,
          cap:       stockCtx.fundamentals?.cap       ?? stockCtx.stock.cap,
          beta:      stockCtx.fundamentals?.beta      ?? stockCtx.stock.beta,
          analysts:  stockCtx.fundamentals?.analysts  ?? stockCtx.stock.analysts,
          target:    stockCtx.fundamentals?.target    ?? stockCtx.stock.target,
          summary:   stockCtx.fundamentals?.summary   ?? stockCtx.stock.summary,
        }
      : null;

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, stockContext }),
        signal,
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j.error ?? errMsg; } catch {}
        throw new Error(errMsg);
      }
      if (!res.body) throw new Error('No response stream');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      outer: while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break outer;
          try {
            const obj = JSON.parse(payload);
            if (!obj.text) continue;
            accumulated += obj.text;
            if (firstChunk) {
              firstChunk = false;
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== typingId),
                { id: msgId, role: 'ai', text: accumulated, ticker: responseTicker },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) => m.id === msgId ? { ...m, text: accumulated } : m)
              );
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }
    } catch (err: unknown) {
      const isAbort = (err as { name?: string })?.name === 'AbortError';
      if (isAbort) {
        setMessages((prev) => prev.filter((m) => m.id !== typingId));
        return;
      }
      const errText = (err as Error)?.message ?? '未知錯誤';
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingId),
        { id: msgId, role: 'ai', text: `⚠️ AI 服務暫時無法連線（${errText}），請稍後再試。` },
      ]);
      return;
    }

    if (firstChunk) {
      setMessages((prev) => prev.filter((m) => m.id !== typingId));
    }
  }

  // Auto-analyse whenever the selected stock changes (e.g. clicking watchlist)
  useEffect(() => {
    if (!selectedTicker) return;

    // send() already generated analysis for this ticker — skip duplicate
    if (selectedTicker === lastSendTickerRef.current) {
      lastSendTickerRef.current = null;
      return;
    }

    if (autoAnalysisAbortRef.current) autoAnalysisAbortRef.current.abort();
    const controller = new AbortController();
    autoAnalysisAbortRef.current = controller;

    const typingId = Date.now();
    setMessages((prev) => [...prev, { id: typingId, role: 'ai', typing: true }]);

    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;
      const stock = stocksRef.current[selectedTicker];
      if (!stock) {
        setMessages((prev) => prev.filter((m) => m.id !== typingId));
        return;
      }
      const msgs: Array<{ role: 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: `請分析 ${stock.name}（${selectedTicker}）的投資價值，給出明確的買進/持有/賣出建議與理由。` },
      ];
      const stockCtx = { stock, fundamentals: fundamentalsRef.current, news: realNewsRef.current ?? [] };
      await callChatAPI(typingId, msgs, stockCtx, controller.signal);
    }, 900);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setMessages((prev) => prev.filter((m) => !m.typing));
    };
  }, [selectedTicker]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string, ticker?: string) {
    if (!text.trim() || thinking) return;

    // Cancel any pending auto-analysis — send() takes precedence
    if (autoAnalysisAbortRef.current) {
      autoAnalysisAbortRef.current.abort();
      autoAnalysisAbortRef.current = null;
    }
    setMessages((prev) => prev.filter((m) => !m.typing));

    const userMsg: Message = { id: Date.now(), role: 'user', text: text.trim() };
    const typingId = Date.now() + 1;
    setMessages((prev) => [...prev, userMsg, { id: typingId, role: 'ai', typing: true }]);
    setInput('');
    setThinking(true);

    try {
      const t = ticker ?? detectTicker(text, stocksRef.current);
      if (t) lastSendTickerRef.current = t;

      let stock: Stock | null = t ? (stocksRef.current[t] ?? null) : null;

      if (t && (!stock || stock.limitedData)) {
        stock = await onStockLoad(t) ?? stock;
      } else if (t && stock) {
        onStockSelect(t);
      }

      // Build conversation history (last 8, alternating, starting with user)
      const rawHistory = messages.filter((m) => m.text && !m.typing).slice(-9);
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const m of rawHistory) {
        const role = m.role === 'user' ? 'user' : 'assistant';
        if (history.length === 0 && role !== 'user') continue;
        if (history.length > 0 && history[history.length - 1].role === role) {
          history[history.length - 1].content += '\n\n' + m.text;
        } else {
          history.push({ role, content: m.text! });
        }
      }
      history.push({ role: 'user', content: text.trim() });

      const stockCtx = (stock && stock.price > 0)
        ? { stock, fundamentals: fundamentalsRef.current, news: realNewsRef.current ?? [] }
        : null;

      await callChatAPI(typingId, history, stockCtx);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        borderRight: '1px solid rgba(79,142,247,.15)',
        background: '#0c1422',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid rgba(79,142,247,.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#00d98b',
              boxShadow: '0 0 7px #00d98b',
              animation: 'pulse 2s infinite',
            }}
          />
          <span style={{ fontWeight: 600, fontSize: 13 }}>AI 投資分析師</span>
        </div>
        <span style={{ fontSize: 11, color: '#4a6890' }}>Groq · 雲端</span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 13,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(79,142,247,.2) transparent',
        }}
      >
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    background: 'rgba(79,142,247,.12)',
                    border: '1px solid rgba(79,142,247,.25)',
                    borderRadius: '12px 12px 2px 12px',
                    padding: '10px 13px',
                    fontSize: 12,
                    lineHeight: 1.6,
                    maxWidth: '82%',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'rgba(79,142,247,.15)',
                  border: '1px solid rgba(79,142,247,.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4f8ef7',
                  fontSize: 11,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                ◈
              </div>
              <div
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {msg.typing ? (
                  <div
                    style={{
                      background: '#101e35',
                      border: '1px solid rgba(79,142,247,.15)',
                      borderRadius: '2px 10px 10px 10px',
                      padding: '8px 14px',
                    }}
                  >
                    <TypingDots />
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        background: '#101e35',
                        border: '1px solid rgba(79,142,247,.15)',
                        borderRadius: '2px 10px 10px 10px',
                        padding: '10px 13px',
                        fontSize: 12,
                      }}
                    >
                      {parseAI(msg.text ?? '')}
                    </div>
                    {msg.ticker && stocks[msg.ticker] && stocks[msg.ticker].price > 0 && (
                      <MiniStockCard stock={stocks[msg.ticker]} onSelect={onStockSelect} />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div style={{ padding: '0 14px 12px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => send(s.query, s.ticker)}
              style={{
                padding: '5px 12px',
                border: '1px solid rgba(79,142,247,.2)',
                borderRadius: 20,
                background: 'none',
                color: '#4a6890',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = '#4f8ef7';
                el.style.color = '#4f8ef7';
                el.style.background = 'rgba(79,142,247,.08)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'rgba(79,142,247,.2)';
                el.style.color = '#4a6890';
                el.style.background = 'none';
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(79,142,247,.15)',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
          placeholder="詢問：分析台積電 · 我該買輝達嗎？ · 投資組合風險分析"
          disabled={thinking}
          style={{
            flex: 1,
            background: '#101e35',
            border: '1px solid rgba(79,142,247,.15)',
            borderRadius: 9,
            padding: '9px 13px',
            color: '#ccd8f5',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12,
            outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(79,142,247,.45)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(79,142,247,.15)')}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || thinking}
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            border: 'none',
            background:
              input.trim() && !thinking ? '#4f8ef7' : 'rgba(79,142,247,.2)',
            color: input.trim() && !thinking ? '#fff' : '#4a6890',
            fontSize: 16,
            cursor: input.trim() && !thinking ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            flexShrink: 0,
            transition: 'background .2s',
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
