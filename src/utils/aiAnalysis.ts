import type { Stock, NewsItem } from '../types';
import { isTWMarket } from './market';
import { computeTechnicals } from './technicals';
import { runAnalysis } from './analysis';

// ─── Real-data context ─────────────────────────────────────────────────────
// Pass this from components that have fetched real fundamentals/news so the
// analysis text reflects actual data rather than default empty values.

export interface AnalysisRealData {
  analysts?: { buy: number; hold: number; sell: number } | null;
  target?:   { lo: number; mid: number; hi: number } | null;
  news?:     NewsItem[];
  summary?:  string | null;
}

// ─── Internal types ────────────────────────────────────────────────────────

type Verdict = 'BUY' | 'HOLD' | 'SELL';

interface VolInfo {
  stdDev: number;
  level: 'low' | 'moderate' | 'high' | 'extreme';
}

interface RangePos {
  pct: number;
  label: 'near_high' | 'upper' | 'middle' | 'lower' | 'near_low';
}

interface SentInfo {
  score: number;
  label: 'bullish' | 'neutral' | 'bearish';
  newsCount: number;
  bullishCount: number;
  bearishCount: number;
}

interface AnalystRec {
  total: number;
  buyCount: number;
  holdCount: number;
  sellCount: number;
  buyPct: number;
  sellPct: number;
  consensus: 'bullish' | 'mixed' | 'bearish' | 'none';
}

// ─── Signal calculations ───────────────────────────────────────────────────

