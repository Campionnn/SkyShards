import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children?: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: "red", padding: 16 }}>Error: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}
