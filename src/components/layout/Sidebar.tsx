import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, FileSpreadsheet, HardHat, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/LOGO-KATOS (2).png';
import './Sidebar.css';

// Nombre de relances urgentes (en retard + aujourd'hui) — statique pour la démo
const RELANCES_URGENTES = 4;

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const menuItems = [
        { path: '/', name: 'Tableau de bord', icon: <LayoutDashboard size={20} /> },
        { path: '/prospects', name: 'Prospects & Clients', icon: <Users size={20} /> },
        { path: '/pipeline', name: 'Pipeline Commercial', icon: <UserPlus size={20} /> },
        { path: '/relances', name: 'Mes Relances', icon: <Bell size={20} />, badge: RELANCES_URGENTES },
        { path: '/agents', name: 'Gestion des Agents', icon: <Users size={20} /> },
        { path: '/rapports', name: 'Rapports & Exports', icon: <FileSpreadsheet size={20} /> },
        { path: '/visites', name: 'Visites & Chantiers', icon: <HardHat size={20} /> },
        { path: '/historique', name: 'Historique RDV', icon: <FileSpreadsheet size={20} /> },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src={logo} alt="Katos CRM" className="logo-img" />
            </div>

            <nav className="sidebar-nav">
                <ul>
                    {menuItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-name">{item.name}</span>
                                {'badge' in item && (item.badge ?? 0) > 0 && (
                                    <span className="nav-badge">{item.badge}</span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile-sm">
                    <div className="avatar">{user?.avatar || 'U'}</div>
                    <div className="user-info">
                        <span className="user-name">{user?.name || 'Utilisateur'}</span>
                        <span className="user-role">{user?.role || 'Agent'}</span>
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout} title="Se déconnecter">
                    <LogOut size={18} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
