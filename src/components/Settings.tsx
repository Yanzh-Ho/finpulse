import { useState } from 'react';
import type { AuthUser } from '../hooks/useAuth';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? '#4f8ef7' : '#1e3050',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background .2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .2s',
        }}
      />
    </div>
  );
}

interface Props {
  user: AuthUser;
  onLogout: () => void;
}

export function SettingsView({ user, onLogout }: Props) {
  const [risk, setRisk] = useState(2);
  const [alerts, setAlerts] = useState({ price: true, ai: true, news: false });

  const riskLabels = ['非常保守', '保守', '穩健', '積極', '非常積極'];

  const card: React.CSSProperties = {
    background: '#101e35',
    border: '1px solid rgba(79,142,247,.15)',
    borderRadius: 9,
    padding: 16,
    marginBottom: 12,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '.09em',
    textTransform: 'uppercase',
    color: '#4a6890',
    marginBottom: 12,
  };

  const alertItems = [
    { key: 'price' as const, label: '價格提醒', desc: '股價顯著波動時通知' },
    { key: 'ai' as const, label: 'AI 信號變化', desc: '買進/持有/賣出建議改變時通知' },
    { key: 'news' as const, label: '即時新聞', desc: '自選股的即時新聞推送' },
  ];

  const accountInfo: [string, string][] = [
    ['姓名', user.name],
    ['電子郵件', user.email],
    ['方案', user.plan],
    ['加入日期', user.joinDate],
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 24,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(79,142,247,.2) transparent',
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>設定</div>
      <div style={{ fontSize: 13, color: '#4a6890', marginBottom: 22 }}>偏好設定與帳戶資訊</div>

      {/* Risk Profile */}
      <div style={card}>
        <div style={sectionTitle}>風險偏好</div>
        <div style={{ fontSize: 13, marginBottom: 12 }}>
          目前：<span style={{ color: '#4f8ef7', fontWeight: 600 }}>{riskLabels[risk]}</span>
          <span style={{ fontSize: 11, color: '#4a6890', marginLeft: 8 }}>— 影響 AI 建議權重</span>
        </div>
        <input
          type="range"
          min="0"
          max="4"
          value={risk}
          onChange={(e) => setRisk(+e.target.value)}
          style={{ width: '100%', marginBottom: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a6890' }}>
          <span>保守</span>
          <span>穩健</span>
          <span>積極</span>
        </div>
      </div>

      {/* Alerts */}
      <div style={card}>
        <div style={sectionTitle}>通知偏好</div>
        {alertItems.map((a) => (
          <div
            key={a.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid rgba(79,142,247,.1)',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: '#4a6890', marginTop: 2 }}>{a.desc}</div>
            </div>
            <Toggle
              on={alerts[a.key]}
              onChange={() => setAlerts((prev) => ({ ...prev, [a.key]: !prev[a.key] }))}
            />
          </div>
        ))}
      </div>

      {/* Account */}
      <div style={card}>
        <div style={sectionTitle}>帳戶資訊</div>
        {accountInfo.map(([label, val]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid rgba(79,142,247,.08)',
              fontSize: 13,
            }}
          >
            <span style={{ color: '#4a6890' }}>{label}</span>
            <span style={{ color: '#ccd8f5' }}>{val}</span>
          </div>
        ))}

        <button
          onClick={onLogout}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '9px',
            background: 'rgba(255,64,96,.06)',
            border: '1px solid rgba(255,64,96,.2)',
            borderRadius: 7,
            color: '#ff6080',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background .15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,64,96,.12)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,64,96,.06)')}
        >
          登出帳戶
        </button>
      </div>
    </div>
  );
}
