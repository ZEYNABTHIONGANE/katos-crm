import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Clock, AlertTriangle, CheckCircle2, ArrowRight, Calendar, Phone, ChevronDown } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export type Relance = {
    id: string;
    contact: string;
    company: string;
    phone: string;
    agent: string;
    dateRelance: string; // ISO string YYYY-MM-DD
    note: string;
    statut: 'retard' | 'today' | 'upcoming' | 'done';
    priorite: 'haute' | 'normale' | 'basse';
};

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };
const todayStr = fmt(today);

const initialRelances: Relance[] = [
    {
        id: 'r1', contact: 'Awa Ndiaye', company: 'Particulier', phone: '+221 76 987 65 43', agent: 'Abdou Sarr', dateRelance: addDays(-3), note: "Rappeler pour confirmation de la visite Almadies. Elle semblait interessée mais hesitante sur le budget.", statut: 'retard', priorite: 'haute'
    },
    { id: 'r2', contact: 'Cheikh Fall', company: 'BTP Construction', phone: '+221 77 555 11 22', agent: 'Omar Diallo', dateRelance: addDays(-1), note: "Relance devis envoyé le 1er mars. Pas de réponse. Vérifier s'il a bien reçu les documents.", statut: 'retard', priorite: 'haute' },
    { id: 'r3', contact: 'Fatou Sow', company: 'Particulier', phone: '+221 78 444 99 88', agent: 'Abdou Sarr', dateRelance: todayStr, note: 'Suite visite terrain Mermoz. Elle devait décider avec son mari cette semaine.', statut: 'today', priorite: 'haute' },
    { id: 'r4', contact: 'Ibou Sy', company: 'Promoteur XYZ', phone: '+221 77 000 11 22', agent: 'Katos Admin', dateRelance: todayStr, note: 'Premier contact à faire. Intéressé par lots commerciaux Diamniadio.', statut: 'today', priorite: 'normale' },
    { id: 'r5', contact: 'Moussa Badji', company: 'Particulier', phone: '+221 77 321 54 89', agent: 'Omar Diallo', dateRelance: addDays(2), note: 'A demandé un délai de réflexion de 2 semaines. Rappeler sa confirmation sur le terrain R+2.', statut: 'upcoming', priorite: 'normale' },
    { id: 'r6', contact: 'Aïssatou Diallo', company: 'ATD Invest', phone: '+221 76 543 21 09', agent: 'Abdou Sarr', dateRelance: addDays(5), note: 'Envoyer catalogue mis à jour. Suit le projet de résidence à Saly.', statut: 'upcoming', priorite: 'basse' },
];

const emptyForm = { contact: '', company: 'Particulier', phone: '', agent: '', dateRelance: addDays(1), note: '', priorite: 'normale' as const };

