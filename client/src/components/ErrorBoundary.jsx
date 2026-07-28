import { Component } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center px-6 transition-colors">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiAlertTriangle size={36} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-gray-500 dark:text-dark-muted mb-6 text-sm leading-relaxed">
              An unexpected error occurred. Please try again.
            </p>
            <button onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition">
              <FiRefreshCw size={18} /> Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
