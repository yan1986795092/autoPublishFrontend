import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="w-full max-w-lg rounded-xl border border-app-border bg-app-elevated p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-red-400">!</span>
          </div>
          <h2 className="text-base font-semibold mb-2 text-app-text">页面发生错误</h2>
          <p className="text-xs text-app-text-secondary mb-4">
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-400 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
    }

    return this.props.children;
  }
}
