import express from 'express';
import cors from 'cors';
import YahooFinanceModule from 'yahoo-finance2';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({
  origin: [
    'https://yanzh-ho.github.io',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
  ],
  credentials: true,
}));

app.use(express.json());
const PORT = 3001;

const yf = new YahooFinanceModule({ suppressNotices: ['yahooSurvey'] });

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const YF_FETCH_OPTS = { headers: { 'User-Agent': BROWSER_UA } };

// Groq cloud LLM config
import Groq from 'groq-sdk';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

async function getStockPrice(symbol) {
  const raw = symbol.trim();
  const info = resolveInfo(raw);
  const isTW = info.market === 'TWSE' || info.market === 'TPEx';
  // Unknown TW codes not in UNIVERSE — need .TW/.TWO probe
  const isUnknownTW = /^\d{4,6}$/.test(raw) && !UNIVERSE[raw.toUpperCase()];

  try {
    let yahooSym = info.yahoo ?? raw;
    let priceData;

    if (isUnknownTW) {
      const { data, yahoo: foundYahoo } = await fetchTWWithFallback(raw);
      priceData = data;
      yahooSym  = foundYahoo;
    } else {
      priceData = await fetchOneWithRetry(yahooSym);
    }

    const targetPrice = await yf
      .quoteSummary(yahooSym, { modules: ['financialData'] }, { validateResult: false, fetchOptions: YF_FETCH_OPTS })
      .then(qs => qs.financialData?.targetMeanPrice ?? null)
      .catch(() => null);

    return {
      ok: true,
      ticker: raw,
      name: priceData.stockName || info.name || raw,
      sym: isTW ? 'NT$' : '$',
      price: priceData.price,
      change: priceData.change,
      pct: priceData.pct,
      hi52: priceData.hi52,
      lo52: priceData.lo52,
      targetPrice,
    };
  } catch (err) {
    return { ok: false, ticker: raw, error: err.message };
  }
}

