import { useState } from 'react';
import { Plus, MapPin, Clock, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';

type Visite = {
    id: number; title: string; contact: string; phone: string;
    date: string; heure: string; lieu: string; type: string;
    statut: string; agent: string; notes: string;
};

const initialVisites: Visite[] = [
    { id: 1, title: 'Visite parcelle Almadies Phase 2', contact: 'Awa Ndiaye', phone: '+221 76 987 65 43', date: '10 Mar 2026', heure: '10:00', lieu: 'Lot 22 - Almadies Phase 2, Dakar', type: 'terrain', statut: 'upcoming', agent: 'Abdou Sarr', notes: 'Cliente cherche un terrain de 300m² minimum. Budget environ 15M FCFA.' },
    { id: 2, title: 'Visite chantier Résidence Horizon', contact: 'Moussa Diop', phone: '+221 77 123 45 67', date: '08 Mar 2026', heure: '09:00', lieu: 'Chantier Résidence Horizon, Plateau', type: 'chantier', statut: 'today', agent: 'Omar Diallo', notes: 'Vérification avancement Phase 1. Présenter les plans R+2 au client.' },
    { id: 3, title: 'RDV bureau - Signature contrat', contact: 'Groupe ABC', phone: '+221 33 800 00 00', date: '07 Mar 2026', heure: '14:30', lieu: 'Siège Katos, Dakar', type: 'bureau', statut: 'completed', agent: 'Katos Admin', notes: 'Signature du compromis de vente et versement acompte 30%.' },
    { id: 4, title: 'Visite terrain Diamniadio', contact: 'Cheikh Fall', phone: '+221 77 555 11 22', date: '05 Mar 2026', heure: '11:00', lieu: 'Zone Franche Diamniadio, Lot B-14', type: 'terrain', statut: 'completed', agent: 'Abdou Sarr', notes: 'Client très intéressé. Surface : 450m². Relancer pour confirmation.' },
    { id: 5, title: 'Visite parcelle Saly Nouvelles', contact: 'Ibou Thiam', phone: '+221 70 111 22 33', date: '15 Mar 2026', heure: '10:30', lieu: 'Résidence Saly 2, Mbour', type: 'terrain', statut: 'upcoming', agent: 'Omar Diallo', notes: 'Suite à livraison. Présenter nouvelles parcelles disponibles.' },
];

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    terrain: { label: 'Terrain', color: '#E96C2E', bg: 'rgba(233,108,46,0.1)' },
    chantier: { label: 'Chantier', color: '#2B2E83', bg: '#EBECF5' },
    bureau: { label: 'Bureau / RDV', color: '#10B981', bg: '#f0fdf4' },
};

const emptyForm = { title: '', contact: '', phone: '', date: '', heure: '09:00', lieu: '', type: 'terrain', agent: '', notes: '' };

