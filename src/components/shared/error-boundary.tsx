"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary:", error.message);
    // Do NOT expose stack traces or internals
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            An unexpected error occurred. Please try again.
          </p>
          <Button variant="outline" onClick={this.handleRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}