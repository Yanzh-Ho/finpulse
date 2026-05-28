import type { Candle } from '../types';

export interface TechnicalSignals {
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  currentPrice: number | null;
  trend: 'bullish' | 'bearish' | 'neutral';
  rsiSignal: 'overbought' | 'oversold' | 'neutral';
  maSignal: 'above_all' | 'golden_cross' | 'death_cross' | 'below_all' | 'neutral';
  momentum30d: number | null;
}

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const slice = closes.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeTechnicals(history: Candle[]): TechnicalSignals {
  const closes = history.map(c => c.c);
  const rsi14 = rsi(closes, 14);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const currentPrice = closes.length > 0 ? closes[closes.length - 1] : null;

  let rsiSignal: TechnicalSignals['rsiSignal'] = 'neutral';
  if (rsi14 !== null) {
    if (rsi14 > 70) rsiSignal = 'overbought';
    else if (rsi14 < 30) rsiSignal = 'oversold';
  }

  let maSignal: TechnicalSignals['maSignal'] = 'neutral';
  if (currentPrice !== null && sma20 !== null && sma50 !== null) {
    const goldenCross = sma20 > sma50;
    if (goldenCross && currentPrice > sma20) maSignal = 'above_all';
    else if (!goldenCross && currentPrice < sma20) maSignal = 'below_all';
    else if (goldenCross) maSignal = 'golden_cross';
    else maSignal = 'death_cross';
  }

  let momentum30d: number | null = null;
  if (closes.length >= 21) {
    const prev = closes[closes.length - 22];
    const curr = closes[closes.length - 1];
    momentum30d = ((curr - prev) / prev) * 100;
  }

  let bullish = 0, bearish = 0;
  if (rsiSignal === 'oversold') bullish++;
  if (rsiSignal === 'overbought') bearish++;
  if (maSignal === 'above_all' || maSignal === 'golden_cross') bullish++;
  if (maSignal === 'below_all' || maSignal === 'death_cross') bearish++;
  if (momentum30d !== null && momentum30d > 5) bullish++;
  if (momentum30d !== null && momentum30d < -5) bearish++;

  const trend: TechnicalSignals['trend'] =
    bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral';

  return { rsi14, sma20, sma50, sma200, currentPrice, trend, rsiSignal, maSignal, momentum30d };
}
