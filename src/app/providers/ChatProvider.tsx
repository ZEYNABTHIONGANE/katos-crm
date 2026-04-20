import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { chatApi } from '@/features/crm/api/chatApi';

type ChatContextType = {
    totalUnreadCount: number;
    refreshUnreadCount: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

    // Recalcule le vrai total depuis la BDD (lus = dans chat_message_status)
    const refreshUnreadCount = useCallback(async () => {
        if (!user) return;
        const count = await chatApi.fetchTotalUnread(user.id);
        setTotalUnreadCount(count);
    }, [user]);

    // Chargement initial
    useEffect(() => {
        if (user) refreshUnreadCount();
    }, [user, refreshUnreadCount]);

    // Écouter en temps réel les nouveaux messages
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('global:chat:unread')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                (payload) => {
                    const newMsg = payload.new as any;
                    // Si ce n'est pas mon message, ça crée un nouveau non-lu → recalcul
                    if (newMsg.sender_id !== user.id) {
                        refreshUnreadCount();
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_message_status' },
                (payload) => {
                    const status = payload.new as any;
                    // Si c'est mon statut "lu" qui vient d'être créé → recalcul
                    if (status.user_id === user.id && status.is_read) {
                        refreshUnreadCount();
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'chat_message_status' },
                (payload) => {
                    const status = payload.new as any;
                    if (status.user_id === user.id) {
                        refreshUnreadCount();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, refreshUnreadCount]);

    return (
        <ChatContext.Provider value={{ totalUnreadCount, refreshUnreadCount }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChat must be used within ChatProvider');
    return context;
};
