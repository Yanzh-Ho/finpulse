import type { Market } from '../types';

export type { Market };

export function isTWMarket(market: Market): boolean {
  return market !== 'US';
}

// TW convention: up = red, down = green (opposite of US)
export function upColor(market: Market): string {
  return isTWMarket(market) ? '#ff4060' : '#00d98b';
}

export function downColor(market: Market): string {
  return isTWMarket(market) ? '#00d98b' : '#ff4060';
}

export function priceColor(pct: number, market: Market): string {
  if (pct > 0) return upColor(market);
  if (pct < 0) return downColor(market);
  return '#ccd8f5';
}

export function marketLabel(market: Market): string {
  switch (market) {
    case 'US':             return '美股';
    case 'TWSE':           return '上市';
    case 'TPEx':           return '上櫃';
    case 'Emerging':       return '興櫃';
    case 'InnovationBoard': return '創新板';
  }
}

export function marketFlag(market: Market): string {
  return market === 'US' ? '🇺🇸' : '🇹🇼';
}

interface BadgeStyle {
  background: string;
  border: string;
  color: string;
}

export function marketBadgeStyle(market: Market): BadgeStyle {
  switch (market) {
    case 'US':
      return { background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.25)', color: '#4f8ef7' };
    case 'TWSE':
      return { background: 'rgba(255,214,102,.15)', border: '1px solid rgba(255,214,102,.3)', color: '#ffd666' };
    case 'TPEx':
      return { background: 'rgba(0,217,139,.12)', border: '1px solid rgba(0,217,139,.25)', color: '#00bf91' };
    case 'Emerging':
      return { background: 'rgba(255,136,0,.12)', border: '1px solid rgba(255,136,0,.25)', color: '#ff9900' };
    case 'InnovationBoard':
      return { background: 'rgba(180,100,255,.12)', border: '1px solid rgba(180,100,255,.25)', color: '#c06ef7' };
  }
}
