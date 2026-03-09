import { useNotifications } from '@/app/providers/NotifProvider';
import { Bell, Clock, X, Check, Trash2, AlertTriangle, Calendar, UserPlus } from 'lucide-react';

const NotifPanel = ({ onClose }: { onClose: () => void }) => {
    const { notifications, markAsRead, markAllAsRead, removeNotif } = useNotifications();

    const getIcon = (type: string) => {
        switch (type) {
            case 'relance': return <AlertTriangle size={16} color="#E96C2E" />;
            case 'rdv': return <Calendar size={16} color="#2B2E83" />;
            case 'prospect': return <UserPlus size={16} color="#10B981" />;
            default: return <Bell size={16} color="#6366F1" />;
        }
    };

    return (
        <div className="notif-panel card-premium">
            <div className="notif-header">
                <div>
                    <h3>Notifications</h3>
                    <p>{notifications.filter(n => !n.read).length} non lues</p>
                </div>
                <div className="notif-header-actions">
                    <button className="notif-action-btn" title="Tout marquer comme lu" onClick={markAllAsRead}>
                        <Check size={18} />
                    </button>
                    <button className="notif-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="notif-list">
                {notifications.length === 0 ? (
                    <div className="notif-empty">
                        <Bell size={40} opacity={0.2} />
                        <p>Aucune notification pour le moment.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}>
                            <div className="notif-icon-wrap">
                                {getIcon(n.type)}
                            </div>
                            <div className="notif-content" onClick={() => markAsRead(n.id)}>
                                <div className="notif-title-row">
                                    <span className="notif-title">{n.title}</span>
                                    <button className="notif-delete" onClick={(e) => { e.stopPropagation(); removeNotif(n.id); }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <p className="notif-message">{n.message}</p>
                                <div className="notif-meta">
                                    <Clock size={12} /> {n.time}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className="notif-footer">
                    <button className="btn-link">Voir toutes les activités</button>
                </div>
            )}
        </div>
    );
};

export default NotifPanel;
