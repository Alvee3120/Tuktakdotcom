'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

import { PremiumButton } from '@/components/ui/PremiumButton';

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class DashboardErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border py-16 text-center">
          <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-2xl">
            <AlertTriangle className="text-destructive h-7 w-7" />
          </div>
          <h3 className="text-foreground mt-4 text-lg font-semibold">
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            {this.props.fallbackMessage ?? 'An unexpected error occurred. Please try again.'}
          </p>
          <PremiumButton
            variant="outline"
            size="sm"
            className="mt-6 gap-2"
            onClick={this.handleRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </PremiumButton>
        </div>
      );
    }

    return this.props.children;
  }
}
