import { useState } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotifContext';
import NotifPanel from '../NotifPanel';
import './Header.css';

const Header = () => {
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const [showNotifs, setShowNotifs] = useState(false);

    return (
        <header className="header">
            <div className="header-left">
                <button className="menu-btn" aria-label="Menu">
                    <Menu size={24} />
                </button>
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Rechercher un prospect, un client, un RDV..." />
                </div>
            </div>

            <div className="header-right">
                <button
                    className={`icon-btn notification-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                    aria-label="Notifications"
                    onClick={() => setShowNotifs(!showNotifs)}
                >
                    <Bell size={26} />
                    {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>

                {showNotifs && <NotifPanel onClose={() => setShowNotifs(false)} />}

                <div className="user-profile">
                    <div className="avatar">{user?.avatar || 'U'}</div>
                    <span className="user-name-dark">{user?.name || 'Utilisateur'}</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
