import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { useContactStore } from '@/stores/contactStore';

const Layout = () => {
    const fetchData = useContactStore(state => state.fetchData);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="layout-container">
            <Sidebar />
            <div className="layout-main">
                <Header />
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