// ── Known stock universe (mirrors src/data/stockUniverse.ts) ─────────────────
// Includes Yahoo symbol + TWSE MIS symbol for fallback
const UNIVERSE = {
  // US
  AAPL:  { name: '蘋果',       fullName: 'Apple Inc.',                      market: 'US', yahoo: 'AAPL' },
  MSFT:  { name: '微軟',       fullName: 'Microsoft Corporation',            market: 'US', yahoo: 'MSFT' },
  NVDA:  { name: '輝達',       fullName: 'NVIDIA Corporation',              market: 'US', yahoo: 'NVDA' },
  TSLA:  { name: '特斯拉',     fullName: 'Tesla, Inc.',                     market: 'US', yahoo: 'TSLA' },
  TSM:   { name: '台積電 ADR', fullName: 'Taiwan Semiconductor Mfg. (ADR)', market: 'US', yahoo: 'TSM' },
  AMZN:  { name: 'Amazon',    fullName: 'Amazon.com, Inc.',                 market: 'US', yahoo: 'AMZN' },
  META:  { name: 'Meta',      fullName: 'Meta Platforms, Inc.',             market: 'US', yahoo: 'META' },
  GOOG:  { name: 'Alphabet',  fullName: 'Alphabet Inc. (Class C)',          market: 'US', yahoo: 'GOOG' },
  GOOGL: { name: 'Alphabet',  fullName: 'Alphabet Inc. (Class A)',          market: 'US', yahoo: 'GOOGL' },
  AMD:   { name: 'AMD',       fullName: 'Advanced Micro Devices, Inc.',     market: 'US', yahoo: 'AMD' },
  MU:    { name: 'Micron',    fullName: 'Micron Technology, Inc.',          market: 'US', yahoo: 'MU' },
  AVGO:  { name: 'Broadcom',  fullName: 'Broadcom Inc.',                    market: 'US', yahoo: 'AVGO' },
  QCOM:  { name: 'Qualcomm',  fullName: 'Qualcomm Inc.',                    market: 'US', yahoo: 'QCOM' },
  INTC:  { name: 'Intel',     fullName: 'Intel Corporation',                market: 'US', yahoo: 'INTC' },
  ARM:   { name: 'Arm',       fullName: 'Arm Holdings plc',                 market: 'US', yahoo: 'ARM' },
  AMAT:  { name: 'AMAT',      fullName: 'Applied Materials, Inc.',          market: 'US', yahoo: 'AMAT' },
  LRCX:  { name: 'Lam Research', fullName: 'Lam Research Corporation',      market: 'US', yahoo: 'LRCX' },
  NFLX:  { name: 'Netflix',   fullName: 'Netflix, Inc.',                    market: 'US', yahoo: 'NFLX' },
  ADBE:  { name: 'Adobe',     fullName: 'Adobe Inc.',                       market: 'US', yahoo: 'ADBE' },
  CRM:   { name: 'Salesforce',fullName: 'Salesforce, Inc.',                 market: 'US', yahoo: 'CRM' },
  ORCL:  { name: 'Oracle',    fullName: 'Oracle Corporation',               market: 'US', yahoo: 'ORCL' },
  IBM:   { name: 'IBM',       fullName: 'International Business Machines',  market: 'US', yahoo: 'IBM' },
  JPM:   { name: 'JPMorgan',  fullName: 'JPMorgan Chase & Co.',             market: 'US', yahoo: 'JPM' },
  V:     { name: 'Visa',      fullName: 'Visa Inc.',                        market: 'US', yahoo: 'V' },
  MA:    { name: 'Mastercard',fullName: 'Mastercard Inc.',                  market: 'US', yahoo: 'MA' },
  WMT:   { name: 'Walmart',   fullName: 'Walmart Inc.',                     market: 'US', yahoo: 'WMT' },
  DIS:   { name: 'Disney',    fullName: 'Walt Disney Company',              market: 'US', yahoo: 'DIS' },
  BABA:  { name: '阿里巴巴',  fullName: 'Alibaba Group Holding',            market: 'US', yahoo: 'BABA' },
  // TWSE
  '2330': { name: '台積電',    fullName: '台灣積體電路製造股份有限公司', market: 'TWSE', yahoo: '2330.TW', mis: 'tse_2330.tw' },
  '2454': { name: '聯發科',    fullName: '聯發科技股份有限公司',         market: 'TWSE', yahoo: '2454.TW', mis: 'tse_2454.tw' },
  '2317': { name: '鴻海',      fullName: '鴻海精密工業股份有限公司',     market: 'TWSE', yahoo: '2317.TW', mis: 'tse_2317.tw' },
  '2412': { name: '中華電',    fullName: '中華電信股份有限公司',         market: 'TWSE', yahoo: '2412.TW', mis: 'tse_2412.tw' },
  '2882': { name: '國泰金',    fullName: '國泰金融控股股份有限公司',     market: 'TWSE', yahoo: '2882.TW', mis: 'tse_2882.tw' },
  '2344': { name: '華邦電',    fullName: '華邦電子股份有限公司',         market: 'TWSE', yahoo: '2344.TW', mis: 'tse_2344.tw' },
  '2308': { name: '台達電',    fullName: '台達電子工業股份有限公司',     market: 'TWSE', yahoo: '2308.TW', mis: 'tse_2308.tw' },
  '2382': { name: '廣達',      fullName: '廣達電腦股份有限公司',         market: 'TWSE', yahoo: '2382.TW', mis: 'tse_2382.tw' },
  '2303': { name: '聯電',      fullName: '聯華電子股份有限公司',         market: 'TWSE', yahoo: '2303.TW', mis: 'tse_2303.tw' },
  '2357': { name: '華碩',      fullName: '華碩電腦股份有限公司',         market: 'TWSE', yahoo: '2357.TW', mis: 'tse_2357.tw' },
  '2881': { name: '富邦金',    fullName: '富邦金融控股股份有限公司',     market: 'TWSE', yahoo: '2881.TW', mis: 'tse_2881.tw' },
  '2886': { name: '兆豐金',    fullName: '兆豐金融控股股份有限公司',     market: 'TWSE', yahoo: '2886.TW', mis: 'tse_2886.tw' },
  '3711': { name: '日月光投控',fullName: '日月光投資控股股份有限公司',  market: 'TWSE', yahoo: '3711.TW', mis: 'tse_3711.tw' },
  '2002': { name: '中鋼',      fullName: '中國鋼鐵股份有限公司',         market: 'TWSE', yahoo: '2002.TW', mis: 'tse_2002.tw' },
  '2327': { name: '國巨',      fullName: '國巨股份有限公司',             market: 'TWSE', yahoo: '2327.TW', mis: 'tse_2327.tw' },
  '2408': { name: '南亞科',    fullName: '南亞科技股份有限公司',         market: 'TWSE', yahoo: '2408.TW', mis: 'tse_2408.tw' },
  '1301': { name: '台塑',      fullName: '台灣塑膠工業股份有限公司',     market: 'TWSE', yahoo: '1301.TW', mis: 'tse_1301.tw' },
  // TPEx
  '6488': { name: '環球晶',    fullName: '環球晶圓股份有限公司',         market: 'TPEx', yahoo: '6488.TWO', mis: 'otc_6488.tw' },
  '3008': { name: '大立光',    fullName: '大立光電股份有限公司',         market: 'TPEx', yahoo: '3008.TWO', mis: 'otc_3008.tw' },
  '3034': { name: '聯詠',      fullName: '聯詠科技股份有限公司',         market: 'TPEx', yahoo: '3034.TWO', mis: 'otc_3034.tw' },
  '4938': { name: '和碩',      fullName: '和碩聯合科技股份有限公司',     market: 'TPEx', yahoo: '4938.TWO', mis: 'otc_4938.tw' },
};

// Also keep a legacy SYMBOL_MAP for the bulk /api/market fetch
const SYMBOL_MAP = {
  TSM: 'TSM', NVDA: 'NVDA', AAPL: 'AAPL', TSLA: 'TSLA', MSFT: 'MSFT',
  '2330': '2330.TW', '2454': '2454.TW', '2317': '2317.TW', '2412': '2412.TW', '2882': '2882.TW',
  TWII: '^TWII',
};

