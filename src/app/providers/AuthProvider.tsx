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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Écouter les changements d'état (inclut la session initiale en Supabase v2)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;

            if (session?.user) {
                await fetchProfile(session.user);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            isMounted = false;
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
            console.error('Error fetching profile:', error);
            // Fallback user if profile doesn't exist yet
            setUser({
                id: supabaseUser.id,
                email: supabaseUser.email!,
                name: supabaseUser.email!.split('@')[0],
                role: 'commercial', // Default role
                service: null,
                avatar: 'U',
                parent_id: null,
            });
        }
    };

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
