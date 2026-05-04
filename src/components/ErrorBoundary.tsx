import { Component, type ReactNode } from "react";

const LAST_WORKING_KEY = "foodie-map:last-working-params";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  recovering: boolean;
}

/**
 * Error boundary that catches render/effect crashes and auto-recovers
 * by navigating to the last known working URL params.
 * Persists successful page loads to localStorage for recovery reference.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: "", recovering: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch() {
    // Attempt auto-recovery after a brief delay
    setTimeout(() => this.attemptRecovery(), 1500);
  }

  /** Navigates to the last working URL params if available. */
  attemptRecovery() {
    const saved = localStorage.getItem(LAST_WORKING_KEY);
    if (saved) {
      this.setState({ recovering: true });
      const currentSearch = window.location.search;
      // Only navigate if we're not already on the saved params
      if (currentSearch !== saved) {
        window.history.replaceState(null, "", `${window.location.pathname}${saved}`);
      }
      // Force full re-mount
      setTimeout(() => window.location.reload(), 300);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-card">
            <h2>页面加载出错</h2>
            <p className="error-boundary-detail">{this.state.errorMessage}</p>
            {this.state.recovering ? (
              <p className="error-boundary-recovering">正在恢复到上次正常页面...</p>
            ) : (
              <button
                className="error-boundary-btn"
                onClick={() => this.attemptRecovery()}
              >
                恢复到上次正常页面
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Saves the current URL search params as the last known working state.
 * Call this after successful data load and render.
 */
export function markCurrentStateWorking(): void {
  const search = window.location.search;
  if (search) {
    localStorage.setItem(LAST_WORKING_KEY, search);
  }
}
