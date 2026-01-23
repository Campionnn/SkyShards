import React from "react";

export class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children?: React.ReactNode }) {
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
