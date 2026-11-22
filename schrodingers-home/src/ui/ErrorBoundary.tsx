import React from 'react';

/** Readable failure screen instead of a blank page; includes actionable info for debugging. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ui] crashed', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen">
        <div className="panel" style={{ maxWidth: 640 }}>
          <h2>The house glitched</h2>
          <p>Something went wrong while rendering. Your save is kept in this browser.</p>
          <pre className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error?.stack ?? this.state.error)}</pre>
          <div className="row">
            <button className="btn primary" onClick={() => location.reload()}>Reload</button>
            <button className="btn" onClick={() => { location.search = '?debug=1'; }}>Reload in debug mode</button>
          </div>
        </div>
      </div>
    );
  }
}
