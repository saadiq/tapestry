/**
 * Error Boundary Component
 * Catches React errors and prevents full app unmount/remount
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise show default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-screen items-center justify-center bg-base-200">
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-error">Something went wrong</h2>
              <p className="text-base-content/70">
                An error occurred in the application. You can try to recover by clicking the button below.
              </p>
              {this.state.error && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">Error:</p>
                  <p className="text-sm text-base-content/60">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="card-actions justify-end mt-4">
                <button
                  className="btn btn-primary"
                  onClick={this.handleReset}
                >
                  Try to Recover
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => window.location.reload()}
                >
                  Reload App
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
