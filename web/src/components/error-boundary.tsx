"use client";

import React, { Component, ReactNode } from "react";
import { logger } from "@/lib/errors/centralized-logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean; // Show technical details in development
  context?: {
    component?: string;
    userId?: string;
    feature?: string;
  };
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, context = {} } = this.props;

    // Log error to centralized logging system
    logger.logError(error, {
      component: "web",
      severity: "high",
      endpoint: window.location.pathname,
      userAgent: navigator.userAgent,
      tags: {
        ...context,
        componentStack: errorInfo.componentStack || "",
        errorBoundary: "true",
        retryCount: this.state.retryCount.toString(),
      },
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to external monitoring (Sentry, etc.)
    this.reportToExternalService(error, errorInfo);
  }

  private reportToExternalService = (
    error: Error,
    errorInfo: React.ErrorInfo
  ) => {
    // This would integrate with Sentry or other error monitoring
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.withScope(scope => {
    //     scope.setContext('react_error_boundary', {
    //       componentStack: errorInfo.componentStack,
    //       errorBoundary: this.props.context?.component || 'unnamed',
    //       retryCount: this.state.retryCount,
    //     });
    //     window.Sentry.captureException(error);
    //   });
    // }
  };

  private handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorId: undefined,
      retryCount: prevState.retryCount + 1,
    }));

    // Automatically retry after a delay for certain error types
    this.scheduleAutoRetry();
  };

  private scheduleAutoRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 2;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s

    if (retryCount < maxRetries) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, retryDelay);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReport = () => {
    const { error, errorId } = this.state;
    if (!error || !errorId) return;

    // Send user feedback with error context
    const mailto = `mailto:support@example.com?subject=Error Report - ${errorId}&body=${encodeURIComponent(`
Error ID: ${errorId}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}

Error Details:
${error.message}

Please describe what you were doing when this error occurred:
[Your description here]
    `)}`;

    window.open(mailto);
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorId, retryCount } = this.state;
    const {
      children,
      fallback,
      showDetails = process.env.NODE_ENV === "development",
    } = this.props;

    if (hasError && error) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white shadow-lg dark:border-red-800 dark:bg-gray-800">
            <div className="p-6">
              {/* Error Icon */}
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              {/* Error Message */}
              <div className="mb-6 text-center">
                <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  Something went wrong
                </h2>
                <p className="mb-1 text-gray-600 dark:text-gray-400">
                  We've encountered an unexpected error. Our team has been
                  notified.
                </p>
                {errorId && (
                  <p className="font-mono text-xs text-gray-500 dark:text-gray-500">
                    Error ID: {errorId}
                  </p>
                )}
              </div>

              {/* Technical Details (Development Only) */}
              {showDetails && (
                <div className="mb-6 rounded bg-gray-50 p-3 text-xs dark:bg-gray-700">
                  <div className="mb-1 font-semibold text-gray-700 dark:text-gray-300">
                    Technical Details:
                  </div>
                  <div className="font-mono text-red-600 dark:text-red-400">
                    {error.name}: {error.message}
                  </div>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
                        Stack trace
                      </summary>
                      <pre className="mt-1 overflow-x-auto text-xs">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  disabled={retryCount >= 3}
                >
                  {retryCount >= 3 ? "Max Retries Reached" : "Try Again"}
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                >
                  Reload Page
                </button>
              </div>

              {/* Report Button */}
              <button
                onClick={this.handleReport}
                className="mt-3 w-full px-4 py-2 text-sm text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Report this issue
              </button>

              {/* Help Text */}
              <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
                {retryCount > 0 && <p>Retry attempts: {retryCount}/3</p>}
                <p className="mt-1">
                  If this persists, try refreshing the page or contact support.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

// Hook for triggering error boundary from child components
export function useErrorHandler() {
  return (error: Error, context?: string) => {
    throw error; // This will be caught by the nearest error boundary
  };
}

export default ErrorBoundary;
