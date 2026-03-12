import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, ClipboardCheck, LogOut, Home, Building2, HardHat, PieChart, History, Folders } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import logo from '@/assets/LOGO-KATOS (2).png';

// Nombre de tâches urgentes (en retard + aujourd'hui) — statique pour la démo
const TACHES_URGENTES = 4;

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const menuSections = [
        {
            title: 'TIERS',
            items: [
                { path: '/', name: 'Tableau de bord', icon: <LayoutDashboard size={18} /> },
                { path: '/prospects', name: 'Prospects & Clients', icon: <Users size={18} /> },
                { path: '/pipeline', name: 'Pipeline Commercial', icon: <UserPlus size={18} /> },
                { path: '/relances', name: 'Mes Tâches', icon: <ClipboardCheck size={18} />, badge: TACHES_URGENTES },
            ]
        },
        {
            title: 'SERVICES',
            items: [
                { path: '/foncier', name: 'Vente Terrains', icon: <Home size={18} /> },
                { path: '/gestion', name: 'Gest. Immobilière', icon: <Building2 size={18} /> },
                { path: '/construction', name: 'Construction', icon: <HardHat size={18} /> },
            ]
        },
        {
            title: 'OUTILS & ADMIN',
            items: [
                { path: '/documents', name: 'Gestion Documents', icon: <Folders size={18} /> },
                { path: '/agents', name: 'Gestion Agents', icon: <Users size={18} /> },
                { path: '/rapports', name: 'Rapports/Exports', icon: <PieChart size={18} /> },
                { path: '/historique', name: 'Historique Interactions', icon: <History size={18} /> },
            ]
        }
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
                {menuSections.map((section, idx) => (
                    <div key={idx} className="nav-section">
                        <div className="nav-section-title">{section.title}</div>
                        <ul>
                            {section.items.map((item) => (
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
                    </div>
                ))}
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
