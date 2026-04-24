import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Missing environment variables');
}

// ─── Safe Storage ─────────────────────────────────────────────────────────────
// Brave's fingerprinting protection can throw a SecurityError on localStorage.
// This wrapper silently falls back to an in-memory store.
const safeStorage = (() => {
    const memStore: Record<string, string> = {};
    let useMemory = false;

    try {
        localStorage.setItem('__brave_test__', '1');
        localStorage.removeItem('__brave_test__');
    } catch (_) {
        console.warn('[Supabase] localStorage blocked — using in-memory fallback');
        useMemory = true;
    }

    return {
        getItem: (key: string): string | null => {
            if (useMemory) return memStore[key] ?? null;
            try { return localStorage.getItem(key); }
            catch (_) { useMemory = true; return memStore[key] ?? null; }
        },
        setItem: (key: string, value: string): void => {
            if (useMemory) { memStore[key] = value; return; }
            try { localStorage.setItem(key, value); }
            catch (_) { useMemory = true; memStore[key] = value; }
        },
        removeItem: (key: string): void => {
            if (useMemory) { delete memStore[key]; return; }
            try { localStorage.removeItem(key); }
            catch (_) { useMemory = true; delete memStore[key]; }
        },
    };
})();

// ─── In-Memory Lock ───────────────────────────────────────────────────────────
// ROOT CAUSE OF THE BLANK PAGE ON BRAVE:
// Brave blocks the Web Locks API (navigator.locks). Supabase uses it internally
// to prevent concurrent session operations. When Brave blocks it, the lock is
// never acquired → ALL Supabase auth calls hang indefinitely → blank page.
//
// Fix: replace navigator.locks with a simple Promise-based in-memory mutex.
// This is safe for single-tab SPA usage.
const inMemoryLock = (() => {
    const locks: Record<string, Promise<void>> = {};
    const lockHolders: Record<string, number> = {};

    return async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
        const id = Math.random().toString(36).substring(7);
        // console.debug(`[Lock ${id}] Requesting: ${name}`);

        const previous = locks[name] ?? Promise.resolve();
        let releaseLock!: () => void;
        const current = new Promise<void>((resolve) => { releaseLock = resolve; });
        locks[name] = previous.then(() => current).catch(() => current);

        try {
            // Safety timeout to prevent permanent deadlocks
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Lock timeout for ${name}`)), acquireTimeout || 10000)
            );

            await Promise.race([previous, timeoutPromise]);
            
            // console.debug(`[Lock ${id}] Acquired: ${name}`);
            lockHolders[name] = (lockHolders[name] || 0) + 1;
            
            return await fn();
        } catch (err) {
            console.warn(`[Lock ${id}] Error or Timeout for ${name}:`, err);
            throw err;
        } finally {
            // console.debug(`[Lock ${id}] Releasing: ${name}`);
            lockHolders[name]--;
            releaseLock();
        }
    };
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'katos-crm-auth-token',
        storage: safeStorage,
        // Only override if Web Locks API is blocked/missing
        lock: typeof navigator !== 'undefined' && navigator.locks ? undefined : inMemoryLock,
    }
});
