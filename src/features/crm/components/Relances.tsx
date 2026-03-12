import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, AlertTriangle, CheckCircle2, ArrowRight, Calendar, Phone, ChevronDown, Search, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useContactStore } from '@/stores/contactStore';
import type { FollowUp } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };
const todayStr = fmt(today);

const Relances = () => {
    const { contacts, followUps, updateFollowUp } = useContactStore();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showReportModal, setShowReportModal] = useState<FollowUp | null>(null);
    const [reportDate, setReportDate] = useState(addDays(3));

    const getStatut = (dateStr: string, current: FollowUp['statut']): FollowUp['statut'] => {
        if (current === 'done') return 'done';
        if (dateStr < todayStr) return 'retard';
        if (dateStr === todayStr) return 'today';
        return 'upcoming';
    };

    const filteredRelances = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return followUps
            .filter(r => {
                const matchesStatus = filter === 'all' || r.statut === filter;
                if (!matchesStatus) return false;

                if (!query) return true;

                const contact = contacts.find(c => c.id === r.contactId);
                const contactName = contact?.name.toLowerCase() || '';
                const companyName = contact?.company.toLowerCase() || '';
                const note = r.note.toLowerCase();
                const agent = (r.agent || '').toLowerCase();

                return contactName.includes(query) || 
                       companyName.includes(query) || 
                       note.includes(query) || 
                       agent.includes(query);
            })
            .sort((a, b) => {
                const order = { retard: 0, today: 1, upcoming: 2, done: 3 };
                if (order[a.statut] !== order[b.statut]) return order[a.statut] - order[b.statut];
                const pOrder = { haute: 0, normale: 1, basse: 2 };
                return pOrder[a.priorite] - pOrder[b.priorite];
            });
    }, [followUps, filter, searchQuery, contacts]);

    const markDone = (id: string) => {
        updateFollowUp(id, { statut: 'done' });
        showToast('Tâche marquée comme effectuée');
    };

    const handleReport = () => {
        if (!showReportModal) return;
        updateFollowUp(showReportModal.id, {
            dateRelance: reportDate,
            statut: getStatut(reportDate, 'upcoming')
        });
        showToast('Tâche reportée avec succès');
        setShowReportModal(null);
    };

    const count = (s: string) => followUps.filter(r => r.statut === s).length;

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
                        { k: 'all', l: 'Toutes' },
                        { k: 'retard', l: 'En retard' },
                        { k: 'today', l: "Aujourd'hui" },
                        { k: 'upcoming', l: 'À venir' },
                        { k: 'done', l: 'Effectuées' }
                    ].map(f => (
                        <button key={f.k} className={`filter-btn ${filter === f.k ? 'active' : ''}`} onClick={() => setFilter(f.k)}>{f.l}</button>
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
                                <div className="relance-contact">
                                    <span className="relance-name">{contact.name}</span>
                                    <span className="relance-company">{contact.company}</span>
                                    <span className="relance-phone"><Phone size={12} /> {contact.phone}</span>
                                </div>
                            </div>

                            <div className="relance-center">
                                <p className="relance-note">{r.note}</p>
                                <div className="relance-meta">
                                    <span><Calendar size={12} /> Prévue le {new Date(r.dateRelance).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    <span>Agent : {r.agent || 'Non assigné'}</span>
                                    {getPrioriteLabel(r.priorite)}
                                </div>
                            </div>

                            <div className="relance-actions">
                                {r.statut !== 'done' && (
                                    <>
                                        <button className="btn-primary btn-sm" onClick={() => markDone(r.id)}>
                                            <CheckCircle2 size={14} /> Effectuée
                                        </button>
                                        <button className="btn-outline btn-sm" onClick={() => { setShowReportModal(r); setReportDate(addDays(3)); }}>
                                            <ChevronDown size={14} /> Reporter
                                        </button>
                                    </>
                                )}
                                <button className="btn-outline btn-sm" style={{ color: '#E96C2E', borderColor: '#E96C2E' }} onClick={() => navigate(`/prospects/${contact.id}`)}>
                                    <ArrowRight size={14} /> Voir fiche
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
                <div className="form-group">
                    <label className="form-label">Nouvelle date</label>
                    <input className="form-input" type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} min={todayStr} />
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowReportModal(null)}>Annuler</button>
                    <button className="btn-primary" onClick={handleReport}>Confirmer le report</button>
                </div>
            </Modal>
        </div>
    );
};

export default Relances;
