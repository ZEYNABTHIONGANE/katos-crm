import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.scss';
import App from './app/App';

// Global safety net — catches errors BEFORE React mounts (e.g. Brave blocking storage,
// module init failures, etc.). These would otherwise cause a silent blank page.
window.addEventListener('error', (e) => {
    console.error('[main] Global error caught:', e.error ?? e.message);
    const root = document.getElementById('root');
    if (root && root.childElementCount === 0) {
        root.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f0f1a;font-family:Inter,sans-serif;color:#fff;padding:2rem"><div style="max-width:520px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:2rem"><h2 style="margin:0 0 .5rem">Erreur de chargement</h2><p style="color:rgba(255,255,255,.5);font-size:.875rem;margin:0 0 1rem">${e.message}</p><button onclick="localStorage.clear();location.href='/'" style="background:linear-gradient(135deg,#2B2E83,#E96C2E);border:none;border-radius:10px;padding:.75rem 1.5rem;color:#fff;font-weight:700;cursor:pointer;width:100%">Réinitialiser</button></div></div>`;
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('[main] Unhandled promise rejection:', e.reason);
});

try {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
} catch (err) {
    console.error('[main] Failed to mount React:', err);
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f0f1a;font-family:Inter,sans-serif;color:#fff;padding:2rem"><div style="max-width:520px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:2rem"><h2 style="margin:0 0 .5rem">Impossible de démarrer l'application</h2><p style="color:rgba(255,255,255,.5);font-size:.875rem;margin:0 0 1rem">${err instanceof Error ? err.message : String(err)}</p><button onclick="localStorage.clear();location.href='/'" style="background:linear-gradient(135deg,#2B2E83,#E96C2E);border:none;border-radius:10px;padding:.75rem 1.5rem;color:#fff;font-weight:700;cursor:pointer;width:100%">Réinitialiser</button></div></div>`;
    }
}

