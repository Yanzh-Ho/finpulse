import { useState, useEffect } from 'react';

const LS_KEY = 'stockai_watchlist';
const DEFAULT_WATCHLIST = ['2330', '2454', '2317', '2412', 'TSM', 'NVDA', 'AAPL', 'TSLA'];

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_WATCHLIST;
}

export function useWatchlist() {
  const [list, setList] = useState<string[]>(loadFromStorage);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
  }, [list]);

  const has = (ticker: string) => list.includes(ticker.toUpperCase());

  const add = (ticker: string) => {
    const t = ticker.toUpperCase();
    setList(prev => prev.includes(t) ? prev : [...prev, t]);
  };

  const remove = (ticker: string) => {
    const t = ticker.toUpperCase();
    setList(prev => prev.filter(x => x !== t));
  };

  return { list, has, add, remove };
}
