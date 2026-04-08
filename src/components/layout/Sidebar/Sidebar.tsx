import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, ClipboardCheck, LogOut, Home, Building2, HardHat, PieChart, History, Folders, Calendar, HelpCircle } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useContactStore } from '@/stores/contactStore';
import logo from '@/assets/LOGO-KATOS (2).png';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { followUps } = useContactStore();
    const navigate = useNavigate();

    // Nombre de tâches urgentes (en retard + aujourd'hui) - DYNAMIQUE
    const todayStr = new Date().toISOString().split('T')[0];
    const urgentCount = followUps.filter(r => {
        if (r.statut === 'done') return false;
        // "Mes Tâches" is personal for everyone
        return r.agent === user?.name && (r.dateRelance <= todayStr);
    }).length;

    const menuSections = [
        {
            title: 'TIERS',
            items: [
                {
                    path: '/',
                    name: 'Tableau de bord',
                    icon: <LayoutDashboard size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'manager', 'commercial', 'assistante']
                },
                {
                    path: '/prospects',
                    name: 'Prospects & Clients',
                    icon: <Users size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'manager', 'commercial', 'assistante']
                },
                {
                    path: '/pipeline',
                    name: 'Pipeline Commercial',
                    icon: <UserPlus size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager', 'commercial']
                },
                {
                    path: '/relances',
                    name: 'Mes Tâches',
                    icon: <ClipboardCheck size={18} />,
                    badge: urgentCount,
                    allowedRoles: ['commercial']
                },
            ]
        },
        {
            title: 'SERVICES',
            items: [
                {
                    path: '/foncier',
                    name: 'Vente Terrains',
                    icon: <Home size={18} />,
                    allowedServices: ['foncier'],
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager', 'commercial']
                },
                {
                    path: '/gestion',
                    name: 'Gest. Immobilière',
                    icon: <Building2 size={18} />,
                    allowedServices: ['gestion'],
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager', 'commercial']
                },
                {
                    path: '/construction',
                    name: 'Construction',
                    icon: <HardHat size={18} />,
                    allowedServices: ['construction'],
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager', 'commercial']
                },
            ]
        },
        {
            title: 'OUTILS & ADMIN',
            items: [
                {
                    path: '/documents',
                    name: 'Gestion Documents',
                    icon: <Folders size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial']
                },
                {
                    path: '/agents',
                    name: 'Gestion Agents',
                    icon: <Users size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager']
                },
                {
                    path: '/rapports',
                    name: 'Rapports/Exports',
                    icon: <PieChart size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager']
                },
                {
                    path: '/historique',
                    name: 'Historique Interactions',
                    icon: <History size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager']
                },
                {
                    path: '/agenda-terrain',
                    name: 'Agenda',
                    icon: <Calendar size={18} />,
                    allowedRoles: ['admin', 'technicien', 'manager']
                },
                {
                    path: '/faq',
                    name: 'FAQ / Procédures',
                    icon: <HelpCircle size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager', 'commercial', 'assistante']
                },
            ]
        }
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Filtrage des menus selon les rôles et services
    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => {
            // "Mes Tâches" : visible UNIQUEMENT par les commerciaux
            if (item.path === '/relances' && user?.role !== 'commercial') return false;

            // Un admin, dir_commercial ou resp_commercial voit tout (sauf les exceptions au-dessus)
            if (user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur' || user?.role === 'resp_commercial') return true;

            const typedItem = item as any;

            // Vérification du rôle
            if ('allowedRoles' in item && !typedItem.allowedRoles?.includes(user?.role as any)) {
                return false;
            }

            // Vérification du service (pour les modules spécifiques)
            if ('allowedServices' in item && typedItem.allowedServices && !typedItem.allowedServices.includes(user?.service as any)) {
                return false;
            }

            return true;
        })
    })).filter(section => section.items.length > 0);

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src={logo} alt="Katos CRM" className="logo-img" />
            </div>

            <nav className="sidebar-nav">
                {filteredSections.map((section, idx) => (
                    <div key={idx} className="nav-section">
                        <div className="nav-section-title">{section.title}</div>
                        <ul>
                            {section.items.map((item) => {
                                const typedItem = item as any;
                                return (
                                    <li key={item.path}>
                                        <NavLink
                                            to={item.path}
                                            end={item.path === '/'}
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            <span className="nav-name">{item.name}</span>
                                            {'badge' in item && (typedItem.badge ?? 0) > 0 && (
                                                <span className="nav-badge">{typedItem.badge}</span>
                                            )}
                                        </NavLink>
                                    </li>
                                );
                            })}
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
