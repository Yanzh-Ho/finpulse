import { useState, useEffect, useCallback } from 'react';
import type { Candle } from '../types';

export interface MarketQuote {
  price: number;
  change: number;
  pct: number;
  hi52: number;
  lo52: number;
  history: Candle[];
}

interface MarketResponse {
  results: Record<string, MarketQuote>;
  errors: Record<string, string>;
  fetchedAt?: string;
  cached?: boolean;
  stale?: boolean;
}

const REFRESH_INTERVAL = 60_000; // re-fetch every 60 s (server cache = 5 min)

export function useMarketData() {
  const [results, setResults] = useState<Record<string, MarketQuote>>({});
  const [status, setStatus]   = useState<'loading' | 'live' | 'error'>('loading');

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('/api/market');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MarketResponse = await res.json();
      if (Object.keys(json.results).length > 0) {
        setResults(json.results);
        setStatus('live');
      }
    } catch {
      setStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  return { results, status };
}
