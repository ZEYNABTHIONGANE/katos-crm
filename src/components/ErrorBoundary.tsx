import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, info: null };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Caught a render error:', error, info);
        this.setState({ info });
    }

    handleReload = () => {
        // Clear any stale Supabase session that might be causing the crash
        try {
            const keys = Object.keys(localStorage).filter(k => k.includes('katos-crm'));
            keys.forEach(k => localStorage.removeItem(k));
        } catch (_) {}
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f0f1a',
                    fontFamily: 'Inter, sans-serif',
                    padding: '2rem',
                }}>
                    <div style={{
                        maxWidth: '560px',
                        width: '100%',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px',
                        padding: '2.5rem',
                        color: '#fff',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>
                            Une erreur inattendue s'est produite
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
                            L'application a rencontré un problème lors du chargement. Cliquez sur le bouton ci-dessous pour relancer.
                        </p>

                        {this.state.error && (
                            <details style={{ marginBottom: '1.5rem' }}>
                                <summary style={{
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    color: 'rgba(255,255,255,0.4)',
                                    marginBottom: '0.5rem'
                                }}>
                                    Détails techniques (pour le développeur)
                                </summary>
                                <pre style={{
                                    background: 'rgba(255,0,0,0.08)',
                                    border: '1px solid rgba(255,0,0,0.2)',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    fontSize: '0.75rem',
                                    color: '#ff6b6b',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                }}>
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={this.handleReload}
                            style={{
                                background: 'linear-gradient(135deg, #2B2E83, #E96C2E)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '0.75rem 1.5rem',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                        >
                            Réinitialiser et retourner à l'accueil
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
