import { useState, useEffect, useRef } from 'react';

type Mode = 'login' | 'register' | 'forgot';

interface Props {
  onLogin:    (email: string, password: string) => string | null;
  onRegister: (email: string, password: string, name: string) => string | null;
}

export function LoginView({ onLogin, onRegister }: Props) {
  const [mode, setMode]         = useState<Mode>('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fading, setFading]     = useState(false);

  // Use ref so setTimeout callbacks always see the latest value — avoids stale closures
  const pendingSwitch = useRef<{ target: Mode; delay: number } | null>(null);

  // After registration success, auto-switch back to login
  useEffect(() => {
    if (!pendingSwitch.current) return;
    const { target, delay } = pendingSwitch.current;
    const t = setTimeout(() => {
      doSwitchMode(target);
      pendingSwitch.current = null;
    }, delay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  function doSwitchMode(target: Mode) {
    setFading(true);
    setTimeout(() => {
      setMode(target);
      setError('');
      setSuccess('');
      setPassword('');
      if (target !== 'register') setName('');
      setFading(false);
    }, 170);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (mode === 'login') {
      // Call synchronously — no setTimeout so React batches setUser + UI in one pass
      const err = onLogin(email, password);
      if (err) {
        setError(err);
        setSubmitting(false);
      }
      // On success: App.tsx setUser fires, LoginView unmounts — no further state needed
    } else if (mode === 'register') {
      const err = onRegister(email, password, name);
      if (err) {
        setError(err);
      } else {
        setSuccess('✓ 註冊成功！即將返回登入頁面...');
        // Schedule switch via ref so the callback sees fresh state, not stale closure
        pendingSwitch.current = { target: 'login', delay: 1400 };
      }
      setSubmitting(false);
    } else {
      // forgot password — demo: just look up in localStorage
      try {
        const raw = localStorage.getItem('registered_users');
        const users: Array<{ email: string }> = raw ? JSON.parse(raw) : [];
        const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!found) {
          setError('找不到此 Email 的帳號');
        } else {
          setSuccess(`已模擬發送重設連結至 ${found.email}（示範環境，請以原密碼登入）`);
        }
      } catch {
        setError('查詢失敗，請稍後再試');
      }
      setSubmitting(false);
    }
  }

  const titles: Record<Mode, string> = {
    login:    '登入帳戶',
    register: '建立新帳戶',
    forgot:   '重設密碼',
  };

  const btnLabels: Record<Mode, string> = {
    login:    submitting ? '登入中…'   : '登入',
    register: submitting ? '建立中…'   : '建立帳戶',
    forgot:   submitting ? '處理中…'   : '發送重設連結',
  };

  const inp: React.CSSProperties = {
    width: '100%', background: '#0c1422',
    border: '1px solid rgba(79,142,247,.2)', borderRadius: 7,
    padding: '10px 12px', color: '#e0e8ff', fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
    boxSizing: 'border-box', transition: 'border-color .2s',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, color: '#4a6890', fontWeight: 600,
    letterSpacing: '.05em', display: 'block', marginBottom: 7,
  };
  const focusBorder  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(79,142,247,.6)');
  const blurBorder   = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(79,142,247,.2)');

  const isLogin    = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot   = mode === 'forgot';

  return (
    <div style={{ height: '100dvh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#4f8ef7,#1e4fd8)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(79,142,247,.35)' }}>◈</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e0e8ff', letterSpacing: '-.02em' }}>FinPulse</div>
          <div style={{ fontSize: 12, color: '#4a6890', marginTop: 4 }}>台股 AI 投資分析平台</div>
        </div>

        {/* Card */}
        <div style={{ background: '#101e35', border: '1px solid rgba(79,142,247,.2)', borderRadius: 12, padding: '26px 24px', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>

          <div style={{ fontSize: 15, fontWeight: 600, color: '#ccd8f5', marginBottom: 20, opacity: fading ? 0 : 1, transition: 'opacity .17s' }}>
            {titles[mode]}
          </div>

          <form onSubmit={handleSubmit} style={{ opacity: fading ? 0 : 1, transition: 'opacity .17s' }}>

            {/* Name — register only */}
            <div style={{ overflow: 'hidden', maxHeight: isRegister ? 76 : 0, opacity: isRegister ? 1 : 0, marginBottom: isRegister ? 14 : 0, transition: 'max-height .25s ease, opacity .2s, margin-bottom .2s' }}>
              <label style={lbl}>姓名</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder="請輸入您的姓名" tabIndex={isRegister ? 0 : -1} style={inp} onFocus={focusBorder} onBlur={blurBorder} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>電子郵件</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="your@email.com" autoComplete="email" style={inp} onFocus={focusBorder} onBlur={blurBorder} />
            </div>

            {/* Password — hidden on forgot */}
            <div style={{ overflow: 'hidden', maxHeight: isForgot ? 0 : 76, opacity: isForgot ? 0 : 1, marginBottom: isForgot ? 0 : 20, transition: 'max-height .25s ease, opacity .2s, margin-bottom .2s' }}>
              <label style={lbl}>密碼</label>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder={isRegister ? '至少 6 個字元' : '••••••••'} autoComplete={isRegister ? 'new-password' : 'current-password'} tabIndex={isForgot ? -1 : 0} style={inp} onFocus={focusBorder} onBlur={blurBorder} />
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: 14, padding: '9px 12px', background: 'rgba(255,64,96,.08)', border: '1px solid rgba(255,64,96,.25)', borderRadius: 7, fontSize: 12, color: '#ff6080' }}>
                ⚠ {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{ marginBottom: 14, padding: '9px 12px', background: 'rgba(0,217,139,.06)', border: '1px solid rgba(0,217,139,.22)', borderRadius: 7, fontSize: 12, color: '#00d98b' }}>
                {success}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '11px', background: submitting ? '#1e3050' : 'linear-gradient(135deg,#4f8ef7,#1e4fd8)', border: 'none', borderRadius: 7, color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', boxShadow: submitting ? 'none' : '0 4px 16px rgba(79,142,247,.35)', transition: 'background .2s, box-shadow .2s' }}>
              {btnLabels[mode]}
            </button>
          </form>

          {/* Forgot link — only on login */}
          {isLogin && (
            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <button onClick={() => doSwitchMode('forgot')} style={{ background: 'none', border: 'none', color: '#4a6890', fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, cursor: 'pointer', padding: 0 }}>
                忘記密碼？
              </button>
            </div>
          )}

          {/* Mode toggle */}
          <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(79,142,247,.08)', fontSize: 12, color: '#4a6890' }}>
            {isLogin && <>沒有帳號？<button onClick={() => doSwitchMode('register')} style={{ background: 'none', border: 'none', color: '#4f8ef7', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 0 0 4px', textDecoration: 'underline', textUnderlineOffset: 2 }}>立即註冊</button></>}
            {isRegister && <>已有帳號？<button onClick={() => doSwitchMode('login')} style={{ background: 'none', border: 'none', color: '#4f8ef7', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 0 0 4px', textDecoration: 'underline', textUnderlineOffset: 2 }}>返回登入</button></>}
            {isForgot && <><button onClick={() => doSwitchMode('login')} style={{ background: 'none', border: 'none', color: '#4f8ef7', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>← 返回登入</button></>}
          </div>
        </div>

        {/* Hint */}
        {isLogin && (
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#2a4a6a', lineHeight: 1.8 }}>
            測試帳號：yan_shao@ncnu.edu.tw<br />
            測試密碼：stockai2024
          </div>
        )}
      </div>
    </div>
  );
}