// ── TW stock lists loaded from public OpenAPI at startup ────────────────────
let twseList = [];
let tpexList = [];

async function fetchTWLists() {
  try {
    const res = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L');
    if (res.ok) {
      const data = await res.json();
      twseList = data.map(s => ({
        code:     (s['公司代號'] || '').trim(),
        name:     (s['公司簡稱'] || s['公司名稱'] || '').trim(),
        fullName: (s['公司名稱'] || '').trim(),
      })).filter(s => s.code);
      console.log(`[market] TWSE list loaded: ${twseList.length} stocks`);
    }
  } catch (e) { console.error('[market] TWSE list failed:', e.message); }
  try {
    const res = await fetch('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O');
    if (res.ok) {
      const data = await res.json();
      tpexList = data.map(s => ({
        code:     (s['公司代號'] || '').trim(),
        name:     (s['公司簡稱'] || s['公司名稱'] || '').trim(),
        fullName: (s['公司名稱'] || '').trim(),
      })).filter(s => s.code);
      console.log(`[market] TPEx list loaded: ${tpexList.length} stocks`);
    }
  } catch (e) { console.error('[market] TPEx list failed:', e.message); }
}

// ── Caches ──────────────────────────────────────────────────────────────────
let marketCache = null, marketCacheTs = 0;
const MARKET_TTL = 5 * 60 * 1000;
const fundamentalsCache = new Map();
const FUNDAMENTALS_TTL  = 30 * 60 * 1000;
const newsCache         = new Map();
const NEWS_TTL          = 15 * 60 * 1000;
const quoteCache        = new Map();
const QUOTE_TTL         = 5 * 60 * 1000;

// ── Core: fetch 1-year OHLCV from Yahoo Finance ──────────────────────────────
async function fetchOne(yahooSymbol) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const chartData = await yf.chart(
    yahooSymbol,
    { interval: '1d', period1: oneYearAgo },
    { validateResult: false, fetchOptions: YF_FETCH_OPTS },
  );
  const meta   = chartData.meta;
  const quotes = (chartData.quotes ?? []).filter(
    q => q.open != null && q.high != null && q.low != null && q.close != null,
  );
  const last  = quotes[quotes.length - 1];
  const prev  = quotes[quotes.length - 2];
  const price  = meta.regularMarketPrice ?? meta.currentPrice ?? meta.price ?? last?.close ?? 0;
  const change = prev ? +(price - prev.close).toFixed(2) : (meta.regularMarketChange ?? 0);
  // yahoo-finance2 returns regularMarketChangePercent as decimal (0.05 = 5%); multiply when used
  const metaRawPct = meta.regularMarketChangePercent ?? meta.priceChangePercent;
  const pct = prev
    ? +((change / prev.close) * 100).toFixed(2)
    : metaRawPct != null ? +(metaRawPct * 100).toFixed(2) : 0;
  const closes = quotes.map(q => q.close);
  const hi52 = meta.fiftyTwoWeekHigh ?? (closes.length ? Math.max(...closes) : 0);
  const lo52 = meta.fiftyTwoWeekLow  ?? (closes.length ? Math.min(...closes) : 0);
  const history = quotes.map(q => ({
    o: +q.open.toFixed(2), h: +q.high.toFixed(2),
    l: +q.low.toFixed(2),  c: +q.close.toFixed(2), v: q.volume ?? 0,
  }));
  const stockName = meta.longName || meta.shortName || meta.displayName || null;
  return { price, change, pct, hi52, lo52, history, stockName };
}

// Yahoo Finance with 1 automatic retry on transient failure
async function fetchOneWithRetry(yahooSymbol) {
  try {
    return await fetchOne(yahooSymbol);
  } catch (err) {
    const msg = err.message ?? '';
    // Only retry on network-level errors, not on symbol-not-found
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET')) {
      await new Promise(r => setTimeout(r, 1500));
      return fetchOne(yahooSymbol); // let second failure propagate
    }
    throw err;
  }
}

// For unknown 4-digit TW codes: try .TW (TWSE) first, fall back to .TWO (TPEx)
async function fetchTWWithFallback(code) {
  try {
    const data = await fetchOneWithRetry(`${code}.TW`);
    if (data.price > 0) return { data, yahoo: `${code}.TW`, market: 'TWSE' };
  } catch { /* fall through to TPEx */ }
  const data = await fetchOneWithRetry(`${code}.TWO`);
  return { data, yahoo: `${code}.TWO`, market: 'TPEx' };
}

