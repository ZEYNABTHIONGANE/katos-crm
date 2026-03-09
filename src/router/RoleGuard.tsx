import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import type { UserRole } from '@/app/providers/AuthProvider';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: UserRole[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

    return <>{children}</>;
};
