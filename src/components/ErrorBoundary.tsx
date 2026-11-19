import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unexpected error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-dvh w-full place-items-center bg-[#0a0a0f] p-6 text-white">
          <div className="glass-strong max-w-md rounded-[28px] p-6 text-center">
            <h1 className="font-display text-base uppercase tracking-[0.25em] text-lilac">Something went wrong</h1>
            <p className="mt-3 text-sm text-white/70 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-2xl bg-gradient-to-br from-soul to-nebula px-5 py-2.5 text-sm font-medium text-white"
            >
              Reload SOUL
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