// TWSE MIS real-time quote — returns minimal price data (no history)
// Proxied to avoid CORS; market is closed outside trading hours (z becomes "-")
async function fetchFromTWSEMIS(misSymbol) {
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(misSymbol)}&json=1&delay=0`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mis.twse.com.tw/',
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`TWSE MIS HTTP ${res.status}`);
    const data = await res.json();
    const item = data?.msgArray?.[0];
    if (!item) throw new Error('TWSE MIS: empty response');

    const prevClose = parseFloat(item.y) || 0;
    const lastTrade = parseFloat(item.z);             // "-" when closed → NaN
    const price  = isNaN(lastTrade) ? prevClose : lastTrade;
    const change = prevClose ? +(price - prevClose).toFixed(2) : 0;
    const pct    = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;

    return { price, change, pct, hi52: 0, lo52: 0, history: [] };
  } finally {
    clearTimeout(timer);
  }
}

// Resolve ticker → { yahoo, market, mis?, name?, fullName? }
function resolveInfo(ticker) {
  const t = ticker.toUpperCase();
  // UNIVERSE has highest priority
  if (UNIVERSE[t]) return UNIVERSE[t];
  // TWSE/TPEx live lists
  const twse = twseList.find(s => s.code === t);
  if (twse) return { name: twse.name, fullName: twse.fullName, market: 'TWSE', yahoo: `${t}.TW`, mis: `tse_${t}.tw` };
  const tpex = tpexList.find(s => s.code === t);
  if (tpex) return { name: tpex.name, fullName: tpex.fullName, market: 'TPEx', yahoo: `${t}.TWO`, mis: `otc_${t}.tw` };
  // Heuristic for unknown codes
  if (/^\d{4,6}$/.test(t)) return { name: t, fullName: t, market: 'TWSE', yahoo: `${t}.TW`, mis: `tse_${t}.tw` };
  return { name: t, fullName: t, market: 'US', yahoo: t };
}

// ── Startup ──────────────────────────────────────────────────────────────────
fetchTWLists();
(async () => {
  try {
    const results = {}, errors = {};
    await Promise.allSettled(
      Object.entries(SYMBOL_MAP).map(async ([ticker, symbol]) => {
        try { results[ticker] = await fetchOneWithRetry(symbol); }
        catch (err) { errors[ticker] = err.message; console.error(`[market] ${ticker} failed:`, err.message); }
      }),
    );
    marketCache   = { results, errors, fetchedAt: new Date().toISOString() };
    marketCacheTs = Date.now();
    const ok  = Object.keys(results).join(', ') || '(none)';
    const bad = Object.keys(errors).join(', ')  || '(none)';
    console.log(`[market] ready — ok: [${ok}]  failed: [${bad}]`);
  } catch (err) { console.error('[market] startup fetch error:', err.message); }
})();

// ── Routes ───────────────────────────────────────────────────────────────────

// Bulk market data for watchlist tickers
app.get('/api/market', async (_req, res) => {
  try {
    if (marketCache && Date.now() - marketCacheTs < MARKET_TTL) {
      return res.json({ ...marketCache, cached: true });
    }
    const results = {}, errors = {};
    await Promise.allSettled(
      Object.entries(SYMBOL_MAP).map(async ([ticker, symbol]) => {
        try { results[ticker] = await fetchOneWithRetry(symbol); }
        catch (err) { errors[ticker] = err.message; }
      }),
    );
    marketCache   = { results, errors, fetchedAt: new Date().toISOString() };
    marketCacheTs = Date.now();
    res.json(marketCache);
  } catch (err) {
    if (marketCache) return res.json({ ...marketCache, stale: true });
    res.status(500).json({ error: err.message, results: {}, errors: {} });
  }
});

// Fast text search — no Yahoo calls, uses TW lists + UNIVERSE
app.get('/api/search', (req, res) => {
  const q = ((req.query.q) || '').toLowerCase().trim();
  if (!q) return res.json({ results: [] });

  const results = [], seen = new Set();
  const add = (ticker, name, fullName, market) => {
    if (seen.has(ticker) || results.length >= 8) return;
    results.push({ ticker, name, fullName, market });
    seen.add(ticker);
  };

  // TWSE full list (code prefix first, then name match)
  for (const s of twseList) {
    if (results.length >= 8) break;
    if (s.code.startsWith(q)) add(s.code, s.name, s.fullName, 'TWSE');
  }
  for (const s of twseList) {
    if (results.length >= 8) break;
    if (!seen.has(s.code) && (s.name.includes(q) || s.fullName.includes(q)))
      add(s.code, s.name, s.fullName, 'TWSE');
  }
  // TPEx full list
  for (const s of tpexList) {
    if (results.length >= 8) break;
    if (s.code.startsWith(q)) add(s.code, s.name, s.fullName, 'TPEx');
  }
  for (const s of tpexList) {
    if (results.length >= 8) break;
    if (!seen.has(s.code) && (s.name.includes(q) || s.fullName.includes(q)))
      add(s.code, s.name, s.fullName, 'TPEx');
  }
  // UNIVERSE US stocks (ticker prefix, then name)
  for (const [ticker, info] of Object.entries(UNIVERSE)) {
    if (results.length >= 8 || info.market !== 'US') break;
    if (ticker.toLowerCase().startsWith(q)) add(ticker, info.name, info.fullName, 'US');
  }
  for (const [ticker, info] of Object.entries(UNIVERSE)) {
    if (results.length >= 8 || info.market !== 'US') break;
    if (!seen.has(ticker) && (info.name.toLowerCase().includes(q) || info.fullName.toLowerCase().includes(q)))
      add(ticker, info.name, info.fullName, 'US');
  }

  res.json({ results });
});

// On-demand quote for any ticker — ALWAYS returns 200, uses limitedData flag
app.get('/api/quote/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();

  const hit = quoteCache.get(ticker);
  if (hit && Date.now() - hit.ts < QUOTE_TTL) return res.json({ ...hit.data, cached: true });

  const info   = resolveInfo(ticker);
  const market = info.market;
  const isTW   = market === 'TWSE' || market === 'TPEx';

  let priceData   = null;
  let dataSource  = 'none';
  let limitedData = false;

  // 1. Try Yahoo Finance (with one retry on network error)
  try {
    priceData  = await fetchOneWithRetry(info.yahoo ?? ticker);
    dataSource = 'yahoo';
  } catch (yahooErr) {
    console.log(`[market] Yahoo failed for ${ticker}: ${yahooErr.message}`);

    // 2. TW fallback: TWSE MIS real-time API
    if (isTW && info.mis) {
      try {
        priceData   = await fetchFromTWSEMIS(info.mis);
        dataSource  = 'twse-mis';
        limitedData = true; // no chart history from MIS
      } catch (misErr) {
        console.log(`[market] TWSE MIS failed for ${ticker}: ${misErr.message}`);
      }
    }
  }

  // 3. If 4-digit code and .TW failed OR returned price=0 (blocked), try .TWO (TPEx)
  const twFailed = !priceData || priceData.price === 0;
  if (twFailed && /^\d{4}$/.test(ticker) && (market === 'TWSE' || market === 'TPEx')) {
    try {
      priceData  = await fetchOneWithRetry(`${ticker}.TWO`);
      dataSource = 'yahoo-tpex-fallback';
    } catch {
      try {
        priceData   = await fetchFromTWSEMIS(`otc_${ticker}.tw`);
        dataSource  = 'twse-mis-otc';
        limitedData = true;
      } catch { /* ignore */ }
    }
  }

  const yahooName = priceData?.stockName || null;
  const result = {
    ticker,
    name:        yahooName || info.name     || ticker,
    fullName:    yahooName || info.fullName || ticker,
    market,
    currency:    isTW ? 'TWD' : 'USD',
    sym:         isTW ? 'NT$' : '$',
    price:       priceData?.price   ?? 0,
    change:      priceData?.change  ?? 0,
    pct:         priceData?.pct     ?? 0,
    hi52:        priceData?.hi52    ?? 0,
    lo52:        priceData?.lo52    ?? 0,
    history:     priceData?.history ?? [],
    limitedData: limitedData || !priceData,
    dataSource,
  };

  quoteCache.set(ticker, { data: result, ts: Date.now() });
  res.json(result); // always 200
});

// Fundamentals — yf.quoteSummary with 30-min cache
app.get('/api/fundamentals/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const hit = fundamentalsCache.get(ticker);
  if (hit && Date.now() - hit.ts < FUNDAMENTALS_TTL) return res.json({ ...hit.data, cached: true });

  const info  = resolveInfo(ticker);
  const isTW  = info.market === 'TWSE' || info.market === 'TPEx';
  const yahoo = info.yahoo ?? ticker;

  try {
    const qs = await yf.quoteSummary(
      yahoo,
      { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'price', 'recommendationTrend', 'assetProfile'] },
      { validateResult: false, fetchOptions: YF_FETCH_OPTS },
    );
    const sd = qs.summaryDetail        ?? {};
    const ks = qs.defaultKeyStatistics ?? {};
    const fd = qs.financialData        ?? {};
    const pr = qs.price                ?? {};
    const rt = qs.recommendationTrend?.trend?.[0] ?? null;
    const ap = qs.assetProfile         ?? {};

    const capRaw = pr.marketCap ?? sd.marketCap;
    const fmtCap = (v) => {
      if (!v) return 'N/A';
      if (isTW) {
        if (v >= 1e12) return `${(v / 1e12).toFixed(1)} 兆元`;
        if (v >= 1e8)  return `${(v / 1e8).toFixed(0)} 億元`;
        return `${v.toLocaleString()} 元`;
      }
      if (v >= 1e12) return `${(v / 1e12).toFixed(2)} 兆美元`;
      if (v >= 1e9)  return `${(v / 1e9).toFixed(1)} 億美元`;
      return `$${v.toLocaleString()}`;
    };

    const fmtVol = (v) => {
      if (!v || v <= 0) return 'N/A';
      if (isTW) {
        const lots = Math.round(v / 1000);
        if (lots >= 10000) return `${(lots / 10000).toFixed(1)} 萬張`;
        if (lots > 0) return `${lots.toLocaleString()} 張`;
        return 'N/A';
      }
      if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
      if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
      return String(v);
    };

    const sym = isTW ? 'NT$' : '$';

    // Real analyst consensus (current period "0m")
    const analysts = rt ? {
      buy:  (rt.strongBuy  ?? 0) + (rt.buy  ?? 0),
      hold: rt.hold ?? 0,
      sell: (rt.sell ?? 0) + (rt.strongSell ?? 0),
    } : { buy: 0, hold: 0, sell: 0 };

    // Real consensus target prices from financialData
    const target = {
      lo:  fd.targetLowPrice  ?? 0,
      mid: fd.targetMeanPrice ?? 0,
      hi:  fd.targetHighPrice ?? 0,
    };

    // Company description (English from Yahoo)
    const summary = (ap.longBusinessSummary ?? '').slice(0, 600);

    // Volume (current session and 3-month average)
    const volShares    = pr.regularMarketVolume ?? sd.volume        ?? 0;
    const avgVolShares = sd.averageVolume        ?? sd.averageVolume10days ?? 0;

    const hasAny = !!(sd.trailingPE || ks.trailingEps || rt || fd.targetMeanPrice);
    const data = { data: {
      pe:            sd.trailingPE    ? `${sd.trailingPE.toFixed(1)} 倍`          : 'N/A',
      eps:           ks.trailingEps   ? `${sym}${ks.trailingEps.toFixed(2)}`      : 'N/A',
      cap:           fmtCap(capRaw),
      beta:          sd.beta          ? sd.beta.toFixed(2)                         : 'N/A',
      div:           sd.dividendYield ? `${(sd.dividendYield * 100).toFixed(2)}%`  : '—',
      profitMargin:  fd.profitMargins ? `${(fd.profitMargins * 100).toFixed(1)}%`  : 'N/A',
      revenueGrowth: fd.revenueGrowth ? `${(fd.revenueGrowth * 100).toFixed(1)}%` : 'N/A',
      vol:           fmtVol(volShares),
      avgVol:        fmtVol(avgVolShares),
      analysts,
      target,
      summary,
      limitedData:   !hasAny,
    }};
    fundamentalsCache.set(ticker, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    res.json({ data: null, error: err.message });
  }
});

// ── News helpers ─────────────────────────────────────────────────────────────

const BULL_KW = ['buy','surge','beat','record','growth','strong','rise','gain','upgrade','outperform','買超','漲','超越','成長','創高','上調','買進'];
const BEAR_KW = ['sell','drop','miss','decline','weak','fall','loss','downgrade','underperform','賣超','跌','下修','虧損','下調'];
function kwSentiment(title) {
  const l = title.toLowerCase();
  const b = BULL_KW.filter(k => l.includes(k)).length;
  const s = BEAR_KW.filter(k => l.includes(k)).length;
  return b > s ? 'bullish' : s > b ? 'bearish' : 'neutral';
}

async function classifyNewsWithGroq(items) {
  const SENT_MAP = { '利多': 'bullish', '利空': 'bearish', '中性': 'neutral' };
  const numbered = items.map((n, i) => `${i + 1}. ${n.title}`).join('\n');
  const prompt =
`你是專業金融新聞分類器。針對以下每條新聞標題，分配 tag 與 sentiment。
tag：從「營收財報、產業趨勢、主力動向、大盤宏觀、公司要聞、市場動態」選一個最適合的。
sentiment：從「利多、中性、利空」選一個。

