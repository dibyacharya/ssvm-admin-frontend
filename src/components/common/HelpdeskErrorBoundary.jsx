import React from "react";

const isDevMode = Boolean(import.meta?.env?.DEV);

class HelpdeskErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Helpdesk render error:", error, errorInfo);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-base font-semibold text-red-700">Helpdesk failed to render</h2>
          <p className="text-sm text-red-600 mt-1">
            {this.state.error?.message || "Unexpected UI error."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>

        {isDevMode ? (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto text-xs">
            <pre>{this.state.error?.stack || String(this.state.error || "")}</pre>
            {this.state.errorInfo?.componentStack ? (
              <pre className="mt-3">{this.state.errorInfo.componentStack}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
}

export default HelpdeskErrorBoundary;
