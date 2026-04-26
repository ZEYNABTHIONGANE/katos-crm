import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { useContactStore } from '@/stores/contactStore';
import { useAuth } from '@/app/providers/AuthProvider';

const Layout = () => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const fetchData = useContactStore(state => state.fetchData);
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 768);
    const [isMobileActive, setIsMobileActive] = useState(false);

    // Fermer le menu mobile lors du changement de page
    useEffect(() => {
        setIsMobileActive(false);
    }, [pathname]);

    useEffect(() => {
        if (user) {
            fetchData();
        }

        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fetchData, user]);

    const toggleSidebar = () => {
        if (window.innerWidth <= 768) {
            setIsMobileActive(!isMobileActive);
        } else {
            setIsCollapsed(!isCollapsed);
        }
    };

    return (
        <div className={`layout-container ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileActive ? 'mobile-active' : ''}`}>
            {isMobileActive && (
                <div className="sidebar-backdrop" onClick={() => setIsMobileActive(false)} />
            )}
            <Sidebar isCollapsed={isCollapsed} isMobileActive={isMobileActive} />
            <div className="layout-main">
                <Header onToggleSidebar={toggleSidebar} />
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