只回傳 JSON 陣列（長度須等於標題條數），不得包含任何其他說明文字：
[{"tag":"...","sentiment":"..."},...]

新聞標題：
${numbered}`;

  const completion = await Promise.race([
    groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 512,
      stream: false,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Groq timeout')), 8000)),
  ]);

  const content = completion.choices[0]?.message?.content ?? '';
  const match   = content.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Groq returned no JSON array');
  const labels  = JSON.parse(match[0]);

  return items.map((n, i) => {
    const lbl = labels[i] ?? {};
    return {
      ...n,
      tag:       lbl.tag       ?? '市場動態',
      sentiment: lbl.sentiment ?? '中性',
      sent:      SENT_MAP[lbl.sentiment] ?? kwSentiment(n.title),
    };
  });
}

const TW_PUBLISHER_MAP = {
  'Yahoo Finance': 'Yahoo 台灣財經',
  'Reuters': '路透社',
  'Bloomberg': '彭博社',
  'CNBC': 'CNBC',
  'MarketWatch': 'MarketWatch',
  'Benzinga': 'Benzinga',
  'Seeking Alpha': 'Seeking Alpha',
  'The Motley Fool': 'The Motley Fool',
  'Investopedia': 'Investopedia',
  'Business Wire': 'Business Wire',
  'PR Newswire': 'PR Newswire',
};

function relTime(sec) {
  const h = Math.floor((Date.now() - sec * 1000) / 3.6e6);
  const d = Math.floor(h / 24);
  if (h < 1)  return '剛剛';
  if (h < 24) return `${h} 小時前`;
  if (d < 7)  return `${d} 天前`;
  return `${Math.floor(d / 7)} 週前`;
}

// News — market-aware search + Groq AI tag/sentiment classification, 15-min cache
app.get('/api/news/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const hit = newsCache.get(ticker);
  if (hit && Date.now() - hit.ts < NEWS_TTL) return res.json({ ...hit.data, cached: true });

  const info  = resolveInfo(ticker);
  const isTW  = info.market === 'TWSE' || info.market === 'TPEx';
  const yahoo = info.yahoo ?? ticker;

  // TW stocks: search by Chinese name + TW Accept-Language to surface local Chinese news
  // US stocks: search by Yahoo symbol for global English financial news
  const searchQuery   = isTW ? (info.name || ticker) : yahoo;
  const localFetchOpts = isTW
    ? { headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.5' } }
    : YF_FETCH_OPTS;

  try {
    const result = await yf.search(searchQuery, { newsCount: 8 }, { validateResult: false, fetchOptions: localFetchOpts });
    let news = (result.news ?? []).map(n => ({
      title: n.title,
      src:   TW_PUBLISHER_MAP[n.publisher] ?? n.publisher,
      time:  relTime(n.providerPublishTime),
      sent:  kwSentiment(n.title),
      ...(n.link ? { url: n.link } : {}),
    }));

    // Groq AI: enrich each item with tag (category) + sentiment (Chinese); overrides keyword sent
    if (news.length > 0) {
      try {
        news = await classifyNewsWithGroq(news);
        console.log(`[news] Groq classified ${news.length} items for ${ticker}`);
      } catch (e) {
        console.error('[news] Groq classification skipped:', e.message);
        // Fallback: derive Chinese sentiment from keyword-based sent
        news = news.map(n => ({
          ...n,
          tag:       '市場動態',
          sentiment: n.sent === 'bullish' ? '利多' : n.sent === 'bearish' ? '利空' : '中性',
        }));
      }
    }

    const data = { news, isDemo: false };
    newsCache.set(ticker, { data, ts: Date.now() });
    res.json(data);
  } catch {
    res.json({ news: [], isDemo: false });
  }
});

// TWSE MIS proxy (called by client if needed)
app.get('/api/twse-mis', async (req, res) => {
  const exCh = req.query.ex_ch;
  if (!exCh) return res.status(400).json({ error: 'Missing ex_ch' });
  try {
    const data = await fetchFromTWSEMIS(String(exCh));
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// AI Chat — streaming via SSE, uses Groq cloud model
app.post('/api/chat', async (req, res) => {
  const { messages, stockContext } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  // System prompt
  let system = `你是 FinPulse，一個精準的台灣股市分析 Agent，服務台灣與美國股市投資人。

