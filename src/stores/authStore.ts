import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
    setUser: (user: any | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
