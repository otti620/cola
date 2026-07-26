import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-white border border-rose-200 rounded-3xl shadow-lg text-slate-800 space-y-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3">
            <div className="p-2 bg-rose-50 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {this.props.fallbackTitle || "View Rendering Notice"}
              </h3>
              <p className="text-xs text-rose-600 font-medium">
                A non-fatal rendering exception was intercepted.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            The system encountered an unexpected data format while processing this section. Your account state and database records remain completely safe.
          </p>

          {this.state.error && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 overflow-x-auto max-h-24">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Section</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
