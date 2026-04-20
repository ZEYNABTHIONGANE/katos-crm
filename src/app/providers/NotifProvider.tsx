import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';

export type NotificationType = 'tache' | 'rdv' | 'prospect' | 'client' | 'info';

export type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    time: string;
    read: boolean;
    service?: string;
    assigned_to?: string;
    created_by_name?: string;
};

type NotifContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    removeNotif: (id: string) => void;
    addNotif: (notif: { type: NotificationType, title: string, message: string, service?: string, assigned_to?: string, created_by_name?: string }) => Promise<void>;
};

const NotifContext = createContext<NotifContextType | null>(null);

export const NotifProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

        if (diffInMinutes < 1) return "À l'instant";
        if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
        if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
        return date.toLocaleDateString();
    };

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        // 1. Charger l'état de lecture
        const { data: reads } = await supabase
            .from('notification_reads')
            .select('notification_id')
            .eq('user_id', user.id);

        const readSet = new Set(reads?.map(r => r.notification_id) || []);
        setReadIds(readSet);

        // 2. Charger les notifications filtrées par rôle
        let query = supabase.from('notifications').select('*');

        // Appliquer les filtres selon les règles métier
        if (user.role === 'admin') {
            // Voit tout - pas de filtre
        } else if (user.role === 'manager') {
            // Voit les notifs de son service
            if (user.service) {
                const userSvc = user.service === 'gestion' ? 'gestion_immobiliere' : user.service;
                query = query.eq('service', userSvc);
            }
        } else if (user.role === 'commercial') {
            // Voit uniquement ce qui lui est assigné
            query = query.eq('assigned_to', user.id);
        } else if (user.role === 'assistante') {
            // L'assistante peut voir les infos générales (null service/assigned), mais pas les litiges
            query = query.or('service.is.null,assigned_to.is.null').neq('service', 'conformite');
        } else if (user.role === 'conformite') {
            // Voit les litiges + ce qui lui est assigné
            query = query.or(`service.eq.conformite,assigned_to.eq.${user.id}`);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

        if (error) {
            console.error('[NotifProvider] Error fetching notifications:', error);
            return;
        }

        const formatted = (data || []).map(n => ({
            id: n.id,
            type: n.type as NotificationType,
            title: n.title,
            message: n.message,
            time: formatTime(n.created_at),
            read: readSet.has(n.id),
            service: n.service,
            assigned_to: n.assigned_to,
            created_by_name: n.created_by_name
        }));

        setNotifications(formatted);
    }, [user]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const checkScheduledReminders = async () => {
            if (user.role !== 'commercial') return;

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const datesToCheck = [
                { date: todayStr, label: "Aujourd'hui", prefix: "Aujourd'hui" },
                { date: tomorrowStr, label: "Demain", prefix: "Rappel J-1" }
            ];

            for (const d of datesToCheck) {
                // 1. Récupérer les visites pour cet agent à cette date
                const { data: visits } = await supabase
                    .from('visits')
                    .select('id, title, date, heure, lieu, type, contact_id')
                    .eq('agent', user.name)
                    .eq('date', d.date)
                    .neq('statut', 'completed')
                    .neq('statut', 'cancelled');

                if (visits && visits.length > 0) {
                    for (const v of visits) {
                        const reminderTitle = `${d.prefix} : ${v.title}`;

                        const { data: existing } = await supabase
                            .from('notifications')
                            .select('id')
                            .eq('assigned_to', user.id)
                            .eq('title', reminderTitle)
                            .limit(1);

                        if (existing && existing.length > 0) continue;

                        const { data: contact } = await supabase
                            .from('contacts')
                            .select('name')
                            .eq('id', v.contact_id)
                            .single();

                        const prospectName = contact?.name || 'Prospect Inconnu';
                        let typeLabel = 'visite';
                        if (v.type === 'terrain') typeLabel = 'visite de terrain';
                        else if (v.type === 'chantier') typeLabel = 'visite de chantier';
                        else if (v.type === 'bureau') typeLabel = 'rendez-vous au bureau';

                        const message = `${d.label} à ${v.heure}, vous avez une ${typeLabel} avec ${prospectName} à ${v.lieu || 'Lieu non spécifié'}.`;

                        await supabase.from('notifications').insert([{
                            type: 'rdv',
                            title: reminderTitle,
                            message,
                            assigned_to: user.id,
                            service: user.service
                        }]);
                    }
                }

                // 2. Récupérer les relances (follow-ups) pour cet agent à cette date
                const { data: followups } = await supabase
                    .from('follow_ups')
                    .select('id, note, date_relance, contact_id')
                    .eq('agent', user.name)
                    .eq('date_relance', d.date)
                    .neq('statut', 'done');

                if (followups && followups.length > 0) {
                    for (const f of followups) {
                        const reminderTitle = `${d.prefix} Tâche : ${f.note?.substring(0, 30) || 'Action de suivi'}...`;

                        const { data: existing } = await supabase
                            .from('notifications')
                            .select('id')
                            .eq('assigned_to', user.id)
                            .eq('title', reminderTitle)
                            .limit(1);

                        if (existing && existing.length > 0) continue;

                        const { data: contact } = await supabase
                            .from('contacts')
                            .select('name')
                            .eq('id', f.contact_id)
                            .single();

                        const prospectName = contact?.name || 'Prospect Inconnu';
                        const message = `${d.label}, vous devez effectuer une action de suivi pour ${prospectName} : "${f.note}".`;

                        await supabase.from('notifications').insert([{
                            type: 'tache',
                            title: reminderTitle,
                            message,
                            assigned_to: user.id,
                            service: user.service
                        }]);
                    }
                }
            }
        };

        fetchNotifications();
        checkScheduledReminders();

        // Écouter les changements en temps réel
        const channel = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                const newNotif = payload.new;

                // Vérifier si cette notification doit être affichée pour l'utilisateur actuel
                let shouldAdd = false;
                if (user.role === 'admin') shouldAdd = true;
                else if (user.role === 'manager' && newNotif.service === (user.service === 'gestion' ? 'gestion_immobiliere' : user.service)) shouldAdd = true;
                else if (user.role === 'commercial' && newNotif.assigned_to === user.id) shouldAdd = true;
                else if (user.role === 'conformite' && (newNotif.service === 'conformite' || newNotif.assigned_to === user.id)) shouldAdd = true;
                else if (user.role === 'assistante' && !newNotif.service && !newNotif.assigned_to) shouldAdd = true;

                if (shouldAdd) {
                    setNotifications(prev => [{
                        id: newNotif.id,
                        type: newNotif.type as NotificationType,
                        title: newNotif.title,
                        message: newNotif.message,
                        time: "À l'instant",
                        read: false,
                        service: newNotif.service,
                        assigned_to: newNotif.assigned_to,
                        created_by_name: newNotif.created_by_name
                    }, ...prev]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications]);

    const markAsRead = async (id: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('notification_reads')
            .insert([{ user_id: user.id, notification_id: id }]);

        if (!error || error.code === '23505') { // 23505 = already exists
            setReadIds(prev => new Set([...prev, id]));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        }
    };

    const markAllAsRead = async () => {
        if (!user || notifications.length === 0) return;

        const unreadNotifs = notifications.filter(n => !readIds.has(n.id));
        if (unreadNotifs.length === 0) return;

        const reads = unreadNotifs.map(n => ({ user_id: user.id, notification_id: n.id }));

        const { error } = await supabase.from('notification_reads').insert(reads);

        if (!error) {
            const newIds = new Set([...readIds, ...unreadNotifs.map(n => n.id)]);
            setReadIds(newIds);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    const removeNotif = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const addNotif = async (notif: { type: NotificationType, title: string, message: string, service?: string, assigned_to?: string, created_by_name?: string }) => {
        const { error } = await supabase.from('notifications').insert([{
            type: notif.type,
            title: notif.title,
            message: notif.message,
            service: notif.service,
            assigned_to: notif.assigned_to,
            created_by_name: notif.created_by_name
        }]);

        if (error) {
            console.error('[NotifProvider] Error adding notification:', error);
        }
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
