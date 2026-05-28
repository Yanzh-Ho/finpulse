export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface NewsItem {
  title: string;
  src: string;
  time: string;
  sent: 'bullish' | 'bearish' | 'neutral';
  url?: string;
}

export type Market = 'US' | 'TWSE' | 'TPEx' | 'Emerging' | 'InnovationBoard';

export interface Stock {
  ticker: string;
  name: string;
  fullName: string;
  market: Market;
  currency: 'TWD' | 'USD';
  sym: string;
  price: number;
  change: number;
  pct: number;
  cap: string;
  pe: string;
  eps: string;
  beta: string;
  vol: string;
  avgVol: string;
  hi52: number;
  lo52: number;
  div: string;
  sector: string;
  verdict: 'BUY' | 'HOLD' | 'SELL';
  conf: number;
  target: { lo: number; mid: number; hi: number };
  risks: string[];
  sentimentScore: number;
  sentimentLabel: string;
  analysts: { buy: number; hold: number; sell: number };
  summary: string;
  tags: string[];
  news: NewsItem[];
  history: Candle[];
  limitedData?: boolean;
}

export type ViewId = 'chat' | 'portfolio' | 'watchlist' | 'news' | 'settings';

export interface PortfolioHolding {
  ticker: string;
  shares: number;
  avgCost: number;
}
