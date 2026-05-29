import { useState } from 'react';
import type { Stock, NewsItem } from '../types';
import { STOCKS } from '../data/stocks';
import { useNews } from '../hooks/useNews';

interface Props {
  stock: Stock | null;
}

function sentColor(s: string) {
  return s === 'bullish' ? '#00d98b' : s === 'bearish' ? '#ff4060' : '#ffd666';
}
function sentBg(s: string) {
  return s === 'bullish' ? 'rgba(0,217,139,.1)' : s === 'bearish' ? 'rgba(255,64,96,.1)' : 'rgba(255,214,102,.1)';
}
function sentLabel(s: string) {
  return s === 'bullish' ? '看多' : s === 'bearish' ? '看空' : '中性';
}

function TagBadge({ tag }: { tag: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      color: '#4f8ef7',
      background: 'rgba(79,142,247,.1)',
      border: '1px solid rgba(79,142,247,.25)',
      padding: '2px 8px', borderRadius: 4,
      letterSpacing: '.02em', flexShrink: 0,
    }}>
      {tag}
    </span>
  );
}

function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(7,11,20,.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0f1b2e',
          border: '1px solid rgba(79,142,247,.25)',
          borderRadius: 12,
          padding: '28px 30px',
          maxWidth: 560,
          width: '100%',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,.7)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', color: '#4a6890',
            fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
            color: sentColor(item.sent), background: sentBg(item.sent),
            border: `1px solid ${sentColor(item.sent)}40`, letterSpacing: '.04em',
          }}>
            {item.sentiment ?? sentLabel(item.sent)}
          </span>
          {item.tag && <TagBadge tag={item.tag} />}
        </div>

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 600, color: '#ccd8f5', lineHeight: 1.55, marginBottom: 16 }}>
          {item.title}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#4a6890', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ color: '#4f8ef7', fontWeight: 500 }}>{item.src}</span>
          <span style={{ color: '#1e3050' }}>·</span>
          <span>{item.time}</span>
        </div>

        {/* Content area */}
        <div style={{
          background: 'rgba(79,142,247,.05)',
          border: '1px solid rgba(79,142,247,.1)',
          borderRadius: 8, padding: '14px 16px',
          fontSize: 13, color: '#4a6890', lineHeight: 1.7, marginBottom: 20,
        }}>
          完整文章內容需至原始來源查看。以下為 AI 情緒分析：
          <span style={{ color: sentColor(item.sent), marginLeft: 6, fontWeight: 600 }}>
            {sentLabel(item.sent)}
          </span>
        </div>

        {/* Action button */}
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 8,
              background: 'rgba(79,142,247,.12)',
              border: '1px solid rgba(79,142,247,.3)',
              color: '#4f8ef7', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer', transition: 'background .15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(79,142,247,.22)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(79,142,247,.12)')}
          >
            ↗ 開啟原始文章
          </a>
        ) : (
          <div style={{ fontSize: 12, color: '#2a4060' }}>暫無原始連結</div>
        )}
      </div>
    </div>
  );
}

function NewsCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  const displaySentiment = item.sentiment ?? sentLabel(item.sent);
  return (
    <div
      onClick={onClick}
      style={{
        background: '#101e35',
        border: '1px solid rgba(79,142,247,.12)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color .15s, background .15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(79,142,247,.35)';
        el.style.background = '#121f38';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(79,142,247,.12)';
        el.style.background = '#101e35';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.55, flex: 1, color: '#ccd8f5' }}>
          {item.title}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: sentColor(item.sent),
          background: sentBg(item.sent), border: `1px solid ${sentColor(item.sent)}40`,
          padding: '3px 9px', borderRadius: 4, flexShrink: 0, letterSpacing: '.03em',
        }}>
          {displaySentiment}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#4a6890', alignItems: 'center', flexWrap: 'wrap' }}>
        {item.tag && <TagBadge tag={item.tag} />}
        <span style={{ color: '#4f8ef7', fontWeight: 500 }}>{item.src}</span>
        <span style={{ color: '#1e3050' }}>·</span>
        <span>{item.time}</span>
        {item.url && (
          <>
            <span style={{ color: '#1e3050' }}>·</span>
            <span style={{ color: '#2a5080', fontSize: 10 }}>點擊查看</span>
          </>
        )}
      </div>
    </div>
  );
}

export function NewsView({ stock }: Props) {
  const [modal, setModal] = useState<NewsItem | null>(null);
  const { news: liveNews, isDemo } = useNews(stock?.ticker ?? null);

  const mockItems = stock
    ? stock.news
    : Object.values(STOCKS).flatMap((s) => s.news.slice(0, 2));

  const items = liveNews.length > 0 ? liveNews : mockItems;

  return (
    <div
      style={{
        flex: 1, overflowY: 'auto', padding: '24px 28px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(79,142,247,.2) transparent',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ccd8f5' }}>新聞與情緒分析</div>
          {isDemo && liveNews.length === 0 && (
            <span style={{ fontSize: 10, color: '#2a4060', background: 'rgba(79,142,247,.07)', border: '1px solid rgba(79,142,247,.15)', padding: '3px 9px', borderRadius: 4 }}>
              示範資料
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#4a6890' }}>
          {stock ? `${stock.ticker} · ${stock.name} 相關新聞` : '市場精選新聞'} · AI 情緒分析
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#2a4060', fontSize: 13 }}>
          暫無相關新聞
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n, i) => (
            <NewsCard key={i} item={n} onClick={() => setModal(n)} />
          ))}
        </div>
      )}

      {modal && <NewsModal item={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
