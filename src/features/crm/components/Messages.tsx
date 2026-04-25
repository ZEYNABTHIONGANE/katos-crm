import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useChat } from '@/app/providers/ChatProvider';
import { chatApi } from '../api/chatApi';
import type { ChatGroup, ChatMessage, Folder } from '../api/chatApi';
import { supabase } from '@/lib/supabaseClient';
import {
    Send, MessageSquare, Star, Search,
    Smile, Plus, Inbox, SendHorizonal, Trash2,
    RefreshCw, ArrowLeft, ChevronLeft
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import AgentSelectorModal from './AgentSelectorModal.tsx';
import '@/styles/features/_chat.scss';

const Messages = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { refreshUnreadCount } = useChat();

    // État des dossiers et navigation
    const [folder, setFolder] = useState<Folder>('inbox');
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [folderCounts, setFolderCounts] = useState({ inbox: 0, sent: 0, trash: 0, important: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    // État de la conversation sélectionnée
    const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessage[]>>({});

    // État de saisie
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const commonEmojis = ['😊', '👍', '🙏', '🔥', '🎉', '🚀', '✅', '❤️', '🤔', '🤝'];

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /* ──────────────── Init ──────────────── */
    useEffect(() => {
        if (user) initChat();
    }, [user]);

    useEffect(() => {
        if (user) loadGroups();
    }, [folder]);

    /* ──────────────── Temps réel ──────────────── */
    useEffect(() => {
        if (!selectedGroup) return;
        loadMessages(selectedGroup.id);
        if (user) chatApi.markGroupAsRead(selectedGroup.id, user.id).then(() => {
            loadGroups();
            refreshUnreadCount();
        });

        const channel = supabase
            .channel(`chat:${selectedGroup.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'chat_messages',
                filter: `group_id=eq.${selectedGroup.id}`
            }, async (payload) => {
                const newMsg = payload.new as ChatMessage;
                
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;

                    if (user && newMsg.sender_id === user.id) {
                        const filtered = prev.filter(m => !m.id.toString().startsWith('temp-'));
                        return [...filtered, {
                            ...newMsg,
                            sender_name: user.name || 'Moi',
                            sender_role: user.role || 'Agent'
                        }];
                    }

                    return [...prev, { ...newMsg, sender_name: '...' }];
                });

                if (user && newMsg.sender_id !== user.id) {
                    const { data: profile } = await supabase.from('profiles')
                        .select('name, role').eq('id', newMsg.sender_id).single();
                    
                    setMessages(prev => prev.map(m => 
                        m.id === newMsg.id 
                        ? { ...m, sender_name: profile?.name || 'Inconnu', sender_role: profile?.role || 'Agent' }
                        : m
                    ));

                    chatApi.markGroupAsRead(selectedGroup.id, user.id).then(() => {
                        loadGroups();
                        refreshUnreadCount();
                    });
                } else {
                    loadGroups();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedGroup?.id]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const initChat = async () => {
        try {
            setIsLoading(true);
            // Nettoyer les doublons existants puis s'assurer que le canal existe
            await chatApi.deduplicatePublicChannels();
            await chatApi.ensureDefaultGroups();
            await loadGroups();
        } catch (err) {
            showToast('Impossible de charger la messagerie', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadGroups = async () => {
        if (!user) return;
        const [inbox, sent, trash, important] = await Promise.all([
            chatApi.fetchGroupsForFolder(user.id, 'inbox'),
            chatApi.fetchGroupsForFolder(user.id, 'sent'),
            chatApi.fetchGroupsForFolder(user.id, 'trash'),
            chatApi.fetchGroupsForFolder(user.id, 'important'),
        ]);
        const unreadTotal = inbox.reduce((acc, g) => acc + (g.unread_count || 0), 0);
        setFolderCounts({ 
            inbox: unreadTotal, 
            sent: 0, 
            trash: trash.length,
            important: important.length 
        });

        if (folder === 'inbox') setGroups(inbox);
        else if (folder === 'sent') setGroups(sent);
        else if (folder === 'important') setGroups(important);
        else setGroups(trash);
    };

    const loadMessages = async (groupId: string, useCache = true) => {
        // 1. Essayer de charger depuis le cache pour une réponse instantanée
        if (useCache && messagesCache[groupId]) {
            setMessages(messagesCache[groupId]);
        } else if (!useCache || !messagesCache[groupId]) {
            // Si pas de cache ou forcé, on peut vider l'écran ou garder l'ancien
            // setMessages([]); 
        }

        // 2. Charger les messages frais en arrière-plan
        try {
            const msgs = await chatApi.fetchMessages(groupId);
            setMessages(msgs);
            setMessagesCache(prev => ({ ...prev, [groupId]: msgs }));
        } catch (err) {
            console.error('Erreur chargement messages:', err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedGroup || !user || isSending) return;

        const content = newMessage.trim();
        const tempId = 'temp-' + Date.now();

        const optimisticMsg: ChatMessage = {
            id: tempId,
            group_id: selectedGroup.id,
            sender_id: user.id,
            content: content,
            created_at: new Date().toISOString(),
            sender_name: user.name || 'Moi',
            sender_role: user.role || 'Agent'
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        
        const textarea = (e.target as any).querySelector('textarea');
        if (textarea) textarea.style.height = '44px';

        try {
            setIsSending(true);
            await chatApi.sendMessage(selectedGroup.id, user.id, content);
            loadGroups(); 
        } catch (err: any) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(content);
            showToast(err.message || 'Échec de l\'envoi', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleNewDiscussion = async (agentIds: string[]) => {
        try {
            const groupId = await chatApi.getOrCreateGroup(agentIds, user!.id);
            await loadGroups();
            const { data: g } = await supabase.from('chat_groups').select('*').eq('id', groupId).single();
            if (g) {
                setFolder('sent');
                setSelectedGroup(g);
            }
            setShowNewChatModal(false);
        } catch (err: any) {
            showToast(err.message || 'Erreur lors de la création', 'error');
        }
    };

    const handleToggleStar = async (groupId: string, newState: boolean) => {
        if (!user) return;
        try {
            await chatApi.toggleStar(groupId, user.id, newState);
            await loadGroups();
            if (selectedGroup?.id === groupId) {
                setSelectedGroup(prev => prev ? { ...prev, is_important: newState } : null);
            }
        } catch (err: any) {
            showToast('Erreur lors de la mise à jour des favoris', 'error');
        }
    };

    const handleTrash = async (group: ChatGroup, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        try {
            await chatApi.moveThreadToTrash(group.id, user.id);
            showToast('Discussion déplacée dans la corbeille', 'success');
            if (selectedGroup?.id === group.id) setSelectedGroup(null);
            await loadGroups();
        } catch (err: any) {
            showToast(err.message || 'Impossible de déplacer vers la corbeille', 'error');
        }
    };

    const handleRestore = async (group: ChatGroup, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        await chatApi.restoreThreadFromTrash(group.id, user.id);
        showToast('Discussion restaurée', 'success');
        loadGroups();
    };

    const handlePermanentDelete = async (group: ChatGroup, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        if (!window.confirm('Supprimer définitivement cette discussion ? Cette action est irréversible.')) return;
        await chatApi.permanentlyDeleteThread(group.id, user.id);
        showToast('Discussion supprimée définitivement', 'success');
        if (selectedGroup?.id === group.id) setSelectedGroup(null);
        loadGroups();
    };

    const getGroupTitle = (group: ChatGroup) => group.display_name || group.name || 'Discussion';
    const getInitial = (title: string) => title.replace(/[#🔒]/g, '').trim().charAt(0).toUpperCase() || '?';

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        if (d.toDateString() === now.toDateString())
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    };

    const folderConfig = [
        { key: 'inbox' as Folder, label: 'Réception', icon: <Inbox size={17} />, count: folderCounts.inbox },
        { key: 'important' as Folder, label: 'Important', icon: <Star size={17} />, count: folderCounts.important },
        { key: 'sent' as Folder, label: 'Envoyés', icon: <SendHorizonal size={17} />, count: 0 },
        { key: 'trash' as Folder, label: 'Corbeille', icon: <Trash2 size={17} />, count: folderCounts.trash },
    ];

    if (isLoading) {
        return (
            <div className="mailbox-loading">
                <div className="spinner" />
                <p>Chargement de la messagerie…</p>
            </div>
        );
    }

    return (
        <div className={`mailbox-container app-fade-in ${selectedGroup ? 'has-selection' : ''} ${isMobileView ? 'mobile-mode' : ''}`}>
            {/* ── Colonne 1 : Dossiers ── */}
            <aside className="mailbox-sidebar">
                <div className="mailbox-sidebar-header">
                    <h2>Messagerie</h2>
                </div>

                <button className="mailbox-compose-btn" onClick={() => setShowNewChatModal(true)}>
                    <Plus size={18} />
                    <span>Nouveau message</span>
                </button>

                <div className="sidebar-section-label">Dossiers</div>
                <nav className="mailbox-folders">
                    {folderConfig.map(f => (
                        <button
                            key={f.key}
                            className={`mailbox-folder-btn ${folder === f.key ? 'active' : ''}`}
                            onClick={() => { setFolder(f.key); setSelectedGroup(null); }}
                        >
                            <span className="folder-icon">{f.icon}</span>
                            <span className="folder-label">{f.label}</span>
                            {f.count > 0 && <span className="folder-badge">{f.count}</span>}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* ── Colonne 2 : Liste des conversations ── */}
            <section className="mailbox-list">
                <div className="mailbox-list-header">
                    <div className="list-header-top">
                        <h3>
                            {folder === 'inbox' && 'Réception'}
                            {folder === 'important' && 'Important'}
                            {folder === 'sent' && 'Envoyés'}
                            {folder === 'trash' && 'Corbeille'}
                        </h3>
                        <button className="icon-btn small" onClick={() => loadGroups()} title="Rafraîchir">
                            <RefreshCw size={15} />
                        </button>
                    </div>
                </div>

                <div className="mailbox-search-area">
                    <Search size={16} />
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="mailbox-thread-list">
                    {groups.filter(g => {
                        if (!searchTerm) return true;
                        const title = getGroupTitle(g).toLowerCase();
                        const lastMsg = (g.last_message || '').toLowerCase();
                        return title.includes(searchTerm.toLowerCase()) || lastMsg.includes(searchTerm.toLowerCase());
                    }).map(group => {
                        const title = getGroupTitle(group);
                        const isSelected = selectedGroup?.id === group.id;
                        const hasUnread = (group.unread_count || 0) > 0;
                        return (
                            <div
                                key={group.id}
                                className={`mailbox-thread ${isSelected ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
                                onClick={() => setSelectedGroup(group)}
                            >
                                <div className="thread-avatar-lg">
                                    {group.type === 'public' ? '#' : getInitial(title)}
                                </div>
                                <div className="thread-body">
                                    <div className="thread-top">
                                        <span className="thread-title">{title}</span>
                                        <span className="thread-date">{formatTime(group.last_message_at)}</span>
                                    </div>
                                    <div className="thread-content-row">
                                        <span className="thread-preview">
                                            {group.last_sender ? <strong>{group.last_sender.split(' ')[0]}: </strong> : ''}
                                            {group.last_message || 'Nouvelle discussion'}
                                        </span>
                                        {hasUnread && <div className="unread-dot" />}
                                    </div>
                                    <div className="thread-actions" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button 
                                            className={`star-icon ${group.is_important ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggleStar(group.id, !group.is_important); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            <Star size={14} fill={group.is_important ? "#fbbf24" : "none"} stroke={group.is_important ? "#fbbf24" : "#94a3b8"} />
                                        </button>

                                        {folder !== 'trash' && group.type !== 'public' && (
                                            <button 
                                                className="thread-del-btn" 
                                                onClick={e => { e.stopPropagation(); handleTrash(group, e); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                        
                                        {folder === 'trash' && (
                                            <>
                                                <button 
                                                    className="thread-restore-btn" 
                                                    onClick={e => { e.stopPropagation(); handleRestore(group, e); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                                                >
                                                    <ArrowLeft size={13} />
                                                </button>
                                                <button 
                                                    className="thread-del-btn danger" 
                                                    onClick={e => { e.stopPropagation(); handlePermanentDelete(group, e); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ef4444' }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Colonne 3 : Conversation ── */}
            <section className="mailbox-detail">
                {selectedGroup ? (
                    <>
                        <div className="detail-header">
                            <button className="icon-btn back-to-list-mobile" onClick={() => setSelectedGroup(null)} title="Retour">
                                <ArrowLeft size={20} />
                            </button>
                            <button className="icon-btn close-detail-desktop" onClick={() => setSelectedGroup(null)} title="Fermer">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="detail-avatar">
                                {selectedGroup.type === 'public' ? '#' : getInitial(getGroupTitle(selectedGroup))}
                            </div>
                            <div className="detail-info">
                                <h3>{getGroupTitle(selectedGroup)}</h3>
                                <span>{selectedGroup.type === 'public' ? 'Canal ouvert' : 'Privé'}</span>
                            </div>
                            <div className="detail-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                                <button 
                                    className={`icon-btn ${selectedGroup.is_important ? 'active' : ''}`}
                                    onClick={() => handleToggleStar(selectedGroup.id, !selectedGroup.is_important)}
                                    title={selectedGroup.is_important ? "Retirer des favoris" : "Marquer comme important"}
                                >
                                    <Star size={20} fill={selectedGroup.is_important ? "#fbbf24" : "none"} stroke={selectedGroup.is_important ? "#fbbf24" : "currentColor"} />
                                </button>
                            </div>
                        </div>

                        <div className="detail-messages">
                            {messages.map((msg, i) => {
                                const isMe = msg.sender_id === user?.id;
                                const showMeta = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
                                return (
                                    <div key={msg.id} className={`msg-row ${isMe ? 'mine' : ''} ${msg.id.toString().startsWith('temp-') ? 'sending' : ''}`}>
                                        {!isMe && showMeta && <div className="msg-avatar">{(msg.sender_name || '?').charAt(0)}</div>}
                                        {!isMe && !showMeta && <div className="msg-avatar-spacer" />}
                                        <div className="msg-block">
                                            {!isMe && showMeta && <div className="msg-sender">{msg.sender_name} <span className="msg-role">{msg.sender_role}</span></div>}
                                            <div className="msg-bubble">
                                                <span className="msg-text">{msg.content}</span>
                                                <span className="msg-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {folder !== 'trash' ? (
                            <form className="detail-input" onSubmit={handleSendMessage}>
                                <div className="input-wrapper">
                                    <textarea
                                        placeholder="Écrivez votre message..."
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e as any);
                                            }
                                        }}
                                        rows={1}
                                    />
                                    <div className="input-toolbar">
                                        <button type="button" className="icon-btn small" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                            <Smile size={18} />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="emoji-picker">
                                                {commonEmojis.map(e => (
                                                    <button key={e} type="button" onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }}>
                                                        {e}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button type="submit" className="send-btn" disabled={!newMessage.trim() || isSending}>
                                    <Send size={18} />
                                    <span>Envoyer</span>
                                </button>
                            </form>
                        ) : (
                            <div className="trash-notice">
                                <Trash2 size={15} /><span>Discussion supprimée.</span>
                                <button onClick={e => handleRestore(selectedGroup, e)}><ArrowLeft size={13} /> Restaurer</button>
                                <button
                                    className="trash-delete-btn"
                                    onClick={e => handlePermanentDelete(selectedGroup, e)}
                                >
                                    <Trash2 size={13} /> Supprimer définitivement
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="detail-placeholder">
                        <MessageSquare size={56} opacity={0.12} />
                        <p>Sélectionnez une discussion</p>
                        <button className="mailbox-compose-btn-inline" onClick={() => setShowNewChatModal(true)}><Plus size={16} /> Nouveau message</button>
                    </div>
                )}
            </section>

            {showNewChatModal && <AgentSelectorModal onClose={() => setShowNewChatModal(false)} onSelect={handleNewDiscussion} excludeUserId={user?.id} />}
        </div>
    );
};

export default Messages;