const Visites = () => {
    const [visites, setVisites] = useState<Visite[]>(initialVisites);
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const filtered = visites.filter(v => filter === 'all' || v.statut === filter);
    const countByStatut = (s: string) => visites.filter(v => v.statut === s).length;

    const markDone = (id: number) => setVisites(prev => prev.map(v => v.id === id ? { ...v, statut: 'completed' } : v));

    const handleSave = () => {
        if (!form.title.trim() || !form.contact.trim()) return;
        const newId = Math.max(...visites.map(v => v.id)) + 1;
        setVisites(prev => [...prev, { id: newId, ...form, statut: 'upcoming' }]);
        setShowModal(false);
        setForm(emptyForm);
    };

    const getStatutBadge = (statut: string) => {
        if (statut === 'today') return <span className="statut-badge statut-today"><AlertCircle size={14} /> Aujourd'hui</span>;
        if (statut === 'upcoming') return <span className="statut-badge statut-upcoming"><Calendar size={14} /> À venir</span>;
        return <span className="statut-badge statut-done"><CheckCircle2 size={14} /> Réalisée</span>;
    };

    return (
        <div className="visites-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Visites & Chantiers</h1>
                    <p className="subtitle">Planning des visites terrains, chantiers et rendez-vous clients</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Planifier une visite
                </button>
            </div>

            <div className="visites-stats">
                <div className="vstat-card vstat-today" onClick={() => setFilter('today')}>
                    <div className="vstat-icon"><AlertCircle size={22} /></div>
                    <div><div className="vstat-number">{countByStatut('today')}</div><div className="vstat-label">Aujourd'hui</div></div>
                </div>
                <div className="vstat-card vstat-upcoming" onClick={() => setFilter('upcoming')}>
                    <div className="vstat-icon"><Calendar size={22} /></div>
                    <div><div className="vstat-number">{countByStatut('upcoming')}</div><div className="vstat-label">À venir</div></div>
                </div>
                <div className="vstat-card vstat-done" onClick={() => setFilter('completed')}>
                    <div className="vstat-icon"><CheckCircle2 size={22} /></div>
                    <div><div className="vstat-number">{countByStatut('completed')}</div><div className="vstat-label">Réalisées</div></div>
                </div>
                <div className="vstat-card vstat-all" onClick={() => setFilter('all')}>
                    <div className="vstat-icon"><MapPin size={22} /></div>
                    <div><div className="vstat-number">{visites.length}</div><div className="vstat-label">Total</div></div>
                </div>
            </div>

            <div className="visites-filters">
                {[{ key: 'all', label: 'Toutes' }, { key: 'today', label: "Aujourd'hui" }, { key: 'upcoming', label: 'À venir' }, { key: 'completed', label: 'Réalisées' }].map(f => (
                    <button key={f.key} className={`filter-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
                ))}
            </div>

            <div className="visites-list">
                {filtered.map(visite => {
                    const type = typeConfig[visite.type];
                    return (
                        <div key={visite.id} className={`visite-card ${visite.statut === 'today' ? 'visite-highlight' : ''}`}>
                            <div className="visite-type-badge" style={{ color: type.color, backgroundColor: type.bg }}>{type.label}</div>
                            <div className="visite-body">
                                <div className="visite-main">
                                    <h3 className="visite-title">{visite.title}</h3>
                                    <div className="visite-meta-row">
                                        <span className="visite-meta-item"><Clock size={14} /> {visite.date} à {visite.heure}</span>
                                        <span className="visite-meta-item"><MapPin size={14} /> {visite.lieu}</span>
                                    </div>
                                    <p className="visite-notes">{visite.notes}</p>
                                </div>
                                <div className="visite-side">
                                    {getStatutBadge(visite.statut)}
                                    <div className="visite-people">
                                        <div className="person-item">
                                            <div className="person-avatar person-contact">{visite.contact.charAt(0)}</div>
                                            <div><div className="person-role">Contact</div><div className="person-name">{visite.contact}</div></div>
                                        </div>
                                        <div className="person-item">
                                            <div className="person-avatar person-agent">{visite.agent.charAt(0)}</div>
                                            <div><div className="person-role">Agent</div><div className="person-name">{visite.agent}</div></div>
                                        </div>
                                    </div>
                                    {visite.statut !== 'completed' && (
                                        <button className="btn-mark-done" onClick={() => markDone(visite.id)}>
                                            <CheckCircle2 size={14} /> Marquer réalisée
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="empty-section"><Calendar size={40} /><p>Aucune visite pour ce filtre.</p></div>
                )}
            </div>

            {/* ---- Modale Planifier Visite ---- */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Planifier une visite / RDV" size="lg">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Titre de la visite *</label>
                        <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Visite parcelle Almadies Phase 2" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contact client *</label>
                        <input className="form-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Nom du client" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Téléphone</label>
                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Heure</label>
                        <input className="form-input" type="time" value={form.heure} onChange={e => setForm({ ...form, heure: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            <option value="terrain">Visite Terrain</option>
                            <option value="chantier">Visite Chantier</option>
                            <option value="bureau">RDV Bureau</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Agent responsable</label>
                        <input className="form-input" value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })} placeholder="Nom de l'agent" />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Lieu</label>
                        <input className="form-input" value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} placeholder="Adresse complète" />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Détails, objectifs de la visite..." />
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSave}>Planifier</button>
                </div>
            </Modal>
        </div>
    );
};

export default Visites;
