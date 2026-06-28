import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("ErrorBoundary caught:", error);
    console.error("Component stack:", info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background text-foreground antialiased flex items-center justify-center px-6 py-20">
          <div className="max-w-lg text-center">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-lg font-semibold">!</span>
            </div>
            <div className="text-sm font-semibold text-primary mb-1">Something went wrong</div>
            <div className="text-xs text-muted-foreground font-mono bg-white/[0.05] rounded-lg px-4 py-3 mt-3 break-all text-left">
              {this.state.error?.message || "Unknown error"}
            </div>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="mt-4 text-xs text-[#818cf8] hover:text-[#818cf8]/80 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