function calcVol(history: Stock['history']): VolInfo {
  const closes = history.map((c) => c.c);
  if (closes.length < 10) return { stdDev: 0, level: 'low' };
  const n = Math.min(closes.length - 1, 20);
  const start = closes.length - n;
  const rets: number[] = [];
  for (let i = start; i < closes.length; i++) {
    rets.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const level: VolInfo['level'] =
    stdDev < 1.5 ? 'low' : stdDev < 3 ? 'moderate' : stdDev < 5 ? 'high' : 'extreme';
  return { stdDev, level };
}

function calcRange(price: number, hi52: number, lo52: number): RangePos {
  if (!hi52 || !lo52 || hi52 <= lo52) return { pct: 50, label: 'middle' };
  const pct = ((price - lo52) / (hi52 - lo52)) * 100;
  const label: RangePos['label'] =
    pct >= 85 ? 'near_high'
    : pct >= 65 ? 'upper'
    : pct >= 35 ? 'middle'
    : pct >= 15 ? 'lower'
    : 'near_low';
  return { pct, label };
}

// Sentiment computed purely from real news sentiment tags — no fake scores
function calcSent(news: NewsItem[]): SentInfo {
  const bullishCount = news.filter((n) => n.sent === 'bullish').length;
  const bearishCount = news.filter((n) => n.sent === 'bearish').length;
  const score = news.length > 0
    ? Math.round(50 + ((bullishCount - bearishCount) / news.length) * 35)
    : 50;
  const label: SentInfo['label'] = score >= 62 ? 'bullish' : score <= 38 ? 'bearish' : 'neutral';
  return { score, label, newsCount: news.length, bullishCount, bearishCount };
}

function calcAnalysts(a: { buy: number; hold: number; sell: number }): AnalystRec {
  const total = (a?.buy ?? 0) + (a?.hold ?? 0) + (a?.sell ?? 0);
  if (!total) return { total: 0, buyCount: 0, holdCount: 0, sellCount: 0, buyPct: 0, sellPct: 0, consensus: 'none' };
  const buyCount  = a.buy  ?? 0;
  const holdCount = a.hold ?? 0;
  const sellCount = a.sell ?? 0;
  const buyPct  = (buyCount  / total) * 100;
  const sellPct = (sellCount / total) * 100;
  const consensus: AnalystRec['consensus'] =
    buyPct >= 60 ? 'bullish' : sellPct >= 40 ? 'bearish' : 'mixed';
  return { total, buyCount, holdCount, sellCount, buyPct, sellPct, consensus };
}

// ─── Confidence scoring ────────────────────────────────────────────────────

function buildConf(
  base: number,
  verdict: Verdict,
  histLen: number,
  vol: VolInfo,
  sent: SentInfo,
  analyst: AnalystRec,
  hasFundamentals: boolean,
): number {
  let c = base;

  if (sent.newsCount > 0) {
    const aligned  = (verdict === 'BUY'  && sent.label === 'bullish') ||
                     (verdict === 'SELL' && sent.label === 'bearish');
    const conflict = (verdict === 'BUY'  && sent.label === 'bearish') ||
                     (verdict === 'SELL' && sent.label === 'bullish');
    c += aligned ? 5 : conflict ? -8 : 0;
  }

  if (analyst.total > 0) {
    const aligned  = (verdict === 'BUY'  && analyst.consensus === 'bullish') ||
                     (verdict === 'SELL' && analyst.consensus === 'bearish');
    const conflict = (verdict === 'BUY'  && analyst.consensus === 'bearish') ||
                     (verdict === 'SELL' && analyst.consensus === 'bullish');
    c += aligned ? 5 : conflict ? -8 : 0;
  }

  if (vol.level === 'extreme') c -= 10;
  else if (vol.level === 'high') c -= 5;

  if (histLen < 20) c = Math.min(c, 50);
  else if (histLen < 50) c = Math.min(c, 72);
  if (!hasFundamentals && analyst.total === 0 && sent.newsCount === 0) c = Math.min(c, 65);

  return Math.min(90, Math.max(30, Math.round(c / 5) * 5));
}

// ─── Section builders ──────────────────────────────────────────────────────

function priceLine(stock: Stock): string {
  const { pct, price, sym } = stock;
  const abs = Math.abs(pct);
  const dir =
    pct <= -5  ? `大幅重挫 ${abs.toFixed(2)}%，賣壓沉重`
    : pct <= -3 ? `明顯下跌 ${abs.toFixed(2)}%，空方佔優`
    : pct <= -1 ? `小幅回落 ${abs.toFixed(2)}%，市場觀望情緒升溫`
    : pct <  1  ? '橫盤整理，市場情緒謹慎'
    : pct <  3  ? `小幅走強 ${abs.toFixed(2)}%，買氣溫和`
    : pct <  5  ? `明顯上漲 ${abs.toFixed(2)}%，多方持續發力`
    :             `強勢大漲 ${abs.toFixed(2)}%，市場買氣積極`;
  return `今日${dir}，目前報 ${sym}${price.toLocaleString()}。`;
}

function technicalLines(
  _stock: Stock,
  tech: ReturnType<typeof computeTechnicals>,
): string[] {
  const out: string[] = ['**技術展望**'];

  if (tech.rsi14 !== null) {
    const r = tech.rsi14;
    const rsiDesc =
      r > 78 ? `RSI(14) 高達 ${r.toFixed(0)}，技術面明顯超買，短期回調壓力不容忽視`
      : r > 68 ? `RSI(14) 為 ${r.toFixed(0)}，動能偏強，但需留意超買跡象`
      : r > 55 ? `RSI(14) 為 ${r.toFixed(0)}，動能健康偏多`
      : r > 45 ? `RSI(14) 為 ${r.toFixed(0)}，動能中性`
      : r > 35 ? `RSI(14) 為 ${r.toFixed(0)}，動能偏弱，買盤尚未回溫`
      : r > 25 ? `RSI(14) 低至 ${r.toFixed(0)}，進入超賣區間，技術性反彈機率提升`
      :          `RSI(14) 僅 ${r.toFixed(0)}，嚴重超賣，短線存在強力反彈機會`;
    out.push(rsiDesc + '。');
  }

  if (tech.maSignal !== 'neutral') {
    const maDesc =
      tech.maSignal === 'above_all'    ? '均線多頭排列：股價站上 SMA20 與 SMA50，中期上升趨勢確立'
      : tech.maSignal === 'golden_cross' ? 'SMA20 近期上穿 SMA50，黃金交叉形成，短線趨勢轉多'
      : tech.maSignal === 'death_cross'  ? 'SMA20 跌破 SMA50，死亡交叉出現，短線趨勢偏空'
      :                                    '股價跌破 SMA20 與 SMA50，均線空頭排列，下跌趨勢未見止穩';
    out.push(maDesc + '。');
  }

  if (tech.sma200 !== null && tech.currentPrice !== null) {
    const pctFrom200 = (((tech.currentPrice - tech.sma200) / tech.sma200) * 100).toFixed(1);
    const above = tech.currentPrice > tech.sma200;
    out.push(
      above
        ? `長線趨勢偏多：股價高於 200 日均線 ${pctFrom200}%，結構性多頭格局維持。`
        : `長線結構偏空：股價低於 200 日均線 ${Math.abs(+pctFrom200)}%，長線趨勢尚待修復。`
    );
  }

  if (tech.momentum30d !== null) {
    const m = tech.momentum30d;
    if (Math.abs(m) > 5) {
      const momDesc =
        m > 30  ? `近一個月大漲 ${m.toFixed(1)}%，強勢動能延續，但需警惕獲利了結賣壓`
        : m > 15 ? `近一個月累計漲幅 ${m.toFixed(1)}%，上漲動能明顯`
        : m > 5  ? `近一個月小漲 ${m.toFixed(1)}%，動能溫和偏多`
        : m < -30 ? `近一個月大跌 ${Math.abs(m).toFixed(1)}%，空方動能強勁，企穩訊號未出現`
        : m < -15 ? `近一個月下跌 ${Math.abs(m).toFixed(1)}%，跌勢延續`
        :           `近一個月下跌 ${Math.abs(m).toFixed(1)}%，短線偏弱`;
      out.push(momDesc + '。');
    }
  }

  if (out.length === 1) {
    out.push('歷史K線數據不足，技術指標無法有效計算。');
  }

  return out;
}

function sentimentLines(sent: SentInfo, analyst: AnalystRec): string[] {
  const out: string[] = ['**市場情緒**'];

  if (sent.newsCount === 0 && analyst.total === 0) {
    out.push('新聞情緒與分析師評級資料尚未取得，市場情緒面目前無法評估。');
    return out;
  }

  if (sent.newsCount > 0) {
    const sentDesc =
      sent.label === 'bullish'
        ? `近期 ${sent.newsCount} 則相關報導整體偏多（${sent.bullishCount} 則看好 / ${sent.bearishCount} 則看空），市場輿論氛圍積極`
        : sent.label === 'bearish'
        ? `近期 ${sent.newsCount} 則相關報導偏空（${sent.bullishCount} 則看好 / ${sent.bearishCount} 則看空），市場情緒趨於保守`
        : `近期 ${sent.newsCount} 則相關報導，多空情緒相對均衡`;
    out.push(sentDesc + '。');
  }

  if (analyst.total > 0) {
    const consDesc =
      analyst.consensus === 'bullish'
        ? `${analyst.total} 位分析師中 ${analyst.buyCount} 位建議買進（${analyst.buyPct.toFixed(0)}%），市場評級偏多`
        : analyst.consensus === 'bearish'
        ? `${analyst.total} 位分析師中 ${analyst.sellCount} 位建議賣出（${analyst.sellPct.toFixed(0)}%），整體評級偏空`
        : `${analyst.total} 位分析師評級分歧：買進 ${analyst.buyCount} / 持有 ${analyst.holdCount} / 賣出 ${analyst.sellCount}`;
    out.push(consDesc + '。');
  }

  return out;
}

function riskLines(
  stock: Stock,
  vol: VolInfo,
  range: RangePos,
  verdict: Verdict,
  tech: ReturnType<typeof computeTechnicals>,
  peStr: string,
): string[] {
  const out: string[] = ['**風險評估**'];
  const isTW = isTWMarket(stock.market);

  if (vol.stdDev > 0) {
    const volDesc =
      vol.level === 'extreme'
        ? `近 20 日日均波動率高達 ${vol.stdDev.toFixed(1)}%，屬極高波動股，須嚴格控管倉位`
        : vol.level === 'high'
        ? `近 20 日日均波動率約 ${vol.stdDev.toFixed(1)}%，波動偏高，進出場時機需謹慎`
        : vol.level === 'moderate'
        ? `近 20 日日均波動率約 ${vol.stdDev.toFixed(1)}%，波動屬正常水準`
        : `近 20 日日均波動率約 ${vol.stdDev.toFixed(1)}%，股性穩定`;
    out.push(volDesc + '。');
  }

  if (stock.hi52 > 0 && stock.lo52 > 0) {
    const posDesc =
      range.label === 'near_high'
        ? `目前股價位於 52 週高點附近（年度區間 ${range.pct.toFixed(0)}% 分位），追高需承擔較大回調風險`
        : range.label === 'upper'
        ? `股價位於年度區間偏高位置（${range.pct.toFixed(0)}% 分位），需留意獲利了結賣壓`
        : range.label === 'near_low'
        ? `股價接近 52 週低點（年度區間 ${range.pct.toFixed(0)}% 分位），趨勢未見反轉前仍有下行空間`
        : range.label === 'lower'
        ? `股價位於年度區間低位（${range.pct.toFixed(0)}% 分位），技術底部有待確認`
        : `股價位於年度區間中段（${range.pct.toFixed(0)}% 分位），上下空間相對均衡`;
    out.push(posDesc + '。');
  }

  const peNum = parseFloat(peStr);
  if (!isNaN(peNum) && peNum > 0) {
    const highPE = isTW ? 30 : 60;
    const lowPE  = isTW ? 10 : 15;
    if (peNum > highPE) {
      out.push(`本益比 ${peNum.toFixed(0)} 倍偏高，估值已充分反映成長預期，若業績低於市場預期，股價修正幅度可能較大。`);
    } else if (peNum < lowPE) {
      out.push(`本益比 ${peNum.toFixed(0)} 倍相對低估，估值具有安全邊際。`);
    }
  }

  const betaNum = parseFloat(stock.beta);
  if (!isNaN(betaNum) && betaNum > 0) {
    if (betaNum > 1.5) {
      out.push(`Beta ${betaNum.toFixed(2)}：相對大盤波動幅度顯著偏高，市場系統性下跌時跌幅可能更大。`);
    } else if (betaNum < 0.6) {
      out.push(`Beta ${betaNum.toFixed(2)}：相對大盤波動低，防禦性較強，適合保守型投資人。`);
    }
  }

  if (verdict === 'BUY' && tech.rsiSignal === 'overbought') {
    out.push('⚠️ 訊號衝突：均線偏多但 RSI 進入超買，操作宜保守，建議等待 RSI 回落後再佈局。');
  } else if (verdict === 'SELL' && tech.rsiSignal === 'oversold') {
    out.push('⚠️ 訊號衝突：均線偏空但 RSI 已超賣，短線存在技術性反彈可能。');
  }

  if (out.length === 1) {
    out.push('缺乏足夠數據進行完整風險評估，建議結合市場整體環境自行判斷。');
  }

  return out;
}

function shortTermLines(
  stock: Stock,
  tech: ReturnType<typeof computeTechnicals>,
  verdict: Verdict,
  range: RangePos,
): string[] {
  const out: string[] = ['**短線展望**'];
  let desc: string;

  if (verdict === 'BUY' && tech.maSignal === 'above_all') {
    desc = `均線多頭排列支撐偏強，若成交量配合，${stock.name} 短線仍偏向上。建議以 SMA20 為支撐參考，跌破前維持多方操作。`;
  } else if (verdict === 'BUY' && tech.rsiSignal === 'oversold') {
    desc = `RSI 超賣訊號顯示短線跌幅過深，關注是否出現價量背離或 K 線止跌訊號，可小量佈局，嚴設止損。`;
  } else if (verdict === 'BUY' && tech.maSignal === 'golden_cross') {
    desc = `黃金交叉形成，短線趨勢剛轉多，可逢拉回至 SMA20 附近佈局，等待趨勢進一步確認。`;
  } else if (verdict === 'SELL' && tech.maSignal === 'below_all') {
    desc = `均線空頭排列確認，短線反彈力道有限，逢高應減持，以 SMA20 為壓力參考。`;
  } else if (verdict === 'SELL' && tech.rsiSignal === 'overbought') {
    desc = `RSI 超買區間，短線存在較大獲利了結壓力，建議降低曝險，待 RSI 冷卻後再評估。`;
  } else if (verdict === 'SELL') {
    desc = `技術面偏空，短線應避免追價，等待明確底部形成再考慮進場。`;
  } else if (range.label === 'near_high') {
    desc = `股價接近年度高點，短線壓力區明顯，建議觀望，等待突破或回檔再行動。`;
  } else if (range.label === 'near_low') {
    desc = `股價接近年度低位，短線反彈機率有所提升，但趨勢未明前建議輕倉試單。`;
  } else {
    desc = `短線方向尚不明確，建議觀望，待技術面出現更清晰訊號後再行動。`;
  }

  out.push(desc);
  return out;
}

function longTermLines(
  stock: Stock,
  tech: ReturnType<typeof computeTechnicals>,
  verdict: Verdict,
  target: { lo: number; mid: number; hi: number },
  summaryText: string,
): string[] {
  const out: string[] = ['**中長線觀點**'];
  const parts: string[] = [];

  if (tech.sma200 !== null && tech.currentPrice !== null) {
    parts.push(
      tech.currentPrice > tech.sma200
        ? '長線趨勢結構偏多（高於 200 日均線），中期上升通道維持'
        : '長線結構待修復（低於 200 日均線），需確認能否重站均線'
    );
  }

  const hasRealTarget =
    target?.mid > 0 &&
    stock.price > 0 &&
    Math.abs(target.mid - stock.price) / stock.price > 0.02;

  if (hasRealTarget) {
    const upside = ((target.mid - stock.price) / stock.price) * 100;
    parts.push(
      upside > 0
        ? `分析師共識目標價 ${stock.sym}${target.mid.toLocaleString()}，較現價潛在上漲 +${upside.toFixed(1)}%`
        : `分析師共識目標價 ${stock.sym}${target.mid.toLocaleString()}，較現價下方 ${Math.abs(upside).toFixed(1)}%`
    );
  }

  if (summaryText && summaryText.length > 0) {
    parts.push(summaryText.slice(0, 120));
  }

  if (parts.length === 0) {
    const fallback =
      verdict === 'BUY'
        ? '目前僅有技術面訊號支持，基本面資料待補充後可提升長線分析可信度。'
        : verdict === 'SELL'
        ? '短線賣出訊號為主，長線方向需等待更多數據佐證。'
        : '基本面與長線數據不足，中長線評估信心偏低，建議持續觀察。';
    out.push(fallback);
    return out;
  }

  out.push(parts.join('；') + '。');
  return out;
}

function dataLimitNote(histLen: number, hasFundamentals: boolean, hasAnalysts: boolean, hasNews: boolean): string | null {
  const items: string[] = [];
  if (histLen < 20) items.push('歷史K線不足（技術指標無法計算）');
  if (!hasFundamentals) items.push('基本面數據（PE、目標價）尚未取得');
  if (!hasAnalysts) items.push('分析師評級尚未取得');
  if (!hasNews) items.push('新聞資料尚未取得');
  if (items.length === 0) return null;
  return `⚪ 資料限制：${items.join('；')}，信心指數已受限調整。`;
}

// ─── Main export ───────────────────────────────────────────────────────────

export function generateAnalysisText(stock: Stock, real?: AnalysisRealData): string {
  // Resolve which data source to use — real API data takes priority over stock defaults
  const newsItems   = (real?.news?.length ?? 0) > 0 ? real!.news! : stock.news;
  const analystData = real?.analysts ?? stock.analysts;
  const targetData  = real?.target  ?? stock.target;
  const summaryText = real?.summary || stock.summary;
  // PE comes from stock.pe — it's set by useFundamentals via the Analysis panel;
  // for Chat context it may still be 'N/A' if fundamentals haven't loaded.
  const peStr = stock.pe;

  const isTW = isTWMarket(stock.market);
  const marketCN =
    stock.market === 'TPEx' ? '上櫃'
    : stock.market === 'Emerging' ? '興櫃'
    : stock.market === 'InnovationBoard' ? '創新板'
    : stock.market === 'TWSE' ? '上市'
    : '美股';

  const hasHistory      = stock.history.length >= 20;
  const hasPE           = !isNaN(parseFloat(peStr)) && parseFloat(peStr) > 0;
  const hasRealTarget   = (targetData?.mid ?? 0) > 0 && stock.price > 0 &&
    Math.abs((targetData?.mid ?? 0) - stock.price) / stock.price > 0.02;
  const hasAnalysts     = ((analystData?.buy ?? 0) + (analystData?.hold ?? 0) + (analystData?.sell ?? 0)) > 0;
  const hasFundamentals = hasPE || hasRealTarget || hasAnalysts;

  // If no data at all, return minimal response instead of fabricating analysis
  if (!hasHistory && stock.price === 0) {
    return [
      `**${stock.name}（${stock.ticker}）— 資料尚未取得**`,
      '',
      '價格與歷史資料尚未載入完成，無法進行技術面分析。請稍後再試，或確認股票代碼是否正確。',
      '',
      '⚠️ 本分析僅供參考，不構成投資建議。',
    ].join('\n');
  }

  // Compute signals from real data
  const tech     = computeTechnicals(stock.history);
  const vol      = calcVol(stock.history);
  const range    = calcRange(stock.price, stock.hi52, stock.lo52);
  const sent     = calcSent(newsItems);
  const analyst  = calcAnalysts(analystData ?? { buy: 0, hold: 0, sell: 0 });

  // Verdict + base confidence from technical scoring
  let verdict: Verdict = 'HOLD';
  let baseConf = 50;
  if (hasHistory) {
    try {
      const r = runAnalysis(stock);
      verdict  = r.verdict;
      baseConf = r.conf;
    } catch {}
  }

  const conf = buildConf(baseConf, verdict, stock.history.length, vol, sent, analyst, hasFundamentals);
  const verdictCN = verdict === 'BUY' ? '買進' : verdict === 'SELL' ? '賣出' : '持有';

  const L: string[] = [];

  L.push(`**${stock.name}（${stock.ticker}${isTW ? '.TW' : ''}）— ${verdictCN} · 信心指數 ${conf}%**`);
  L.push('');

  if (stock.price > 0) {
    L.push(priceLine(stock));
    const sectorPart = stock.sector && stock.sector !== 'N/A' ? `　產業：${stock.sector}` : '';
    const rangePart  = stock.hi52 > 0 && stock.lo52 > 0
      ? `　52週區間：${stock.sym}${stock.lo52.toLocaleString()}–${stock.sym}${stock.hi52.toLocaleString()}`
      : '';
    L.push(`市場：${marketCN}${sectorPart}${rangePart}`);
    L.push('');
  }

  if (hasHistory) {
    L.push(...technicalLines(stock, tech));
    L.push('');
  }

  L.push(...sentimentLines(sent, analyst));
  L.push('');

  L.push(...riskLines(stock, vol, range, verdict, tech, peStr));
  L.push('');

  if (hasHistory || stock.price > 0) {
    L.push(...shortTermLines(stock, tech, verdict, range));
    L.push('');
  }

  if (hasHistory || hasFundamentals || summaryText) {
    L.push(...longTermLines(stock, tech, verdict, targetData, summaryText));
    L.push('');
  }

  const dataNote = dataLimitNote(stock.history.length, hasFundamentals, hasAnalysts, sent.newsCount > 0);
  if (dataNote) {
    L.push(dataNote);
    L.push('');
  }

  // Final recommendation
  const topSig = hasHistory
    ? (() => { try { return runAnalysis(stock).signals[0]; } catch { return ''; } })()
    : '';
  const sentReason =
    sent.newsCount > 0 && sent.label !== 'neutral'
      ? sent.label === 'bullish' ? '新聞情緒偏多' : '新聞情緒偏空'
      : '';
  const reasons = [topSig, sentReason].filter(Boolean);
  const reasonStr = reasons.length > 0 ? `（${reasons.slice(0, 2).join('、')}）` : '';

  // Soften recommendation when evidence is weak
  const insufficientData = !hasHistory && !hasFundamentals && analyst.total === 0;
  if (insufficientData) {
    L.push(`資料不足，暫不給出明確建議。目前${sent.newsCount > 0 ? '僅有新聞情緒資料' : '缺乏有效資料'}，信心指數 ${conf}%，建議待更多數據確認後再決策。`);
  } else {
    const recMap: Record<Verdict, string> = {
      BUY:  `建議**買進** ${stock.name}${reasonStr}，信心指數 ${conf}%，可分批佈局。`,
      HOLD: `建議**持有** ${stock.name}${reasonStr}，等待更明確訊號後再決策，信心指數 ${conf}%。`,
      SELL: `建議**賣出**或減持 ${stock.name}${reasonStr}，留意下檔支撐位，信心指數 ${conf}%。`,
    };
    L.push(recMap[verdict]);
  }

  L.push('');
  L.push('⚠️ 本分析僅供參考，不構成投資建議。投資有風險，請自行評估。');

  return L.join('\n');
}
