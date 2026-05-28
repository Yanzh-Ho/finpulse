import type { Market } from '../utils/market';

export interface StockInfo {
  ticker: string;
  name: string;       // short / Chinese name
  fullName: string;
  market: Market;
  yahooSymbol: string;
  twseMisSymbol?: string; // "tse_2330.tw" or "otc_6488.tw"
}

export const STOCK_UNIVERSE: StockInfo[] = [
  // ── US ──────────────────────────────────────────────────────────────────────
  { ticker: 'AAPL',  name: '蘋果',          fullName: 'Apple Inc.',                        market: 'US', yahooSymbol: 'AAPL' },
  { ticker: 'MSFT',  name: '微軟',          fullName: 'Microsoft Corporation',             market: 'US', yahooSymbol: 'MSFT' },
  { ticker: 'NVDA',  name: '輝達',          fullName: 'NVIDIA Corporation',               market: 'US', yahooSymbol: 'NVDA' },
  { ticker: 'TSLA',  name: '特斯拉',        fullName: 'Tesla, Inc.',                      market: 'US', yahooSymbol: 'TSLA' },
  { ticker: 'TSM',   name: '台積電 ADR',    fullName: 'Taiwan Semiconductor Mfg. (ADR)',  market: 'US', yahooSymbol: 'TSM' },
  { ticker: 'AMZN',  name: 'Amazon',        fullName: 'Amazon.com, Inc.',                 market: 'US', yahooSymbol: 'AMZN' },
  { ticker: 'META',  name: 'Meta',          fullName: 'Meta Platforms, Inc.',             market: 'US', yahooSymbol: 'META' },
  { ticker: 'GOOG',  name: 'Alphabet',      fullName: 'Alphabet Inc. (Class C)',          market: 'US', yahooSymbol: 'GOOG' },
  { ticker: 'GOOGL', name: 'Alphabet',      fullName: 'Alphabet Inc. (Class A)',          market: 'US', yahooSymbol: 'GOOGL' },
  { ticker: 'AMD',   name: 'AMD',           fullName: 'Advanced Micro Devices, Inc.',     market: 'US', yahooSymbol: 'AMD' },
  { ticker: 'MU',    name: 'Micron',        fullName: 'Micron Technology, Inc.',          market: 'US', yahooSymbol: 'MU' },
  { ticker: 'AVGO',  name: 'Broadcom',      fullName: 'Broadcom Inc.',                    market: 'US', yahooSymbol: 'AVGO' },
  { ticker: 'QCOM',  name: 'Qualcomm',      fullName: 'Qualcomm Inc.',                    market: 'US', yahooSymbol: 'QCOM' },
  { ticker: 'INTC',  name: 'Intel',         fullName: 'Intel Corporation',                market: 'US', yahooSymbol: 'INTC' },
  { ticker: 'ARM',   name: 'Arm Holdings',  fullName: 'Arm Holdings plc',                 market: 'US', yahooSymbol: 'ARM' },
  { ticker: 'AMAT',  name: 'Applied Matl.', fullName: 'Applied Materials, Inc.',          market: 'US', yahooSymbol: 'AMAT' },
  { ticker: 'LRCX',  name: 'Lam Research',  fullName: 'Lam Research Corporation',         market: 'US', yahooSymbol: 'LRCX' },
  { ticker: 'KLAC',  name: 'KLA',           fullName: 'KLA Corporation',                  market: 'US', yahooSymbol: 'KLAC' },
  { ticker: 'ASML',  name: 'ASML',          fullName: 'ASML Holding N.V.',                market: 'US', yahooSymbol: 'ASML' },
  { ticker: 'TXN',   name: 'Texas Instr.',  fullName: 'Texas Instruments Inc.',           market: 'US', yahooSymbol: 'TXN' },
  { ticker: 'MRVL',  name: 'Marvell',       fullName: 'Marvell Technology Group',         market: 'US', yahooSymbol: 'MRVL' },
  { ticker: 'ON',    name: 'onsemi',        fullName: 'onsemi (ON Semiconductor)',         market: 'US', yahooSymbol: 'ON' },
  { ticker: 'ADI',   name: 'Analog Devices',fullName: 'Analog Devices, Inc.',             market: 'US', yahooSymbol: 'ADI' },
  { ticker: 'NFLX',  name: 'Netflix',       fullName: 'Netflix, Inc.',                    market: 'US', yahooSymbol: 'NFLX' },
  { ticker: 'ADBE',  name: 'Adobe',         fullName: 'Adobe Inc.',                       market: 'US', yahooSymbol: 'ADBE' },
  { ticker: 'CRM',   name: 'Salesforce',    fullName: 'Salesforce, Inc.',                 market: 'US', yahooSymbol: 'CRM' },
  { ticker: 'ORCL',  name: 'Oracle',        fullName: 'Oracle Corporation',               market: 'US', yahooSymbol: 'ORCL' },
  { ticker: 'IBM',   name: 'IBM',           fullName: 'International Business Machines',  market: 'US', yahooSymbol: 'IBM' },
  { ticker: 'SHOP',  name: 'Shopify',       fullName: 'Shopify Inc.',                     market: 'US', yahooSymbol: 'SHOP' },
  { ticker: 'UBER',  name: 'Uber',          fullName: 'Uber Technologies, Inc.',          market: 'US', yahooSymbol: 'UBER' },
  { ticker: 'COIN',  name: 'Coinbase',      fullName: 'Coinbase Global, Inc.',            market: 'US', yahooSymbol: 'COIN' },
  { ticker: 'PLTR',  name: 'Palantir',      fullName: 'Palantir Technologies Inc.',       market: 'US', yahooSymbol: 'PLTR' },
  { ticker: 'JPM',   name: 'JPMorgan',      fullName: 'JPMorgan Chase & Co.',             market: 'US', yahooSymbol: 'JPM' },
  { ticker: 'GS',    name: 'Goldman Sachs', fullName: 'The Goldman Sachs Group',          market: 'US', yahooSymbol: 'GS' },
  { ticker: 'V',     name: 'Visa',          fullName: 'Visa Inc.',                        market: 'US', yahooSymbol: 'V' },
  { ticker: 'MA',    name: 'Mastercard',    fullName: 'Mastercard Inc.',                  market: 'US', yahooSymbol: 'MA' },
  { ticker: 'UNH',   name: 'UnitedHealth',  fullName: 'UnitedHealth Group Inc.',          market: 'US', yahooSymbol: 'UNH' },
  { ticker: 'JNJ',   name: 'J&J',           fullName: 'Johnson & Johnson',                market: 'US', yahooSymbol: 'JNJ' },
  { ticker: 'WMT',   name: 'Walmart',       fullName: 'Walmart Inc.',                     market: 'US', yahooSymbol: 'WMT' },
  { ticker: 'DIS',   name: 'Disney',        fullName: 'Walt Disney Company',              market: 'US', yahooSymbol: 'DIS' },
  { ticker: 'BABA',  name: '阿里巴巴',      fullName: 'Alibaba Group Holding',            market: 'US', yahooSymbol: 'BABA' },
  { ticker: 'PDD',   name: '拼多多',        fullName: 'PDD Holdings Inc.',                market: 'US', yahooSymbol: 'PDD' },

  // ── TWSE ────────────────────────────────────────────────────────────────────
  { ticker: '2330', name: '台積電',   fullName: '台灣積體電路製造股份有限公司', market: 'TWSE', yahooSymbol: '2330.TW', twseMisSymbol: 'tse_2330.tw' },
  { ticker: '2454', name: '聯發科',   fullName: '聯發科技股份有限公司',         market: 'TWSE', yahooSymbol: '2454.TW', twseMisSymbol: 'tse_2454.tw' },
  { ticker: '2317', name: '鴻海',     fullName: '鴻海精密工業股份有限公司',     market: 'TWSE', yahooSymbol: '2317.TW', twseMisSymbol: 'tse_2317.tw' },
  { ticker: '2412', name: '中華電',   fullName: '中華電信股份有限公司',         market: 'TWSE', yahooSymbol: '2412.TW', twseMisSymbol: 'tse_2412.tw' },
  { ticker: '2882', name: '國泰金',   fullName: '國泰金融控股股份有限公司',     market: 'TWSE', yahooSymbol: '2882.TW', twseMisSymbol: 'tse_2882.tw' },
  { ticker: '2344', name: '華邦電',   fullName: '華邦電子股份有限公司',         market: 'TWSE', yahooSymbol: '2344.TW', twseMisSymbol: 'tse_2344.tw' },
  { ticker: '2308', name: '台達電',   fullName: '台達電子工業股份有限公司',     market: 'TWSE', yahooSymbol: '2308.TW', twseMisSymbol: 'tse_2308.tw' },
  { ticker: '2382', name: '廣達',     fullName: '廣達電腦股份有限公司',         market: 'TWSE', yahooSymbol: '2382.TW', twseMisSymbol: 'tse_2382.tw' },
  { ticker: '2303', name: '聯電',     fullName: '聯華電子股份有限公司',         market: 'TWSE', yahooSymbol: '2303.TW', twseMisSymbol: 'tse_2303.tw' },
  { ticker: '2357', name: '華碩',     fullName: '華碩電腦股份有限公司',         market: 'TWSE', yahooSymbol: '2357.TW', twseMisSymbol: 'tse_2357.tw' },
  { ticker: '2881', name: '富邦金',   fullName: '富邦金融控股股份有限公司',     market: 'TWSE', yahooSymbol: '2881.TW', twseMisSymbol: 'tse_2881.tw' },
  { ticker: '2886', name: '兆豐金',   fullName: '兆豐金融控股股份有限公司',     market: 'TWSE', yahooSymbol: '2886.TW', twseMisSymbol: 'tse_2886.tw' },
  { ticker: '3711', name: '日月光投控',fullName: '日月光投資控股股份有限公司',  market: 'TWSE', yahooSymbol: '3711.TW', twseMisSymbol: 'tse_3711.tw' },
  { ticker: '2002', name: '中鋼',     fullName: '中國鋼鐵股份有限公司',         market: 'TWSE', yahooSymbol: '2002.TW', twseMisSymbol: 'tse_2002.tw' },
  { ticker: '2327', name: '國巨',     fullName: '國巨股份有限公司',             market: 'TWSE', yahooSymbol: '2327.TW', twseMisSymbol: 'tse_2327.tw' },
  { ticker: '2408', name: '南亞科',   fullName: '南亞科技股份有限公司',         market: 'TWSE', yahooSymbol: '2408.TW', twseMisSymbol: 'tse_2408.tw' },
  { ticker: '1301', name: '台塑',     fullName: '台灣塑膠工業股份有限公司',     market: 'TWSE', yahooSymbol: '1301.TW', twseMisSymbol: 'tse_1301.tw' },

  // ── TPEx ────────────────────────────────────────────────────────────────────
  { ticker: '6488', name: '環球晶',   fullName: '環球晶圓股份有限公司',         market: 'TPEx', yahooSymbol: '6488.TWO', twseMisSymbol: 'otc_6488.tw' },
  { ticker: '3008', name: '大立光',   fullName: '大立光電股份有限公司',         market: 'TPEx', yahooSymbol: '3008.TWO', twseMisSymbol: 'otc_3008.tw' },
  { ticker: '3034', name: '聯詠',     fullName: '聯詠科技股份有限公司',         market: 'TPEx', yahooSymbol: '3034.TWO', twseMisSymbol: 'otc_3034.tw' },
  { ticker: '4938', name: '和碩',     fullName: '和碩聯合科技股份有限公司',     market: 'TPEx', yahooSymbol: '4938.TWO', twseMisSymbol: 'otc_4938.tw' },
];

const _universeMap = new Map(STOCK_UNIVERSE.map(s => [s.ticker, s]));

export function findInUniverse(ticker: string): StockInfo | undefined {
  return _universeMap.get(ticker.toUpperCase());
}

export function searchUniverse(query: string, limit = 6): StockInfo[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: StockInfo[] = [];
  for (const s of STOCK_UNIVERSE) {
    if (results.length >= limit) break;
    if (
      s.ticker.toLowerCase().startsWith(q) ||
      s.name.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q)
    ) {
      results.push(s);
    }
  }
  return results;
}
