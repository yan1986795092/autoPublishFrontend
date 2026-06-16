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
        <div className="surface-card p-8 max-w-lg w-full text-center">
          <div className="text-4xl mb-4">!</div>
          <h2 className="text-xl font-semibold mb-2 text-red-400">页面发生错误</h2>
          <p className="text-sm text-app-text-secondary mb-4">
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
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
