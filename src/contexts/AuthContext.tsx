import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'admin' | 'manager' | 'commercial';

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar: string; // initiales
};

type AuthContextType = {
    user: AuthUser | null;
    login: (email: string, password: string) => boolean;
    logout: () => void;
    isAuthenticated: boolean;
};

// Comptes fictifs
const MOCK_USERS: (AuthUser & { password: string })[] = [
    { id: 'u1', name: 'Admin Katos', email: 'admin@katos.sn', password: 'admin123', role: 'admin', avatar: 'AK' },
    { id: 'u2', name: 'Omar Diallo', email: 'omar@katos.sn', password: 'omar123', role: 'manager', avatar: 'OD' },
    { id: 'u3', name: 'Abdou Sarr', email: 'abdou@katos.sn', password: 'abdou123', role: 'commercial', avatar: 'AS' },
];

const STORAGE_KEY = 'katos_user';
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });

    useEffect(() => {
        if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        else localStorage.removeItem(STORAGE_KEY);
    }, [user]);

    const login = (email: string, password: string): boolean => {
        const found = MOCK_USERS.find(u => u.email === email && u.password === password);
        if (!found) return false;
        const { password: _, ...authUser } = found;
        setUser(authUser);
        return true;
    };

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
