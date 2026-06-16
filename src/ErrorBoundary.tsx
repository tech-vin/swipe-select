import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; info: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? '' });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem', color: '#f0f0f0', fontFamily: 'monospace',
          background: '#121212', height: '100vh', overflow: 'auto',
        }}>
          <h2 style={{ color: '#e74c3c', marginTop: 0 }}>Render error</h2>
          <pre style={{ color: '#ff7675', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ color: '#9a9a9a', whiteSpace: 'pre-wrap', fontSize: '0.75rem', marginTop: '1rem' }}>
            {this.state.info}
          </pre>
          <button
            onClick={() => this.setState({ error: null, info: '' })}
            style={{
              marginTop: '1rem', background: '#4a90e2', color: '#fff',
              border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
