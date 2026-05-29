import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';
import type { NewsItem } from '../types';

export function usePortfolioNews(tickers: string[]) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const key = tickers.slice().sort().join(',');

  useEffect(() => {
    if (!key) { setNews([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/news/portfolio?tickers=${encodeURIComponent(key)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((json: { news: NewsItem[] }) => {
        if (!cancelled) { setNews(json.news ?? []); setLoading(false); }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { news, loading };
}
