import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';
import type { Market } from '../utils/market';

export interface SearchResult {
  ticker: string;
  name: string;
  fullName?: string;
  market: Market;
  // populated only for locally known stocks
  price?: number;
  pct?: number;
  sym?: string;
  isLocal?: boolean;
}

export function useStockSearch(query: string) {
  const [serverResults, setServerResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setServerResults([]); return; }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const json: { results: SearchResult[] } = await res.json();
          setServerResults(json.results ?? []);
        }
      } catch {
        // silently ignore — local results still show
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return { serverResults, searching };
}
