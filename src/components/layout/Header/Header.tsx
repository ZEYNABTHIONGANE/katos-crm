import { useState } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNotifications } from '@/app/providers/NotifProvider';
import NotifPanel from '@/components/ui/NotifPanel';

const Header = ({ onToggleSidebar }: { onToggleSidebar: () => void }) => {
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const [showNotifs, setShowNotifs] = useState(false);

    return (
        <header className="header">
            <div className="header-left">
                <button className="menu-btn" aria-label="Menu" onClick={onToggleSidebar}>
                    <Menu size={24} />
                </button>
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