const Relances = () => {
    const [relances, setRelances] = useState<Relance[]>(initialRelances);
    const navigate = useNavigate();
    const [filter, setFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState<Relance | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [reportDate, setReportDate] = useState(addDays(3));

    const getStatut = (dateStr: string, current: Relance['statut']): Relance['statut'] => {
        if (current === 'done') return 'done';
        if (dateStr < todayStr) return 'retard';
        if (dateStr === todayStr) return 'today';
        return 'upcoming';
    };

    const filtered = relances
        .filter(r => filter === 'all' || r.statut === filter)
        .sort((a, b) => {
            const order = { retard: 0, today: 1, upcoming: 2, done: 3 };
            if (order[a.statut] !== order[b.statut]) return order[a.statut] - order[b.statut];
            const pOrder = { haute: 0, normale: 1, basse: 2 };
            return pOrder[a.priorite] - pOrder[b.priorite];
        });

    const markDone = (id: string) => setRelances(prev => prev.map(r => r.id === id ? { ...r, statut: 'done' } : r));

    const handleReport = () => {
        if (!showReportModal) return;
        setRelances(prev => prev.map(r =>
            r.id === showReportModal.id
                ? { ...r, dateRelance: reportDate, statut: getStatut(reportDate, 'upcoming') }
                : r
        ));
        setShowReportModal(null);
    };

    const handleSave = () => {
        if (!form.contact.trim()) return;
        const statut = getStatut(form.dateRelance, 'upcoming');
        setRelances(prev => [...prev, { id: 'r' + Date.now(), ...form, statut }]);
        setShowModal(false);
        setForm(emptyForm);
    };

    const count = (s: string) => relances.filter(r => r.statut === s).length;

    const getUrgencyLabel = (r: Relance) => {
        if (r.statut === 'retard') {
            const days = Math.round((today.getTime() - new Date(r.dateRelance).getTime()) / 86400000);
            return { label: `En retard de ${days}j`, cls: 'tag-retard' };
        }
        if (r.statut === 'today') return { label: "Aujourd'hui", cls: 'tag-today' };
        if (r.statut === 'done') return { label: 'Effectuée', cls: 'tag-done' };
        const days = Math.round((new Date(r.dateRelance).getTime() - today.getTime()) / 86400000);
        return { label: `Dans ${days}j`, cls: 'tag-upcoming' };
    };

    const getPriorite = (p: string) => {
        if (p === 'haute') return <span className="prio prio-haute">🔴 Haute</span>;
        if (p === 'normale') return <span className="prio prio-normale">🟡 Normale</span>;
        return <span className="prio prio-basse">🟢 Basse</span>;
    };

    return (
        <div className="relances-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Mes Relances</h1>
                    <p className="subtitle">Suivez vos relances prospects classées par urgence</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Nouvelle Relance
                </button>
            </div>

            {/* Stats */}
            <div className="relances-stats">
                <div className="rstat retard" onClick={() => setFilter('retard')}>
                    <AlertTriangle size={22} />
                    <div><div className="rstat-num">{count('retard')}</div><div className="rstat-lbl">En retard</div></div>
                </div>
                <div className="rstat today" onClick={() => setFilter('today')}>
                    <Bell size={22} />
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

            {/* Filtres */}
            <div className="relances-filters">
                {[{ k: 'all', l: 'Toutes' }, { k: 'retard', l: '🔴 En retard' }, { k: 'today', l: "🟡 Aujourd'hui" }, { k: 'upcoming', l: '🔵 À venir' }, { k: 'done', l: '✅ Effectuées' }].map(f => (
                    <button key={f.k} className={`filter-btn ${filter === f.k ? 'active' : ''}`} onClick={() => setFilter(f.k)}>{f.l}</button>
                ))}
            </div>

            {/* Liste */}
            <div className="relances-list">
                {filtered.length === 0 && (
                    <div className="empty-relances"><Bell size={40} /><p>Aucune relance dans cette catégorie.</p></div>
                )}
                {filtered.map(r => {
                    const urg = getUrgencyLabel(r);
                    return (
                        <div key={r.id} className={`relance-card ${r.statut === 'retard' ? 'card-retard' : r.statut === 'today' ? 'card-today' : r.statut === 'done' ? 'card-done' : ''}`}>

                            {/* Gauche : urgence + contact */}
                            <div className="relance-left">
                                <div className={`urgency-tag ${urg.cls}`}>{urg.label}</div>
                                <div className="relance-avatar">{r.contact.charAt(0)}</div>
                                <div className="relance-contact">
                                    <span className="relance-name">{r.contact}</span>
                                    <span className="relance-company">{r.company}</span>
                                    <span className="relance-phone"><Phone size={12} /> {r.phone}</span>
                                </div>
                            </div>

                            {/* Centre : note */}
                            <div className="relance-center">
                                <p className="relance-note">{r.note}</p>
                                <div className="relance-meta">
                                    <span><Calendar size={12} /> Prévue le {new Date(r.dateRelance).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    <span>👤 Agent : {r.agent}</span>
                                    {getPriorite(r.priorite)}
                                </div>
                            </div>

                            {/* Droite : actions */}
                            {r.statut !== 'done' && (
                                <div className="relance-actions">
                                    <button className="btn-primary btn-sm" onClick={() => markDone(r.id)}>
                                        <CheckCircle2 size={14} /> Effectuée
                                    </button>
                                    <button className="btn-outline btn-sm" onClick={() => { setShowReportModal(r); setReportDate(addDays(3)); }}>
                                        <ChevronDown size={14} /> Reporter
                                    </button>
                                    <button className="btn-outline btn-sm" style={{ color: '#E96C2E', borderColor: '#E96C2E' }} onClick={() => navigate('/prospects')}>
                                        <ArrowRight size={14} /> Voir fiche
                                    </button>
                                </div>
                            )}
                            {r.statut === 'done' && (
                                <div className="relance-actions">
                                    <span className="done-badge"><CheckCircle2 size={16} /> Effectuée</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ---- Modale Nouvelle Relance ---- */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Programmer une relance" size="lg">
                <div className="form-grid">
                    <div className="form-group"><label className="form-label">Nom du contact *</label>
                        <input className="form-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Ex: Awa Ndiaye" /></div>
                    <div className="form-group"><label className="form-label">Entreprise</label>
                        <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Téléphone</label>
                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" /></div>
                    <div className="form-group"><label className="form-label">Agent responsable</label>
                        <input className="form-input" value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })} placeholder="Nom du commercial" /></div>
                    <div className="form-group"><label className="form-label">Date de relance</label>
                        <input className="form-input" type="date" value={form.dateRelance} onChange={e => setForm({ ...form, dateRelance: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Priorité</label>
                        <select className="form-select" value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value as any })}>
                            <option value="haute">🔴 Haute</option>
                            <option value="normale">🟡 Normale</option>
                            <option value="basse">🟢 Basse</option>
                        </select></div>
                    <div className="form-group col-2"><label className="form-label">Note de relance</label>
                        <textarea className="form-textarea" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Pourquoi relancer ? Qu'est-ce qui a été dit ? Quel est l'objectif de l'appel ?" /></div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSave}>Programmer la relance</button>
                </div>
            </Modal>

            {/* ---- Modale Reporter ---- */}
            <Modal isOpen={!!showReportModal} onClose={() => setShowReportModal(null)} title="Reporter la relance" size="sm">
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Reporter la relance de <strong>{showReportModal?.contact}</strong> à une nouvelle date :
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
