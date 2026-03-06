import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type NotificationType = 'relance' | 'rdv' | 'prospect' | 'info';

export type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    time: string;
    read: boolean;
};

type NotifContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotif: (id: string) => void;
    addNotif: (notif: Omit<Notification, 'id' | 'read' | 'time'>) => void;
};

const INITIAL_NOTIFS: Notification[] = [
    {
        id: 'n1',
        type: 'relance',
        title: 'Relance urgente',
        message: 'Awa Ndiaye attend votre appel pour le terrain Almadies.',
        time: 'Il y a 10 min',
        read: false
    },
    {
        id: 'n2',
        type: 'rdv',
        title: 'RDV dans 1 heure',
        message: 'Présentation catalogue avec Fatou Sow au bureau.',
        time: 'Il y a 45 min',
        read: false
    },
    {
        id: 'n3',
        type: 'prospect',
        title: 'Nouveau prospect',
        message: 'Ibou Sy vient de remplir le formulaire de contact.',
        time: 'Il y a 2h',
        read: true
    }
];

const NotifContext = createContext<NotifContextType | null>(null);

export const NotifProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFS);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const removeNotif = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const addNotif = (notif: Omit<Notification, 'id' | 'read' | 'time'>) => {
        const newNotif: Notification = {
            ...notif,
            id: 'n' + Date.now(),
            read: false,
            time: 'À l\'instant'
        };
        setNotifications(prev => [newNotif, ...prev]);
    };

    return (
        <NotifContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, removeNotif, addNotif }}>
            {children}
        </NotifContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotifContext);
    if (!ctx) throw new Error('useNotifications must be used inside NotifProvider');
    return ctx;
};
