import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { useContactStore } from '@/stores/contactStore';
import { useAuth } from '@/app/providers/AuthProvider';

const Layout = () => {
    const { user } = useAuth();
    const fetchData = useContactStore(state => state.fetchData);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [fetchData, user]);

    return (
        <div className={`layout-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar isCollapsed={isCollapsed} />
            <div className="layout-main">
                <Header onToggleSidebar={() => setIsCollapsed(!isCollapsed)} />
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
