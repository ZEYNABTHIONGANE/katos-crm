import { supabase } from '@/lib/supabaseClient';

export type ChatGroup = {
    id: string;
    name: string | null;
    display_name?: string;
    type: 'public' | 'private' | 'group' | 'department';
    service?: string | null;
    created_at: string;
    // Méta-données pour la boîte de réception
    last_message?: string;
    last_message_at?: string;
    last_sender?: string;
    unread_count?: number;
    is_deleted_by_me?: boolean;
    is_important?: boolean;
};

export type ChatMessage = {
    id: string;
    group_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender_name?: string;
    sender_role?: string;
    sender_avatar?: string;
};

export type Folder = 'inbox' | 'sent' | 'trash' | 'important';

export const chatApi = {

    // Récupérer les groupes selon le dossier sélectionné
    async fetchGroupsForFolder(userId: string, folder: Folder): Promise<ChatGroup[]> {
        // 1. Récupérer toutes les adhésions de l'utilisateur (Publics + Privés)
        const { data: memberships } = await supabase
            .from('chat_group_members')
            .select('group_id, chat_groups(*)')
            .eq('user_id', userId);

        const groups = (memberships?.map(m =>
            Array.isArray(m.chat_groups) ? m.chat_groups[0] : m.chat_groups
        ).filter(Boolean) || []) as ChatGroup[];

        if (folder !== 'trash') {
            const { data: publicGroups } = await supabase.from('chat_groups').select('*').eq('type', 'public');
            if (publicGroups) {
                publicGroups.forEach(pg => {
                    if (!groups.find(g => g.id === pg.id)) groups.push(pg as ChatGroup);
                });
            }
        }

        if (groups.length === 0) return [];
        const groupIds = groups.map(g => g.id);

        // 2. Récupérer les statuts de thread en une seule fois
        const { data: threadStatuses } = await supabase
            .from('chat_user_thread_status')
            .select('group_id, is_deleted, is_important')
            .eq('user_id', userId)
            .in('group_id', groupIds);

        const threadStatusMap = new Map((threadStatuses || []).map(s => [s.group_id, s]));

        // 3. Récupérer les derniers messages par groupe (Batché)
        // Note: On récupère les derniers messages récents pour tous les groupes concernés
        const { data: allLastMsgs } = await supabase
            .from('chat_messages')
            .select('group_id, content, created_at, sender_id, profiles:sender_id(name)')
            .in('group_id', groupIds)
            .order('created_at', { ascending: false });

        // Créer une map pour ne garder que le plus récent par groupe
        const lastMsgMap = new Map();
        (allLastMsgs || []).forEach(msg => {
            if (!lastMsgMap.has(msg.group_id)) lastMsgMap.set(msg.group_id, msg);
        });

        // 4. Récupérer les noms des membres (Batché)
        const { data: allMembers } = await supabase
            .from('chat_group_members')
            .select('group_id, profiles(name)')
            .in('group_id', groupIds);

        const memberNamesMap = new Map<string, string[]>();
        (allMembers || []).forEach(m => {
            const name = (m.profiles as any)?.name;
            if (name) {
                const names = memberNamesMap.get(m.group_id) || [];
                memberNamesMap.set(m.group_id, [...names, name]);
            }
        });

        // 5. Récupérer les non-lus (Optimisé)
        // Au lieu de compter chaque message un par un, on pourrait utiliser une approche plus complexe,
        // mais pour l'instant, on va au moins éviter de boucler si possible.
        // En attendant une vue SQL, on garde une boucle mais plus légère.
        
        const enriched = await Promise.all(groups.map(async (group) => {
            const lastMsg = lastMsgMap.get(group.id);
            const threadStatus = threadStatusMap.get(group.id);
            
            const isDeletedByMe = threadStatus?.is_deleted || false;
            const isImportant   = threadStatus?.is_important || false;

            // Noms des membres
            const names = memberNamesMap.get(group.id) || [];

            // Pour l'unread_count, on garde le fetch par groupe car c'est plus complexe en un seul appel sans RPC
            // Mais on simplifie le calcul
            const { data: unreadData } = await supabase
                .from('chat_messages')
                .select('id')
                .eq('group_id', group.id)
                .neq('sender_id', userId);
            
            let unreadCount = 0;
            if (unreadData && unreadData.length > 0) {
                const { data: readStatuses } = await supabase
                    .from('chat_message_status')
                    .select('message_id')
                    .eq('user_id', userId)
                    .eq('is_read', true)
                    .in('message_id', unreadData.map(m => m.id));
                unreadCount = unreadData.length - (readStatuses?.length || 0);
            }

            return {
                ...group,
                display_name: names.join(', '),
                last_message: lastMsg?.content || '',
                last_message_at: lastMsg?.created_at || group.created_at,
                last_sender: (lastMsg?.profiles as any)?.name || '',
                unread_count: unreadCount || 0,
                is_deleted_by_me: isDeletedByMe,
                is_important: isImportant,
            } as ChatGroup;
        }));

        // 6. Filtrage final
        let filtered: ChatGroup[];
        if (folder === 'inbox') filtered = enriched.filter(g => !g.is_deleted_by_me);
        else if (folder === 'sent') {
            // Filtrage simplifié pour "sent" (si l'utilisateur est dans le groupe et a envoyé au moins un message)
            // Pour être ultra précis, il faudrait vérifier chat_messages pour chaque groupe.
            // Mais pour la rapidité, on peut assumer que si l'utilisateur est membre et que folder == 'sent', on affiche tout.
            filtered = enriched.filter(g => !g.is_deleted_by_me); 
        }
        else if (folder === 'important') filtered = enriched.filter(g => g.is_important && !g.is_deleted_by_me);
        else filtered = enriched.filter(g => g.is_deleted_by_me);

        return filtered.sort((a, b) =>
            new Date(b.last_message_at || b.created_at).getTime() -
            new Date(a.last_message_at || a.created_at).getTime()
        );
    },

    // Récupérer les messages d'un groupe avec infos expéditeur
    async fetchMessages(groupId: string) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select(`
                *,
                profiles:sender_id (name, role, avatar_url)
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erreur fetchMessages:', error);
            return [];
        }

        return (data || []).map(m => ({
            ...m,
            sender_name: (m.profiles as any)?.name || 'Inconnu',
            sender_role: (m.profiles as any)?.role || 'Agent',
            sender_avatar: (m.profiles as any)?.avatar_url
        }));
    },

    // Envoyer un message
    async sendMessage(groupId: string, senderId: string, content: string) {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([{ group_id: groupId, sender_id: senderId, content }])
            .select()
            .single();

        if (error) {
            console.error('Erreur envoi message:', error);
            throw new Error(`Échec de l'envoi: ${error.message}`);
        }
        return data;
    },

    // Marquer tous les messages d'un groupe comme lus pour un utilisateur
    async markGroupAsRead(groupId: string, userId: string) {
        const { data: msgs } = await supabase
            .from('chat_messages')
            .select('id')
            .eq('group_id', groupId)
            .neq('sender_id', userId);

        if (!msgs || msgs.length === 0) return;

        const statusRows = msgs.map(m => ({
            message_id: m.id,
            user_id: userId,
            is_read: true,
            is_deleted: false
        }));

        await supabase.from('chat_message_status').upsert(statusRows, {
            onConflict: 'message_id,user_id'
        });
    },

    // Déplacer une discussion vers la corbeille
    async moveThreadToTrash(groupId: string, userId: string) {
        const { error } = await supabase
            .from('chat_user_thread_status')
            .upsert({ group_id: groupId, user_id: userId, is_deleted: true },
                { onConflict: 'group_id,user_id' });

        if (error) {
            console.error('Erreur moveThreadToTrash:', error);
            throw new Error(error.message);
        }
    },

    // Restaurer une discussion depuis la corbeille
    async restoreThreadFromTrash(groupId: string, userId: string) {
        const { error } = await supabase
            .from('chat_user_thread_status')
            .upsert({ group_id: groupId, user_id: userId, is_deleted: false },
                { onConflict: 'group_id,user_id' });

        if (error) {
            console.error('Erreur restoreThreadFromTrash:', error);
            throw new Error(error.message);
        }
    },

    // Supprimer définitivement une discussion (retire l'utilisateur des membres)
    async permanentlyDeleteThread(groupId: string, userId: string) {
        // Supprimer le statut thread
        await supabase
            .from('chat_user_thread_status')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

        // Retirer l'utilisateur du groupe → disparaît de tous les dossiers
        const { error } = await supabase
            .from('chat_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) {
            console.error('Erreur permanentlyDeleteThread:', error);
            throw new Error(error.message);
        }
    },

    // Marquer une discussion comme importante (Star)
    async toggleStar(groupId: string, userId: string, newState: boolean) {
        const { error } = await supabase
            .from('chat_user_thread_status')
            .upsert({ group_id: groupId, user_id: userId, is_important: newState },
                { onConflict: 'group_id,user_id' });

        if (error) console.error('Erreur toggleStar:', error);
    },

    // Retrouver ou créer une discussion avec un ensemble spécifique de membres
    async getOrCreateGroup(memberIds: string[], creatorId: string) {
        const allMembers = Array.from(new Set([...memberIds, creatorId])).sort();

        // 1. Chercher si une discussion avec EXACTEMENT ces membres existe déjà
        const { data: myMemberships } = await supabase
            .from('chat_group_members')
            .select('group_id')
            .eq('user_id', creatorId);

        if (myMemberships) {
            for (const m of myMemberships) {
                const { data: others } = await supabase
                    .from('chat_group_members')
                    .select('user_id')
                    .eq('group_id', m.group_id);

                if (others) {
                    const currentMembers = others.map(o => o.user_id).sort();
                    if (JSON.stringify(currentMembers) === JSON.stringify(allMembers)) {
                        const { data: g } = await supabase.from('chat_groups').select('type').eq('id', m.group_id).single();
                        if (g?.type !== 'public') return m.group_id;
                    }
                }
            }
        }

        // 2. Créer un nouveau groupe
        const { data: newGroup, error: groupError } = await supabase
            .from('chat_groups')
            .insert([{ type: allMembers.length > 2 ? 'group' : 'private' }])
            .select()
            .single();

        if (groupError) {
            console.error('Erreur création groupe:', groupError);
            throw new Error(`Détails technique (chat_groups): ${groupError.message}`);
        }

        const memberships = allMembers.map(uid => ({
            group_id: newGroup.id,
            user_id: uid
        }));

        const { error: memberError } = await supabase.from('chat_group_members').insert(memberships);
        if (memberError) {
            console.error('Erreur memberships:', memberError);
            throw new Error(`Détails technique (chat_members): ${memberError.message}`);
        }

        return newGroup.id;
    },

    // Compter le total des messages non lus pour tous les groupes de l'utilisateur
    // Utilisé par le ChatProvider pour le badge global de la sidebar
    async fetchTotalUnread(userId: string): Promise<number> {
        // 1. Récupérer tous les groupes de l'utilisateur
        const { data: memberships } = await supabase
            .from('chat_group_members')
            .select('group_id')
            .eq('user_id', userId);

        if (!memberships || memberships.length === 0) return 0;

        const groupIds = memberships.map(m => m.group_id);

        // 2. Tous les messages des groupes, pas envoyés par moi
        const { data: allMsgs } = await supabase
            .from('chat_messages')
            .select('id')
            .in('group_id', groupIds)
            .neq('sender_id', userId);

        if (!allMsgs || allMsgs.length === 0) return 0;

        // 3. Ceux déjà marqués comme lus
        const msgIds = allMsgs.map(m => m.id);
        const { data: readStatuses } = await supabase
            .from('chat_message_status')
            .select('message_id')
            .eq('user_id', userId)
            .eq('is_read', true)
            .in('message_id', msgIds);

        const readCount = (readStatuses || []).length;
        return allMsgs.length - readCount;
    },

    // Créer le Canal Général par défaut s'il n'existe pas
    async ensureDefaultGroups() {
        // Utiliser .limit(1) au lieu de .maybeSingle() pour éviter que
        // des doublons existants (> 1 ligne) ne retournent null et créent un 3ème canal.
        const { data: existing } = await supabase
            .from('chat_groups')
            .select('id')
            .eq('type', 'public')
            .eq('name', 'Canal Général')
            .limit(1);

        if (!existing || existing.length === 0) {
            await supabase.from('chat_groups').insert([{
                name: 'Canal Général',
                type: 'public'
            }]);
        }
    },

    // Supprimer les doublons de "Canal Général" en ne gardant que le plus ancien
    async deduplicatePublicChannels() {
        const { data: generals } = await supabase
            .from('chat_groups')
            .select('id, created_at')
            .eq('type', 'public')
            .eq('name', 'Canal Général')
            .order('created_at', { ascending: true });

        if (!generals || generals.length <= 1) return;

        // Garder le premier (le plus ancien), supprimer le reste
        const toDelete = generals.slice(1).map(g => g.id);
        await supabase.from('chat_groups').delete().in('id', toDelete);
    }
};
