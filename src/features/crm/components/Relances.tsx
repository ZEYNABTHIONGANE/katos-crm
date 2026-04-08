 import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, AlertTriangle, CheckCircle2, ArrowRight, Calendar, Phone, ChevronDown, Search, X, Edit2, Trash2 } from 'lucide-react';
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
        contacts, followUps, visits, 
        updateFollowUp, updateVisit, deleteFollowUp, deleteVisit, moveVisitStatut 
    } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // Restriction d'accès : Seuls les commerciaux ont accès à "Mes Tâches"
    // Les admins et managers voient l'Historique global à la place.
    useEffect(() => {
        if (user && !['commercial'].includes(user.role)) {
            showToast("Accès restreint : Les administrateurs et managers consultent l'Historique global.", 'info');
            navigate('/historique');
        }
    }, [user, navigate, showToast]);

    const [filter, setFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'follow_up' | 'visit'>('all');
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
        // Obtenir la date du jour pour calculer le statut en temps réel
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const getDynamicStatut = (dateStr: string, currentStatut: string): 'retard' | 'today' | 'upcoming' | 'done' => {
            if (currentStatut === 'done' || currentStatut === 'completed') return 'done';
            if (dateStr < todayStr) return 'retard';
            if (dateStr === todayStr) return 'today';
            return 'upcoming';
        };

        const tasks = followUps.map(f => ({ 
            ...f, 
            statut: getDynamicStatut(f.dateRelance, f.statut),
            category: 'follow_up' as const 
        }));

        const upcomingVisits = visits
            .filter(v => v.statut !== 'completed' && v.statut !== 'cancelled')
            .map(v => ({
                id: v.id.toString(),
                contactId: v.contactId,
                agent: v.agent,
                dateRelance: v.date,
                note: `[${v.type.toUpperCase()}] ${v.title}`,
                statut: getDynamicStatut(v.date, v.statut),
                priorite: 'normale' as const,
                category: 'visit' as const,
                originalVisit: v
            }));

        const completedVisits = visits
            .filter(v => v.statut === 'completed')
            .map(v => ({
                id: v.id.toString(),
                contactId: v.contactId,
                agent: v.agent,
                dateRelance: v.date,
                note: `[${v.type.toUpperCase()}] ${v.title}`,
                statut: 'done' as const,
                priorite: 'normale' as const,
                category: 'visit' as const,
                originalVisit: v
            }));

        return [...tasks, ...upcomingVisits, ...completedVisits];
    }, [followUps, visits]);

    const filteredRelances = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return allActions
            .filter(r => {
                const contact = contacts.find(c => c.id === r.contactId);
                
                // "Mes Tâches" is strictly personal for everyone
                if (r.agent !== user?.name) return false;

                // Filtre par statut (via les cartes de stats)
                const matchesStatus = filter === 'all' || r.statut === filter;
                if (!matchesStatus) return false;

                // Filtre par catégorie (nouveau)
                const matchesCategory = typeFilter === 'all' || r.category === typeFilter;
                if (!matchesCategory) return false;

                if (!query) return true;

                const contactName = contact?.name.toLowerCase() || '';
                const note = r.note.toLowerCase();
                return contactName.includes(query) || note.includes(query);
            })
            .sort((a, b) => {
                const order = { retard: 0, today: 1, upcoming: 2, done: 3 };
                if (order[a.statut] !== order[b.statut]) return order[a.statut] - order[b.statut];
                return new Date(a.dateRelance).getTime() - new Date(b.dateRelance).getTime();
            });
    }, [allActions, filter, searchQuery, contacts, user]);

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
        if (s === 'retard') return allActions.filter(r => r.statut === 'retard' || (r.statut !== 'done' && r.dateRelance < todayStr)).length;
        return allActions.filter(r => r.statut === s).length;
    };

    const getUrgencyLabel = (r: FollowUp) => {
        if (r.statut === 'retard') {
            const dc = Math.round((today.getTime() - new Date(r.dateRelance).getTime()) / 86400000);
            return { label: `En retard de ${dc}j`, cls: 'tag-retard' };
        }
        if (r.statut === 'today') return { label: "Aujourd'hui", cls: 'tag-today' };
        if (r.statut === 'done') return { label: 'Effectuée', cls: 'tag-done' };
        const dc = Math.round((new Date(r.dateRelance).getTime() - today.getTime()) / 86400000);
        return { label: `Dans ${dc}j`, cls: 'tag-upcoming' };
    };

    const getPrioriteLabel = (p: string) => {
        if (p === 'haute') return <span className="prio prio-haute">Haute</span>;
        if (p === 'normale') return <span className="prio prio-normale">Normale</span>;
        return <span className="prio prio-basse">Basse</span>;
    };

    return (
        <div className="relances-page">
            <div className="page-header">
                <div>
                    <h1>Mes Tâches</h1>
                    <p className="subtitle">Suivez vos actions de suivi classées par urgence</p>
                </div>
            </div>

            {/* Stats */}
            <div className="relances-stats">
                <div className="rstat retard" onClick={() => setFilter('retard')}>
                    <AlertTriangle size={22} />
                    <div><div className="rstat-num">{count('retard')}</div><div className="rstat-lbl">En retard</div></div>
                </div>
                <div className="rstat today" onClick={() => setFilter('today')}>
                    <ClipboardCheck size={22} />
                    <div><div className="rstat-num">{count('today')}</div><div className="rstat-lbl">Aujourd'hui</div></div>
                </div>
                <div className="rstat upcoming" onClick={() => setFilter('upcoming')}>
                    <Clock size={22} />
                    <div><div className="rstat-num">{count('upcoming')}</div><div className="rstat-lbl">À venir</div></div>
                </div>
                <div className="rstat done" onClick={() => setFilter('done')}>
                    <CheckCircle2 size={22} />
                    <div><div className="rstat-num">{count('done')}</div><div className="rstat-lbl">Effectuées</div></div>
                </div>
            </div>

            {/* Filtres & Recherche */}
            <div className="relances-controls">
                <div className="relances-filters">
                    {[
                        { k: 'all', l: 'Tous les types' },
                        { k: 'follow_up', l: 'Rappels / Notes' },
                        { k: 'visit', l: 'Visites & RDV' },
                    ].map(f => (
                        <button key={f.k} className={`filter-btn ${typeFilter === f.k ? 'active' : ''}`} onClick={() => setTypeFilter(f.k as any)}>{f.l}</button>
                    ))}
                </div>

                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Rechercher par client, note, agent..." 
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

            {/* Liste */}
            <div className="relances-list">
                {filteredRelances.length === 0 && (
                    <div className="empty-relances"><ClipboardCheck size={40} /><p>Aucune tâche dans cette catégorie.</p></div>
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
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = relancesStyles;
    document.head.appendChild(style);
}
