import type { Market, Stock } from '../types';

// Identity-only definitions — all financial metrics come from real APIs at runtime.
// No fake prices, PE, analysts, news, sentiment, or target prices.
type StockDef = {
  ticker: string;
  name: string;
  fullName: string;
  market: Market;
  currency: 'TWD' | 'USD';
  sym: string;
  sector: string;
};

const STOCK_DEFS: StockDef[] = [
  { ticker: '2330', name: '台積電',    fullName: '台灣積體電路製造股份有限公司',        market: 'TWSE', currency: 'TWD', sym: 'NT$', sector: '半導體' },
  { ticker: '2454', name: '聯發科',    fullName: '聯發科技股份有限公司',                market: 'TWSE', currency: 'TWD', sym: 'NT$', sector: 'IC 設計' },
  { ticker: '2317', name: '鴻海',      fullName: '鴻海精密工業股份有限公司',            market: 'TWSE', currency: 'TWD', sym: 'NT$', sector: '電子代工' },
  { ticker: '2412', name: '中華電',    fullName: '中華電信股份有限公司',                market: 'TWSE', currency: 'TWD', sym: 'NT$', sector: '電信' },
  { ticker: '2882', name: '國泰金',    fullName: '國泰金融控股股份有限公司',            market: 'TWSE', currency: 'TWD', sym: 'NT$', sector: '金融' },
  { ticker: 'TSM',  name: '台積電 ADR', fullName: 'Taiwan Semiconductor Mfg. Co. (ADR)', market: 'US',   currency: 'USD', sym: '$',   sector: '半導體' },
  { ticker: 'TSLA', name: '特斯拉',    fullName: 'Tesla, Inc.',                         market: 'US',   currency: 'USD', sym: '$',   sector: '非必需消費品' },
  { ticker: 'NVDA', name: '輝達',      fullName: 'NVIDIA Corporation',                  market: 'US',   currency: 'USD', sym: '$',   sector: '半導體' },
  { ticker: 'AAPL', name: '蘋果',      fullName: 'Apple Inc.',                          market: 'US',   currency: 'USD', sym: '$',   sector: '科技' },
  { ticker: 'MSFT', name: '微軟',      fullName: 'Microsoft Corporation',               market: 'US',   currency: 'USD', sym: '$',   sector: '科技' },
];

function makeBlank(def: StockDef): Stock {
  return {
    ticker: def.ticker,
    name: def.name,
    fullName: def.fullName,
    market: def.market,
    currency: def.currency,
    sym: def.sym,
    sector: def.sector,
    price: 0, change: 0, pct: 0,
    hi52: 0, lo52: 0,
    history: [],
    cap: 'N/A', pe: 'N/A', eps: 'N/A', beta: 'N/A',
    vol: 'N/A', avgVol: 'N/A', div: '—',
    verdict: 'HOLD', conf: 50,
    target: { lo: 0, mid: 0, hi: 0 },
    risks: [],
    sentimentScore: 50, sentimentLabel: '—',
    analysts: { buy: 0, hold: 0, sell: 0 },
    summary: '', tags: [], news: [],
    limitedData: false,
  };
}

export const STOCKS: Record<string, Stock> = {};
STOCK_DEFS.forEach(def => { STOCKS[def.ticker] = makeBlank(def); });

export const WATCHLIST = ['2330', '2454', '2317', '2412', 'TSM', 'NVDA', 'AAPL', 'TSLA'];
