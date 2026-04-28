import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'dir_commercial' | 'superviseur' | 'resp_commercial' | 'manager' | 'commercial' | 'assistante' | 'conformite' | 'technicien_terrain' | 'technicien_chantier' | 'marketing';

export type UserService = 'foncier' | 'construction' | 'gestion';

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    service: UserService | null;
    avatar: string;
    parent_id: string | null;
};

type AuthContextType = {
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<{ error: any }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const AuthLoadingScreen = () => (
    <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
        gap: '1.5rem', zIndex: 9999,
    }}>
        <div style={{
            width: 56, height: 56,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#E96C2E',
            borderRadius: '50%',
            animation: 'katos-spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            Chargement…
        </p>
        <style>{`@keyframes katos-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let settled = false;

        const unlock = () => {
            if (isMounted && !settled) {
                settled = true;
                setLoading(false);
            }
        };

        // Strategy 1: Check existing session immediately via getSession()
        // This is a direct API call that doesn't rely on onAuthStateChange.
        // It bypasses Brave's event-blocking behavior.
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!isMounted) return;
            if (error) {
                console.warn('[AuthProvider] getSession error:', error.message);
                unlock();
                return;
            }
            if (session?.user) {
                fetchProfile(session.user).finally(unlock);
            } else {
                unlock();
            }
        }).catch((err) => {
            console.warn('[AuthProvider] getSession threw:', err);
            unlock();
        });

        // Strategy 2: Subscribe to future auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;
            try {
                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('[AuthProvider] onAuthStateChange error:', err);
            } finally {
                unlock();
            }
        });

        // Strategy 3: Absolute fallback — if both getSession AND onAuthStateChange
        // fail (e.g. Brave blocks all Supabase network calls), force unlock after 3s.
        const hardTimeout = window.setTimeout(() => {
            if (!settled) {
                console.warn('[AuthProvider] Hard timeout — unlocking app');
                unlock();
            }
        }, 3000);

        return () => {
            isMounted = false;
            window.clearTimeout(hardTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (supabaseUser: User) => {
        try {
            // Add a 5s timeout to profile fetching to prevent permanent hang
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', supabaseUser.id)
                .single();

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

            if (error) throw error;

            setUser({
                id: supabaseUser.id,
                email: supabaseUser.email!,
                name: data.name || supabaseUser.email!.split('@')[0],
                role: data.role as UserRole,
                service: data.service as UserService | null,
                avatar: data.avatar_url || data.name?.charAt(0) || 'U',
                parent_id: data.parent_id || null,
            });
        } catch (error) {
            console.error('[AuthProvider] Error fetching profile:', error);
            setUser({
                id: supabaseUser.id,
                email: supabaseUser.email!,
                name: supabaseUser.email!.split('@')[0],
                role: 'commercial',
                service: null,
                avatar: 'U',
                parent_id: null,
            });
        }
    };

    const login = async (email: string, password: string) => {
        try {
            console.log('[AuthProvider] Attempting login for:', email);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                console.error('[AuthProvider] login error:', error.message);
                return { error };
            }

            if (data.user) {
                console.log('[AuthProvider] login successful. Profile will be loaded by auth listener.');
                // We don't await fetchProfile here because onAuthStateChange is already triggered
                // and will call fetchProfile. This saves one redundant API call and reduces latency.
            }
            
            return { error: null };
        } catch (err: any) {
            console.error('[AuthProvider] login exception:', err);
            return { error: { message: err.message || 'Une erreur inattendue est survenue' } };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {loading ? <AuthLoadingScreen /> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
