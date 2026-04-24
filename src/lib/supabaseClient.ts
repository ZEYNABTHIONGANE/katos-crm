import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Missing environment variables');
}

// Safe storage wrapper — prevents Brave's fingerprinting protection from
// throwing a SecurityError when localStorage is accessed during module init.
// Falls back to an in-memory store so the app always loads.
const safeStorage = (() => {
    const memStore: Record<string, string> = {};
    let useMemory = false;

    // Test if localStorage is accessible right now
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'katos-crm-auth-token',
        storage: safeStorage,
    }
});

