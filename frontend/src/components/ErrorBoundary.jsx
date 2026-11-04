import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Catches render errors so a single broken page does not blank the whole app.
 *
 * Must stay a class component: React exposes no hook equivalent of
 * componentDidCatch.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the component stack; the browser console alone loses it on reload.
    console.error('Unhandled render error:', error, info?.componentStack);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps) {
    // Navigating away from the broken page should clear the error.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section
        className="mx-auto max-w-2xl rounded-panel border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 p-6 text-center"
        role="alert"
      >
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300">
          <AlertCircle size={26} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink sm:text-2xl">This page hit an error</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Your work on other pages is unaffected. Try again, or move to another page from the menu.
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition hover:bg-ink/85"
        >
          <RotateCcw size={16} />
          Try again
        </button>
      </section>
    );
  }
}
