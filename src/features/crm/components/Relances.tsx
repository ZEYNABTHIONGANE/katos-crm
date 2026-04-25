 import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, AlertTriangle, CheckCircle2, ArrowRight, Calendar, Phone, ChevronDown, Search, X, Edit2, Trash2, Mail, FileText, MapPin, Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useContactStore } from '@/stores/contactStore';
import type { FollowUp } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const todayStr = fmt(today);

const Relances = () => {
    const { 
        contacts, followUps, visits, interactions,
        updateFollowUp, updateVisit, deleteFollowUp, deleteVisit, moveVisitStatut, addFollowUp 
    } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // ─── État modal Nouvelle Tâche ───────────────────────────────────────
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [newTaskForm, setNewTaskForm] = useState({
        contactId: '' as string | number,
        note: '',
        dateRelance: new Date().toISOString().split('T')[0],
        priorite: 'normale' as 'haute' | 'normale' | 'basse',
        type: 'note' as string,
    });
    const [isCreating, setIsCreating] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [showContactDropdown, setShowContactDropdown] = useState(false);

    // Tous les prospects (pas seulement les miens) pour la création de tâche
    const allContactsSorted = useMemo(() => {
        return [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }, [contacts]);

    const filteredContactOptions = useMemo(() => {
        if (!contactSearch.trim()) return allContactsSorted.slice(0, 50);
        return allContactsSorted.filter(c =>
            c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
            (c.company || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
            (c.phone || '').includes(contactSearch)
        ).slice(0, 30);
    }, [allContactsSorted, contactSearch]);

    const handleCreateTask = async () => {
        if (!newTaskForm.contactId || !newTaskForm.note.trim() || !newTaskForm.dateRelance) {
            showToast('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }
        setIsCreating(true);
        try {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            let statut: FollowUp['statut'] = 'upcoming';
            if (newTaskForm.dateRelance < todayStr) statut = 'retard';
            else if (newTaskForm.dateRelance === todayStr) statut = 'today';

            await addFollowUp({
                contactId: Number(newTaskForm.contactId),
                agent: user?.name || '',
                dateRelance: newTaskForm.dateRelance,
                // Préfixe le type dans la note pour une détection fiable au filtre
                note: `[${newTaskForm.type.toUpperCase()}] ${newTaskForm.note.trim()}`,
                statut,
                priorite: newTaskForm.priorite,
            });
            showToast('Tâche créée avec succès !');
            setShowNewTaskModal(false);
            setNewTaskForm({
                contactId: '',
                note: '',
                dateRelance: new Date().toISOString().split('T')[0],
                priorite: 'normale',
                type: 'note',
            });
            setContactSearch('');
        } catch (err) {
            console.error(err);
            showToast('Erreur lors de la création de la tâche', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    // Restriction d'accès : Seuls les commerciaux ont accès à "Mes Tâches"
    // Les admins et managers voient l'Historique global à la place.
    useEffect(() => {
        if (user && !['commercial'].includes(user.role)) {
            showToast("Accès restreint : Les administrateurs et managers consultent l'Historique global.", 'info');
            navigate('/historique');
        }
    }, [user, navigate, showToast]);

    const [filter, setFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showReportModal, setShowReportModal] = useState<null | { id: string, category: 'follow_up' | 'visit', interactionId?: string }>(null);
    const [showEditModal, setShowEditModal] = useState<any | null>(null);
    const [reportDate, setReportDate] = useState('');
    const [reportTime, setReportTime] = useState('09:00');
    const [editForm, setEditForm] = useState({ note: '', dateRelance: '', priorite: 'normale' });

    const getStatut = (dateStr: string, current: FollowUp['statut']): FollowUp['statut'] => {
        if (current === 'done') return 'done';
        if (dateStr < todayStr) return 'retard';
        if (dateStr === todayStr) return 'today';
        return 'upcoming';
    };

    const allActions = useMemo(() => {
        try {
            // Obtenir la date du jour pour calculer le statut en temps réel
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            const getDynamicStatut = (dateStr: string, currentStatut: string): 'retard' | 'today' | 'upcoming' | 'done' => {
                if (currentStatut === 'done' || currentStatut === 'completed') return 'done';
                if (!dateStr) return 'upcoming';
                if (dateStr < todayStr) return 'retard';
                if (dateStr === todayStr) return 'today';
                return 'upcoming';
            };

            const tasks = (followUps || []).map(f => {
                // Détection du type : priorité au préfixe [TYPE] dans la note, puis interactionId, puis mots-clés
                let type = 'note';
                const noteUpper = (f.note || '').toUpperCase();
                if (noteUpper.startsWith('[CALL]') || noteUpper.startsWith('[APPEL]')) {
                    type = 'call';
                } else if (noteUpper.startsWith('[RDV]') || noteUpper.startsWith('[RENDEZ-VOUS]')) {
                    type = 'rdv';
                } else if (noteUpper.startsWith('[VISITE]') || noteUpper.startsWith('[VISITE_TERRAIN]')) {
                    type = 'visite';
                } else if (noteUpper.startsWith('[EMAIL]')) {
                    type = 'email';
                } else if (noteUpper.startsWith('[NOTE]')) {
                    type = 'note';
                } else if (f.interactionId) {
                    const parent = (interactions || []).find(i => i.id === f.interactionId);
                    if (parent) {
                        type = parent.type === 'visite_terrain' || parent.type === 'visite_chantier' ? 'visite' : parent.type;
                    }
                } else if (/\bappel\b/i.test(f.note || '')) {
                    type = 'call';
                } else if (/\brdv\b|rendez-vous/i.test(f.note || '')) {
                    type = 'rdv';
                } else if (/\bvisite\b/i.test(f.note || '')) {
                    type = 'visite';
                } else if (/\bemail\b|\bmail\b/i.test(f.note || '')) {
                    type = 'email';
                }

                return { 
                    ...f, 
                    type,
                    statut: getDynamicStatut(f.dateRelance, f.statut),
                    category: 'follow_up' as const 
                };
            });

            const upcomingVisits = (visits || [])
                .filter(v => v.statut !== 'completed' && v.statut !== 'cancelled')
                .map(v => ({
                    id: v.id.toString(),
                    contactId: v.contactId,
                    agent: v.agent,
                    dateRelance: v.date,
                    note: `[${(v.type || '').toUpperCase()}] ${v.title || ''}`,
                    type: v.type === 'bureau' ? 'rdv' : 'visite',
                    statut: getDynamicStatut(v.date, v.statut),
                    priorite: 'normale' as const,
                    category: 'visit' as const,
                    originalVisit: v
                }));

            const completedVisits = (visits || [])
                .filter(v => v.statut === 'completed')
                .map(v => ({
                    id: v.id.toString(),
                    contactId: v.contactId,
                    agent: v.agent,
                    dateRelance: v.date,
                    note: `[${(v.type || '').toUpperCase()}] ${v.title || ''}`,
                    type: v.type === 'bureau' ? 'rdv' : 'visite',
                    statut: 'done' as const,
                    priorite: 'normale' as const,
                    category: 'visit' as const,
                    originalVisit: v
                }));

            return [...tasks, ...upcomingVisits, ...completedVisits];
        } catch (err) {
            console.error("Error calculating allActions:", err);
            return [];
        }
    }, [followUps, visits, interactions]);

    const filteredRelances = useMemo(() => {
        try {
            const query = searchQuery.toLowerCase().trim();
            return allActions
                .filter(r => {
                    const contact = (contacts || []).find(c => c.id === r.contactId);
                    
                    // "Mes Tâches" is strictly personal for everyone
                    const agentNorm = (r.agent || '').trim().toLowerCase();
                    const userNameNorm = (user?.name || '').trim().toLowerCase();
                    if (agentNorm !== userNameNorm) return false;

                    // Filtre par statut (via les cartes de stats)
                    const matchesStatus = filter === 'all' || r.statut === filter;
                    if (!matchesStatus) return false;

                    // Filtre par catégorie/type (unifié)
                    const matchesType = typeFilter === 'all' || (r as any).type === typeFilter;
                    if (!matchesType) return false;

                    if (!query) return true;

                    const contactName = contact?.name.toLowerCase() || '';
                    const note = (r.note || '').toLowerCase();
                    return contactName.includes(query) || note.includes(query);
                })
                .sort((a, b) => {
                    try {
                        const order = { retard: 0, today: 1, upcoming: 2, done: 3 };
                        if (order[a.statut] !== order[b.statut]) return order[a.statut] - order[b.statut];
                        return new Date(a.dateRelance).getTime() - new Date(b.dateRelance).getTime();
                    } catch { return 0; }
                });
        } catch (err) {
            console.error("Error calculating filteredRelances:", err);
            return [];
        }
    }, [allActions, filter, typeFilter, searchQuery, contacts, user]);

    const markDone = (item: any) => {
        if (item.category === 'visit') {
            moveVisitStatut(Number(item.id), 'completed');
        } else {
            updateFollowUp(item.id, { statut: 'done' });
        }
        showToast('Tâche marquée comme effectuée');
    };

    const handleReport = () => {
        if (!showReportModal) return;
        const newStatut = getStatut(reportDate, (showReportModal as any).statut || 'upcoming');
        
        if (showReportModal.category === 'visit') {
            const visitStatut = newStatut === 'done' ? 'completed' : 
                               (newStatut === 'retard' ? 'upcoming' : newStatut);
            
            updateVisit(Number(showReportModal.id), {
                date: reportDate,
                heure: reportTime,
                statut: visitStatut
            });
            showToast('RDV/Visite reporté(e) avec succès');
        } else {
            updateFollowUp(showReportModal.id, {
                dateRelance: reportDate,
                statut: newStatut
            });
            showToast('Tâche de rappel reportée avec succès');
        }
        setShowReportModal(null);
    };

    const handleEdit = (r: any) => {
        if (r.category === 'visit') {
            navigate(`/prospects/${r.contactId}`);
            return;
        }
        setShowEditModal(r);
        setEditForm({
            note: r.note,
            dateRelance: r.dateRelance,
            priorite: (r as any).priorite || 'normale'
        });
    };

    const handleSaveEdit = () => {
        if (!showEditModal) return;
        updateFollowUp(showEditModal.id, {
            ...editForm,
            statut: getStatut(editForm.dateRelance, (showEditModal as any).statut)
        } as Partial<FollowUp>);
        showToast('Tâche mise à jour');
        setShowEditModal(null);
    };

    const handleDelete = (item: any) => {
        if (window.confirm('Voulez-vous vraiment supprimer cette tâche ?')) {
            if (item.category === 'visit') {
                deleteVisit(Number(item.id));
            } else {
                deleteFollowUp(item.id);
            }
            showToast('Tâche supprimée');
        }
    };

    const count = (s: string) => {
        const userNameNorm = (user?.name || '').trim().toLowerCase();
        const myActions = allActions.filter(r => (r.agent || '').trim().toLowerCase() === userNameNorm);
        
        if (s === 'retard') {
            return myActions.filter(r => r.statut === 'retard' || (r.statut !== 'done' && r.dateRelance < todayStr)).length;
        }
        return myActions.filter(r => r.statut === s).length;
    };

    const getUrgencyLabel = (r: FollowUp) => {
        try {
            if (r.statut === 'done') return { label: 'Effectuée', cls: 'tag-done' };
            if (r.statut === 'today') return { label: "Aujourd'hui", cls: 'tag-today' };
            
            const relanceDate = new Date(r.dateRelance);
            if (isNaN(relanceDate.getTime())) return { label: 'Date invalide', cls: 'tag-upcoming' };

            if (r.statut === 'retard') {
                const dc = Math.round((today.getTime() - relanceDate.getTime()) / 86400000);
                return { label: `En retard de ${dc}j`, cls: 'tag-retard' };
            }
            const dc = Math.round((relanceDate.getTime() - today.getTime()) / 86400000);
            return { label: `Dans ${dc}j`, cls: 'tag-upcoming' };
        } catch {
            return { label: '...', cls: 'tag-upcoming' };
        }
    };

    const getPrioriteLabel = (p: string) => {
        if (p === 'haute') return <span className="prio prio-haute">Haute</span>;
        if (p === 'normale') return <span className="prio prio-normale">Normale</span>;
        return <span className="prio prio-basse">Basse</span>;
    };

    return (
        <div className="relances-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Mes Tâches</h1>
                    <p className="subtitle">Suivez vos actions de suivi classées par urgence</p>
                </div>
                <button className="btn-primary" onClick={() => setShowNewTaskModal(true)}>
                    <Plus size={18} /> Nouvelle tâche
                </button>
            </div>

            {/* Stats — chaque carte réinitialise le filtre par type */}
            <div className="relances-stats">
                <div className={`rstat retard ${filter === 'retard' ? 'active' : ''}`} onClick={() => { setFilter(f => f === 'retard' ? 'all' : 'retard'); setTypeFilter('all'); }}>
                    <AlertTriangle size={22} />
                    <div><div className="rstat-num">{count('retard')}</div><div className="rstat-lbl">En retard</div></div>
                </div>
                <div className={`rstat today ${filter === 'today' ? 'active' : ''}`} onClick={() => { setFilter(f => f === 'today' ? 'all' : 'today'); setTypeFilter('all'); }}>
                    <ClipboardCheck size={22} />
                    <div><div className="rstat-num">{count('today')}</div><div className="rstat-lbl">Aujourd'hui</div></div>
                </div>
                <div className={`rstat upcoming ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => { setFilter(f => f === 'upcoming' ? 'all' : 'upcoming'); setTypeFilter('all'); }}>
                    <Clock size={22} />
                    <div><div className="rstat-num">{count('upcoming')}</div><div className="rstat-lbl">À venir</div></div>
                </div>
                <div className={`rstat done ${filter === 'done' ? 'active' : ''}`} onClick={() => { setFilter(f => f === 'done' ? 'all' : 'done'); setTypeFilter('all'); }}>
                    <CheckCircle2 size={22} />
                    <div><div className="rstat-num">{count('done')}</div><div className="rstat-lbl">Effectuées</div></div>
                </div>
            </div>

            <div className="relances-controls">
                <div className="relances-filters">
                    {[
                        { k: 'all', l: 'Toutes les tâches', icon: <ClipboardCheck size={16} /> },
                        { k: 'call', l: 'Appels', icon: <Phone size={16} /> },
                        { k: 'visite', l: 'Visites', icon: <MapPin size={16} /> },
                        { k: 'rdv', l: 'Rendez-vous', icon: <Calendar size={16} /> },
                        { k: 'email', l: 'Emails', icon: <Mail size={16} /> },
                        { k: 'note', l: 'Notes / Rappels', icon: <FileText size={16} /> },
                    ].map(f => (
                        <button 
                            key={f.k} 
                            className={`filter-btn ${typeFilter === f.k ? 'active' : ''}`} 
                            onClick={() => { setTypeFilter(f.k); setFilter('all'); }}
                        >
                            {f.icon} {f.l}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Indicateur des filtres actifs + bouton reset */}
                    {(filter !== 'all' || typeFilter !== 'all' || searchQuery) && (
                        <button
                            onClick={() => { setFilter('all'); setTypeFilter('all'); setSearchQuery(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'rgba(233,108,46,0.1)', color: '#E96C2E',
                                border: '1px solid rgba(233,108,46,0.3)', borderRadius: 8,
                                padding: '0.4rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            <X size={14} /> Réinitialiser les filtres
                        </button>
                    )}
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Rechercher par client ou note..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={() => setSearchQuery('')}>
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Liste */}
            <div className="relances-list">
                {filteredRelances.length === 0 && (
                    <div className="empty-relances">
                        <ClipboardCheck size={40} />
                        <p>
                            {filter !== 'all' && typeFilter !== 'all'
                                ? `Aucune tâche de type sélectionné dans cette période.`
                                : filter !== 'all'
                                ? `Aucune tâche « ${filter === 'retard' ? 'en retard' : filter === 'today' ? "d'aujourd'hui" : filter === 'upcoming' ? 'à venir' : 'effectuée'} ».`
                                : typeFilter !== 'all'
                                ? `Aucune tâche de ce type trouvée.`
                                : searchQuery
                                ? `Aucun résultat pour « ${searchQuery} ».`
                                : `Aucune tâche pour le moment.`
                            }
                        </p>
                        {(filter !== 'all' || typeFilter !== 'all' || searchQuery) && (
                            <button
                                className="btn-secondary"
                                style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
                                onClick={() => { setFilter('all'); setTypeFilter('all'); setSearchQuery(''); }}
                            >
                                Voir toutes mes tâches
                            </button>
                        )}
                    </div>
                )}
                {filteredRelances.map(r => {
                    const contact = contacts.find(c => c.id === r.contactId);
                    if (!contact) return null;
                    const urg = getUrgencyLabel(r);
                    return (
                        <div key={r.id} className={`relance-card ${r.statut === 'retard' ? 'card-retard' : r.statut === 'today' ? 'card-today' : r.statut === 'done' ? 'card-done' : ''}`}>
                            <div className="relance-left">
                                <div className={`urgency-tag ${urg.cls}`}>{urg.label}</div>
                                <div className="relance-avatar">{contact.name.charAt(0)}</div>
                                <div 
                                    className="relance-contact-clickable" 
                                    onClick={() => navigate(`/prospects/${contact.id}`)}
                                    title="Voir la fiche client"
                                >
                                    <span className="relance-name">{contact.name}</span>
                                    <span className="relance-company">{contact.company}</span>
                                </div>
                                <span className="relance-phone"><Phone size={12} /> {contact.phone}</span>
                            </div>

                            <div className="relance-center">
                                <p className="relance-note">{r.note}</p>
                                <div className="relance-meta">
                                    <span className="date-main-badge"><Calendar size={13} /> {new Date(r.dateRelance).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                    <span className="type-action-badge">
                                        {(r as any).type === 'call' && <><Phone size={12} /> Appel</>}
                                        {(r as any).type === 'visite' && <><MapPin size={12} /> Visite</>}
                                        {(r as any).type === 'rdv' && <><Calendar size={12} /> RDV</>}
                                        {(r as any).type === 'email' && <><Mail size={12} /> Email</>}
                                        {(r as any).type === 'note' && <><FileText size={12} /> Rappel</>}
                                    </span>
                                    <span>Agent : {r.agent || 'Non assigné'}</span>
                                    {getPrioriteLabel(r.priorite)}
                                </div>
                            </div>

                            <div className="relance-actions">
                                {r.statut !== 'done' && (
                                    <>
                                        <button className="btn-primary btn-sm" onClick={() => markDone(r)}>
                                            <CheckCircle2 size={14} /> Effectuée
                                        </button>
                                        <button className="btn-outline btn-sm" onClick={() => { 
                                            setShowReportModal(r as any); 
                                            setReportDate(r.dateRelance);
                                            setReportTime((r as any).heure || '09:00'); 
                                        }}>
                                            <ChevronDown size={14} /> Reporter
                                        </button>
                                        {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur' || user?.name === r.agent) && (
                                            <button
                                                className="btn-sm"
                                                style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '6px', padding: '0.3rem 0.7rem', fontWeight: 600, cursor: 'pointer' }}
                                                onClick={() => handleEdit(r)}
                                            >
                                                <Edit2 size={14} /> {r.category === 'visit' ? 'Détails' : 'Modifier'}
                                            </button>
                                        )}
                                    </>
                                )}
                                <button className="btn-outline btn-sm" style={{ color: '#E96C2E', borderColor: '#E96C2E' }} onClick={() => navigate(`/prospects/${contact.id}`)}>
                                    <ArrowRight size={14} /> Voir fiche
                                </button>
                                <button
                                    className="btn-sm"
                                    style={{ background: 'transparent', border: 'none', color: '#ff4d4f', padding: '0.3rem', cursor: 'pointer' }}
                                    onClick={() => handleDelete(r)}
                                    title="Supprimer la tâche"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {r.statut === 'done' && (
                                    <span className="done-badge"><CheckCircle2 size={16} /> Terminée</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ---- Modale Reporter ---- */}
            <Modal isOpen={!!showReportModal} onClose={() => setShowReportModal(null)} title="Reporter la tâche" size="sm">
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Reporter la tâche à une nouvelle date :
                </p>
                <div className="form-grid col-2">
                    <div className="form-group">
                        <label className="form-label">Nouvelle date</label>
                        <input className="form-input" type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} min={todayStr} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nouvelle heure</label>
                        <input className="form-input" type="time" value={reportTime} onChange={e => setReportTime(e.target.value)} />
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowReportModal(null)}>Annuler</button>
                    <button className="btn-primary" onClick={handleReport}>Confirmer le report</button>
                </div>
            </Modal>

            {/* ---- Modale Modifier ---- */}
            <Modal isOpen={!!showEditModal} onClose={() => setShowEditModal(null)} title="Modifier la tâche" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Note / Description</label>
                        <textarea 
                            className="form-textarea" 
                            value={editForm.note} 
                            onChange={e => setEditForm({ ...editForm, note: e.target.value })} 
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date d'échéance</label>
                        <input 
                            className="form-input" 
                            type="date" 
                            value={editForm.dateRelance} 
                            onChange={e => setEditForm({ ...editForm, dateRelance: e.target.value })} 
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Priorité</label>
                        <select 
                            className="form-select" 
                            value={editForm.priorite} 
                            onChange={e => setEditForm({ ...editForm, priorite: e.target.value as any })}
                        >
                            <option value="basse">Basse</option>
                            <option value="normale">Normale</option>
                            <option value="haute">Haute</option>
                        </select>
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowEditModal(null)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSaveEdit}>Enregistrer les modifications</button>
                </div>
            </Modal>

            {/* ---- Modale Nouvelle Tâche ---- */}
            <Modal isOpen={showNewTaskModal} onClose={() => { setShowNewTaskModal(false); setContactSearch(''); }} title="Nouvelle tâche" size="md">
                <div className="form-grid">
                    <div className="form-group col-2" style={{ position: 'relative' }}>
                        <label className="form-label">Prospect concerné * <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>({allContactsSorted.length} disponibles)</span></label>
                        <input
                            className="form-input"
                            placeholder="Taper pour rechercher, ou cliquer pour voir la liste..."
                            value={contactSearch}
                            onFocus={() => setShowContactDropdown(true)}
                            onBlur={() => setTimeout(() => setShowContactDropdown(false), 180)}
                            onChange={e => {
                                setContactSearch(e.target.value);
                                setNewTaskForm(f => ({ ...f, contactId: '' }));
                                setShowContactDropdown(true);
                            }}
                            autoComplete="off"
                        />
                        {/* Dropdown toujours visible au focus, filtré si recherche */}
                        {showContactDropdown && !newTaskForm.contactId && (
                            <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto', position: 'absolute', zIndex: 200, width: '100%', top: '100%', left: 0, marginTop: 2 }}>
                                {filteredContactOptions.length === 0 ? (
                                    <div style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Aucun prospect trouvé</div>
                                ) : (
                                    filteredContactOptions.map(c => (
                                        <div
                                            key={c.id}
                                            onMouseDown={() => {
                                                setNewTaskForm(f => ({ ...f, contactId: c.id }));
                                                setContactSearch(c.name + (c.company ? ` — ${c.company}` : ''));
                                                setShowContactDropdown(false);
                                            }}
                                            style={{ padding: '0.55rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-soft)', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                        >
                                            <span>
                                                <span style={{ fontWeight: 600 }}>{c.name}</span>
                                                {c.company && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.78rem' }}>{c.company}</span>}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{c.assignedAgent || '—'}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        {newTaskForm.contactId && (
                            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>✓ Prospect sélectionné</span>
                                <button
                                    type="button"
                                    onClick={() => { setNewTaskForm(f => ({ ...f, contactId: '' })); setContactSearch(''); setShowContactDropdown(true); }}
                                    style={{ background: 'none', border: 'none', color: '#E96C2E', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                                >
                                    Changer
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Type d'action</label>
                        <select
                            className="form-select"
                            value={newTaskForm.type}
                            onChange={e => setNewTaskForm(f => ({ ...f, type: e.target.value }))}
                        >
                            <option value="note">📝 Rappel / Note</option>
                            <option value="call">📞 Appel à faire</option>
                            <option value="rdv">📅 Rendez-vous</option>
                            <option value="visite">📍 Visite terrain</option>
                            <option value="email">📧 Email à envoyer</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Priorité</label>
                        <select
                            className="form-select"
                            value={newTaskForm.priorite}
                            onChange={e => setNewTaskForm(f => ({ ...f, priorite: e.target.value as any }))}
                        >
                            <option value="basse">🟢 Basse</option>
                            <option value="normale">🟡 Normale</option>
                            <option value="haute">🔴 Haute</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date d'échéance *</label>
                        <input
                            className="form-input"
                            type="date"
                            value={newTaskForm.dateRelance}
                            onChange={e => setNewTaskForm(f => ({ ...f, dateRelance: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="form-group col-2">
                        <label className="form-label">Description / Note *</label>
                        <textarea
                            className="form-textarea"
                            style={{ minHeight: 80 }}
                            placeholder="Que faut-il faire ? (ex: Rappeler pour confirmer le RDV, Envoyer la proposition...)"
                            value={newTaskForm.note}
                            onChange={e => setNewTaskForm(f => ({ ...f, note: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => { setShowNewTaskModal(false); setContactSearch(''); }}>Annuler</button>
                    <button className="btn-primary" onClick={handleCreateTask} disabled={isCreating}>
                        {isCreating ? 'Création...' : 'Créer la tâche'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Relances;

// --- CSS Supplémentaire ---
const relancesStyles = `
.date-main-badge {
    background: rgba(43, 46, 131, 0.08);
    color: #2B2E83;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid rgba(43, 46, 131, 0.15);
}
.card-retard .date-main-badge {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.2);
}
.relances-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem !important;
}
.filter-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #4b5563;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.filter-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
}
.filter-btn.active {
    background: #f3f4ff;
    border-color: #2b2e83;
    color: #2b2e83;
}
.type-action-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #f3f4f6;
    color: #4b5563;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = relancesStyles;
    document.head.appendChild(style);
}
