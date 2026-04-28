import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, ClipboardCheck, LogOut, Home, Building2, HardHat, PieChart, History, Calendar, HelpCircle, MessageSquare, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useChat } from '@/app/providers/ChatProvider';
import { useContactStore } from '@/stores/contactStore';
import logo from '@/assets/LOGO-KATOS (2).png';

const Sidebar = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const { user, logout } = useAuth();
    const { totalUnreadCount } = useChat();
    const { followUps } = useContactStore();
    const navigate = useNavigate();

    // Nombre de tâches urgentes (en retard + aujourd'hui) - DYNAMIQUE
    const todayStr = new Date().toISOString().split('T')[0];
    const urgentCount = followUps.filter(r => {
        if (r.statut === 'done') return false;
        // "Mes Tâches" is personal for everyone
        const agentNorm = (r.agent || '').trim().toLowerCase();
        const userNameNorm = (user?.name || '').trim().toLowerCase();
        return agentNorm === userNameNorm && (r.dateRelance <= todayStr);
    }).length;

    const menuSections = [
        {
            title: 'TIERS',
            items: [
                {
                    path: '/',
                    name: 'Tableau de bord',
                    icon: <LayoutDashboard size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'assistante', 'conformite', 'marketing']
                },
                {
                    path: '/pipeline',
                    name: 'Pipeline Commercial',
                    icon: <UserPlus size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'conformite']
                },
                {
                    path: '/prospects',
                    name: 'Prospects & Clients',
                    icon: <Users size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'conformite']
                },
                {
                    path: '/marketing-prospects',
                    name: 'Registre Prospects',
                    icon: <Users size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'marketing']
                },
                {
                    path: '/relances',
                    name: 'Mes Tâches',
                    icon: <ClipboardCheck size={18} />,
                    badge: urgentCount,
                    allowedRoles: ['commercial', 'conformite']
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
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'conformite']
                },
                {
                    path: '/gestion',
                    name: 'Gest. Immobilière',
                    icon: <Building2 size={18} />,
                    allowedServices: ['gestion'],
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'conformite']
                },
                {
                    path: '/construction',
                    name: 'Construction',
                    icon: <HardHat size={18} />,
                    allowedServices: ['construction'],
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'conformite']
                },
            ]
        },
        {
            title: 'OUTILS & ADMIN',
            items: [
                {
                    path: '/compliance',
                    name: 'Litige & Conformité',
                    icon: <ShieldAlert size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'conformite']
                },
                {
                    path: '/agents',
                    name: 'Gestion Agents',
                    icon: <Users size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial']
                },
                {
                    path: '/suivi-commercial',
                    name: 'Suivi Commercial',
                    icon: <ClipboardCheck size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial']
                },
                {
                    path: '/rapports',
                    name: 'Statistiques & Analyses',
                    icon: <PieChart size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial']
                },
                {
                    path: '/historique',
                    name: 'Historique Interactions',
                    icon: <History size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial']
                },
                {
                    path: '/agenda-terrain',
                    name: 'Agenda',
                    icon: <Calendar size={18} />,
                    allowedRoles: ['admin', 'technicien_terrain', 'technicien_chantier', 'commercial', 'dir_commercial', 'resp_commercial', 'conformite']
                },
                {
                    path: '/faq',
                    name: 'FAQ / Procédures',
                    icon: <HelpCircle size={18} />,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'assistante', 'conformite']
                },
                {
                    path: '/messages',
                    name: 'Messagerie',
                    icon: <MessageSquare size={18} />,
                    badge: totalUnreadCount,
                    allowedRoles: ['admin', 'dir_commercial', 'resp_commercial', 'commercial', 'assistante', 'conformite']
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
            // "Mes Tâches" : visible par les commerciaux et la conformité
            if (item.path === '/relances' && !['commercial', 'conformite'].includes(user?.role || '')) return false;

            // Un admin ou dir_commercial voit tout (sauf Mes Tâches réservé aux commerciaux)
            if (user?.role === 'admin' || user?.role === 'dir_commercial') return true;

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
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
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
                        <span className="user-role">
                            {user?.role === 'admin' ? 'Administrateur' :
                             user?.role === 'dir_commercial' ? 'Directeur Commercial' :
                             user?.role === 'resp_commercial' ? 'Responsable Commercial' :
                             user?.role === 'superviseur' ? 'Superviseur' :
                             user?.role === 'commercial' ? 'Commercial' :
                             user?.role === 'assistante' ? 'Assistante de Direction' :
                             user?.role === 'marketing' ? 'Marketing' :
                             user?.role === 'conformite' ? 'Conformité' :
                             user?.role || 'Agent'}
                        </span>
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
