import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SupervisionErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('SupervisionErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '32px 24px',
            maxWidth: '640px',
            margin: '40px auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #FECACA',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.08)',
            textAlign: 'center',
            direction: 'rtl',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#DC2626',
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            تعذر عرض الشاشة الإشرافية المطلوبة
          </h2>

          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
            واجه النظام خطأً غير متوقع أثناء معالجة بيانات هذه الشاشة. لم تتأثر بياناتك المسجلة، ويمكنك إعادة المحاولة أو العودة إلى لوحة المتابعة.
          </p>

          {this.state.error && (
            <div
              style={{
                marginBottom: '24px',
                padding: '12px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
                color: '#64748B',
                textAlign: 'left',
                direction: 'ltr',
                fontFamily: 'monospace',
                maxHeight: '120px',
                overflowY: 'auto',
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.name}: {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} />
              <span>إعادة المحاولة</span>
            </button>

            {this.props.onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  this.props.onNavigateHome?.();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Home size={15} />
                <span>لوحة المتابعة</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