你的能力：分析個股基本面、技術面與市場情緒；解釋財務指標；提供買進/持有/賣出建議；回答各種投資知識問題；解讀新聞對股價的影響。

回答規則：
- 用繁體中文回答
- 使用 **粗體** 標記重要數字、建議、和關鍵詞
- 給出明確建議，不要模糊帶過
- 若資料不足請說「資料不足，暫不給出明確建議」
- 不要說「我是 AI」，直接進入主題回答
- 嚴禁使用任何 emoji 符號，保持專業金融終端機的簡潔排版
- 結尾只加一句「投資有風險，請自行評估。」

目標價規則（每次分析個股時必須遵守）：
- 在回答的最開頭，以獨立一行標示：**[目標價] [幣別符號][數字]**
- 若工具回傳有「法人平均目標價」，直接使用該數字，例如：**[目標價] NT$185**
- 若工具回傳「無法人資料」，必須根據現價、52週高低點、今日漲跌趨勢自行推算短期合理目標價區間，並簡短說明推算理由，例如：**[目標價區間] NT$38–NT$45**（根據52週低點 NT$32 與近期反彈動能估算）
- 目標價這一項絕對不可省略或跳過

工具使用規則：
- 需要股價資料時，必須呼叫 get_stock_price 工具取得真實數據，不得使用記憶中的舊數據
- 收到工具回傳的真實數據後，請完全根據該數據進行分析，不得修改或捏造任何數字
- 這是一次性的 API 請求，你無法在回覆後再次執行工具，因此絕對不要在回覆中承諾「請稍候，我將即刻更新資料」或「我將進一步查看財報」
- 如果工具回傳資料有限，請就現有資料（現價、漲跌幅）進行客觀分析，不要捏造未取得的數據`;

  if (stockContext) {
    const { ticker, name, market, sym, price, pct, hi52, lo52, pe, eps, cap, beta, analysts, target, summary } = stockContext;
    const mktLabel = market === 'TWSE' ? '上市（台股）' : market === 'TPEx' ? '上櫃（台股）' : '美股';

    system += `\n\n## 當前股票即時數據\n`;
    system += `**${name}（${ticker}）** | ${mktLabel}\n`;
    system += `現價：${sym}${Number(price).toLocaleString()} | 今日：${pct >= 0 ? '+' : ''}${Number(pct).toFixed(2)}%\n`;
    if (hi52 > 0 && lo52 > 0) {
      system += `52週區間：${sym}${Number(lo52).toLocaleString()} – ${sym}${Number(hi52).toLocaleString()}\n`;
    }
    const parts = [];
    if (pe && pe !== 'N/A') parts.push(`本益比 ${pe}`);
    if (eps && eps !== 'N/A') parts.push(`EPS ${eps}`);
    if (cap && cap !== 'N/A') parts.push(`市值 ${cap}`);
    if (beta && beta !== 'N/A') parts.push(`Beta ${beta}`);
    if (parts.length) system += `基本面：${parts.join(' | ')}\n`;
    if (analysts && (analysts.buy + analysts.hold + analysts.sell > 0)) {
      system += `分析師：買進 ${analysts.buy} / 持有 ${analysts.hold} / 賣出 ${analysts.sell}\n`;
    }
    if (target && target.mid > 0) {
      system += `法人目標價：共識 ${sym}${Number(target.mid).toLocaleString()}（區間 ${sym}${Number(target.lo).toLocaleString()}–${sym}${Number(target.hi).toLocaleString()}）\n`;
    } else {
      system += `法人目標價：無資料（請依現價與52週區間自行推算短期合理目標價，必須在回答中給出具體數字）\n`;
    }
    if (summary) system += `公司簡介：${String(summary).slice(0, 300)}\n`;
    system += `\n請根據以上數據回答用戶的問題，並務必在回答最開頭以「[目標價] ${sym}XXX」格式標示目標價（不得使用 emoji）。`;
  }

  // Build message history — only keep user/assistant turns
  const valid = [];
  for (const m of messages.slice(-12)) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const role = m.role;
    if (valid.length === 0 && role !== 'user') continue;
    if (valid.length > 0 && valid[valid.length - 1].role === role) {
      valid[valid.length - 1].content += '\n\n' + String(m.content);
    } else {
      valid.push({ role, content: String(m.content) });
    }
  }

  if (valid.length === 0) return res.status(400).json({ error: 'no valid messages' });

  const tools = [{
    type: 'function',
    function: {
      name: 'get_stock_price',
      description: `查詢股票的即時股價、今日漲跌幅、52週高低點。支援台股與美股。
重要：如果是台灣股票，請務必先確認其正確的 4 位數台股代碼，再傳入 symbol 參數。
常見對照：台積電=2330、聯發科=2454、鴻海=2317、國巨=2327、廣達=2382、華碩=2357、聯電=2303、台達電=2308、南亞科=2408、中鋼=2002。
絕對不要自行捏造代碼（例如誤把國巨認為是 6287）。`,
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: '股票代碼。台股填 4 位數字如 2327（國巨）、2330（台積電）；美股填英文如 NVDA、AAPL。',
          },
        },
        required: ['symbol'],
      },
    },
  }];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const groqMessages = [{ role: 'system', content: system }, ...valid];

    // First pass: non-streaming to detect tool_calls
    const firstCompletion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: groqMessages,
      tools,
      stream: false,
    });

    const assistantMsg = firstCompletion.choices[0].message;

    if (assistantMsg.tool_calls?.length) {
      console.log(`[chat] tool_calls: ${assistantMsg.tool_calls.map(tc => tc.function?.name).join(', ')}`);

      const toolMessages = [];
      for (const tc of assistantMsg.tool_calls) {
        const fn = tc.function?.name;
        const args = JSON.parse(tc.function?.arguments ?? '{}');
        let resultContent = '查無結果';

        if (fn === 'get_stock_price') {
          const r = await getStockPrice(String(args.symbol ?? ''));
          if (r.ok) {
            const targetPart = r.targetPrice != null
              ? `，法人平均目標價 ${r.sym}${Number(r.targetPrice).toLocaleString()}`
              : `，目標價：無法人資料（請根據現價 ${r.sym}${r.price.toLocaleString()}、52週區間 ${r.sym}${r.lo52.toLocaleString()}–${r.sym}${r.hi52.toLocaleString()} 自行推算短期合理目標價區間，必須給出具體數字）`;
            resultContent = `${r.name}（${r.ticker}）現價 ${r.sym}${r.price.toLocaleString()}，今日 ${r.change >= 0 ? '+' : ''}${r.change}（${r.pct >= 0 ? '+' : ''}${r.pct}%），52週區間 ${r.sym}${r.lo52.toLocaleString()}–${r.sym}${r.hi52.toLocaleString()}${targetPart}`;
          } else {
            resultContent = `查詢失敗：${r.error}`;
          }
          console.log(`[chat] tool result [${args.symbol}]: ${resultContent}`);
        }

        toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: resultContent });
      }

      // Second pass: stream final answer with tool results injected
      const stream = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [...groqMessages, assistantMsg, ...toolMessages],
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    } else {
      // No tool calls — emit the already-received content as SSE chunks
      const content = assistantMsg.content ?? '';
      for (let i = 0; i < content.length; i += 4) {
        res.write(`data: ${JSON.stringify({ text: content.slice(i, i + 4) })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[chat] Groq error:', err.message);
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, cacheAgeMs: marketCache ? Date.now() - marketCacheTs : null });
});

// Serve built frontend in local production mode (not needed on Vercel — CDN handles it)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const dist = path.join(__dirname, '../dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Start local server; on Vercel the function runtime imports `app` directly
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`[market] proxy on http://localhost:${PORT}`));
}

export default app;
