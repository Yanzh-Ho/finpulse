import { useState, useEffect } from 'react';
import type { PortfolioHolding } from '../types';

const KEY = 'stockai_portfolio_v1';

function loadFromStorage(): PortfolioHolding[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is PortfolioHolding =>
        typeof h.ticker === 'string' &&
        typeof h.shares === 'number' && h.shares > 0 &&
        typeof h.avgCost === 'number' && h.avgCost > 0,
    );
  } catch {
    return [];
  }
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(loadFromStorage);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(holdings)); } catch {}
  }, [holdings]);

  function addHolding(h: PortfolioHolding) {
    setHoldings((prev) => {
      const idx = prev.findIndex((p) => p.ticker === h.ticker);
      if (idx >= 0) { const next = [...prev]; next[idx] = h; return next; }
      return [...prev, h];
    });
  }

  function updateHolding(h: PortfolioHolding) {
    setHoldings((prev) => prev.map((p) => (p.ticker === h.ticker ? h : p)));
  }

  function removeHolding(ticker: string) {
    setHoldings((prev) => prev.filter((p) => p.ticker !== ticker));
  }

  return { holdings, addHolding, updateHolding, removeHolding };
}
