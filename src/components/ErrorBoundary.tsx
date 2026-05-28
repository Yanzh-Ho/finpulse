import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[StockAI] Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
            padding: 40,
            color: '#4a6890',
            background: '#0c1422',
          }}
        >
          <div style={{ fontSize: 32, opacity: 0.25 }}>⚠</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ccd8f5' }}>顯示發生錯誤</div>
          <div style={{ fontSize: 12, color: '#4a6890', textAlign: 'center', maxWidth: 300 }}>
            {this.state.error?.message ?? '未知錯誤'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              marginTop: 8,
              padding: '6px 18px',
              background: 'rgba(79,142,247,.12)',
              border: '1px solid rgba(79,142,247,.3)',
              borderRadius: 6,
              color: '#4f8ef7',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
