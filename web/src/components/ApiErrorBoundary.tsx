'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}

export class ApiErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('ApiErrorBoundary caught:', error);
  }

  retry = () => {
    this.props.onRetry?.();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const err = this.state.error;
      const isApi = err instanceof ApiError;
      const message = isApi ? err.message : err.message || 'Something went wrong';

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground" role="alert">
            {message}
          </p>
          <Button onClick={this.retry} variant="outline">
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
