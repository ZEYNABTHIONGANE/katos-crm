import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'dir_commercial' | 'superviseur' | 'resp_commercial' | 'manager' | 'commercial' | 'assistante' | 'conformite' | 'technicien_terrain' | 'technicien_chantier';

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

// Branded loading screen — replaces the blank white page Brave users were seeing
// while Supabase attempts to restore the session.
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
        <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.05em',
            margin: 0,
        }}>
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

        // 2s safety net — Brave often blocks Supabase session restoration silently.
        // After 2s we unlock the app regardless (shows login page if no session).
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                console.warn('[AuthProvider] Safety timeout — forcing unlock');
                setLoading(false);
            }
        }, 2000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            clearTimeout(safetyTimeout);
            try {
                if (!isMounted) return;
                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    if (isMounted) setUser(null);
                }
            } catch (err) {
                console.error('[AuthProvider] Unexpected error:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (supabaseUser: User) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', supabaseUser.id)
                .single();

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
            // Fallback: use Supabase auth data so user isn't stuck on loading
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
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
