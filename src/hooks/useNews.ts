import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';
import type { NewsItem } from '../types';

export function useNews(ticker: string | null) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) { setNews([]); setIsDemo(true); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/news/${encodeURIComponent(ticker)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((json: { news: NewsItem[]; isDemo?: boolean }) => {
        if (!cancelled) {
          if (json.news?.length > 0) {
            setNews(json.news);
            setIsDemo(json.isDemo ?? false);
          }
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker]);

  return { news, isDemo, loading };
}
