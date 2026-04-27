"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[var(--danger)] bg-[rgba(255,61,0,0.05)] p-8 text-center backdrop-blur-md">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,61,0,0.1)] text-[var(--danger)]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-bold tracking-tight text-[var(--text-strong)]">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-sm text-[var(--text-muted)]">
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <Button onClick={this.handleReset} variant="secondary" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
