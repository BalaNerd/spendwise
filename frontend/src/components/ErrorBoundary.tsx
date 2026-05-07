'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
    
    // Handle AbortError specifically
    if (error.name === 'AbortError') {
      console.warn('⚠️ AbortError caught - this is usually a network or timeout issue');
      // Don't treat AbortError as critical
      return;
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Handle AbortError gracefully
      if (this.state.error?.name === 'AbortError') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Connection Issue
              </h2>
              <p className="text-neutral-400 mb-4">
                There was a network issue. Please check your connection and try again.
              </p>
              <button
                onClick={this.reset}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        );
      }

      // Default error fallback
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.reset} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-neutral-400 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  return (error: Error) => {
    console.error('❌ Error caught by error handler:', error);
    
    // Handle AbortError specifically
    if (error.name === 'AbortError') {
      console.warn('⚠️ AbortError handled gracefully');
      return;
    }
    
    // For other errors, you might want to show a toast or notification
    // This is where you could integrate with your toast system
  };
}
