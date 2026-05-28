import type { Stock } from '../types';
import { isTWMarket } from './market';
import { computeTechnicals } from './technicals';

export interface AnalysisResult {
  verdict: 'BUY' | 'HOLD' | 'SELL';
  conf: number;
  summary: string;
  signals: string[];
}

export function runAnalysis(stock: Stock): AnalysisResult {
  const tech = computeTechnicals(stock.history);
  const isTW = isTWMarket(stock.market);
  let score = 0;
  const signals: string[] = [];

  // RSI signal
  if (tech.rsi14 !== null) {
    if (tech.rsiSignal === 'oversold') {
      score += 2;
      signals.push(`RSI ${tech.rsi14.toFixed(0)} — 技術面超賣，存在反彈機會`);
    } else if (tech.rsiSignal === 'overbought') {
      score -= 2;
      signals.push(`RSI ${tech.rsi14.toFixed(0)} — 技術面超買，短期存在回調風險`);
    } else if (tech.rsi14 > 55) {
      score += 1;
      signals.push(`RSI ${tech.rsi14.toFixed(0)} — 動能偏多`);
    } else if (tech.rsi14 < 45) {
      score -= 1;
      signals.push(`RSI ${tech.rsi14.toFixed(0)} — 動能偏弱`);
    }
  }

  // Moving average signal
  if (tech.maSignal === 'above_all') {
    score += 2;
    signals.push('股價站上 SMA20 與 SMA50，上升趨勢確立');
  } else if (tech.maSignal === 'golden_cross') {
    score += 1;
    signals.push('SMA20 上穿 SMA50，短線趨勢轉多');
  } else if (tech.maSignal === 'death_cross') {
    score -= 1;
    signals.push('SMA20 下穿 SMA50，短線趨勢轉空');
  } else if (tech.maSignal === 'below_all') {
    score -= 2;
    signals.push('股價跌破 SMA20 與 SMA50，下跌趨勢確認');
  }

  // 30-day momentum
  if (tech.momentum30d !== null) {
    if (tech.momentum30d > 15) {
      score += 1;
      signals.push(`近月漲幅 ${tech.momentum30d.toFixed(1)}%，強勢上漲動能`);
    } else if (tech.momentum30d < -15) {
      score -= 1;
      signals.push(`近月跌幅 ${Math.abs(tech.momentum30d).toFixed(1)}%，弱勢下跌動能`);
    }
  }

  // PE valuation
  const peNum = parseFloat(stock.pe);
  if (!isNaN(peNum) && peNum > 0) {
    const highPE = isTW ? 30 : 60;
    const lowPE = isTW ? 12 : 18;
    if (peNum > highPE) {
      score -= 1;
      signals.push(`本益比 ${peNum.toFixed(0)} 倍，估值偏高需謹慎`);
    } else if (peNum < lowPE) {
      score += 1;
      signals.push(`本益比 ${peNum.toFixed(0)} 倍，估值具吸引力`);
    }
  }

  // Derive verdict and confidence from score
  let verdict: 'BUY' | 'HOLD' | 'SELL';
  let conf: number;

  if (score >= 4) { verdict = 'BUY';  conf = Math.min(92, 65 + score * 5); }
  else if (score >= 2) { verdict = 'BUY';  conf = Math.min(80, 58 + score * 5); }
  else if (score <= -4) { verdict = 'SELL'; conf = Math.min(92, 65 + Math.abs(score) * 5); }
  else if (score <= -2) { verdict = 'SELL'; conf = Math.min(80, 58 + Math.abs(score) * 5); }
  else { verdict = 'HOLD'; conf = 52 + Math.abs(score) * 3; }

  conf = Math.round(conf / 5) * 5;

  const verdictCn = verdict === 'BUY' ? '買進' : verdict === 'SELL' ? '賣出' : '持有';
  const topSignals = signals.slice(0, 2).join('；');
  const summary =
    `基於技術分析，${stock.name} 當前評級為【${verdictCn}】（信心 ${conf}%）。` +
    (topSignals ? `主要訊號：${topSignals}。` : '') +
    '\n\n⚠️ 本分析僅供參考，不構成投資建議。投資有風險，請自行評估。';

  return { verdict, conf, summary, signals };
}
