import { useState } from 'react';
import type { ReactElement } from 'react';
import { Phone, Mail, Calendar, HardHat, FileText, Filter, Clock, User, MapPin, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';

type HistEntry = {
    id: number; date: string; heure: string; type: string;
    titre: string; contact: string; agent: string; description: string; issue: string; statut: string;
};

const initialHistory: HistEntry[] = [
    { id: 1, date: '06 Mar 2026', heure: '15:30', type: 'visite', titre: 'Visite terrain - Almadies Phase 2', contact: 'Awa Ndiaye', agent: 'Abdou Sarr', description: "Visite de la parcelle Lot 22. Cliente très intéressée. Surface 320m². Rapport complet envoyé.", issue: 'Envoi proposition de prix prévue le 10 Mar.', statut: 'realise' },
    { id: 2, date: '05 Mar 2026', heure: '10:00', type: 'appel', titre: 'Appel de suivi', contact: 'Cheikh Fall', agent: 'Omar Diallo', description: "Appel pour faire le point sur le devis envoyé le 27 Fév. Client demande un délai de réflexion de 2 semaines.", issue: 'Relancer le 19 Mar.', statut: 'realise' },
    { id: 3, date: '04 Mar 2026', heure: '14:30', type: 'email', titre: 'Envoi contrat signé', contact: 'Moussa Diop', agent: 'Katos Admin', description: "Envoi du contrat de vente signé et du reçu d'acompte (30%) par email et WhatsApp.", issue: 'Planifier visite chantier Résidence Horizon.', statut: 'realise' },
    { id: 4, date: '02 Mar 2026', heure: '09:15', type: 'rdv', titre: 'RDV Bureau - Présentation catalogue', contact: 'Fatou Sow', agent: 'Abdou Sarr', description: "Présentation du catalogue des terrains disponibles à Mermoz. Cliente intéressée par 2 lots.", issue: 'Planifier visite terrain avant le 15 Mar.', statut: 'realise' },
    { id: 5, date: '28 Fév 2026', heure: '11:00', type: 'visite', titre: 'Visite chantier Résidence Horizon', contact: 'Groupe ABC', agent: 'Omar Diallo', description: "Visite d'avancement Phase 1 en présence du chef de chantier. Gros-oeuvre 60% terminé.", issue: 'Prochaine visite prévue en Avril pour la Phase 2.', statut: 'realise' },
    { id: 6, date: '25 Fév 2026', heure: '16:00', type: 'appel', titre: 'Appel de qualification', contact: 'Ibou Sy', agent: 'Abdou Sarr', description: "Premier contact téléphonique. Prospect cherche terrain à Dakar Centre pour un projet résidentiel R+2. Budget annoncé 30-40M FCFA.", issue: 'Envoyer brochure et planifier visite.', statut: 'realise' },
];

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: ReactElement }> = {
    visite: { label: 'Visite Terrain', color: '#E96C2E', bg: 'rgba(233,108,46,0.08)', icon: <HardHat size={16} /> },
    appel: { label: 'Appel', color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: <Phone size={16} /> },
    email: { label: 'Email', color: '#6366F1', bg: 'rgba(99,102,241,0.08)', icon: <Mail size={16} /> },
    rdv: { label: 'RDV Bureau', color: '#2B2E83', bg: '#EBECF5', icon: <Calendar size={16} /> },
    note: { label: 'Note', color: '#64748b', bg: '#f1f5f9', icon: <FileText size={16} /> },
};

const emptyForm = {
    type: 'appel', contact: '', agent: '', titre: '', description: '', issue: ''
};

const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const Historique = () => {
    const [history, setHistory] = useState<HistEntry[]>(initialHistory);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const navigate = useNavigate();

    const filtered = history.filter(h => {
        const matchType = filter === 'all' || h.type === filter;
        const matchSearch = search === '' ||
            h.contact.toLowerCase().includes(search.toLowerCase()) ||
            h.titre.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
    });

    const handleSave = () => {
        if (!form.titre.trim() || !form.contact.trim()) return;
        setHistory(prev => [{
            id: Date.now(), date: today, heure: nowTime, statut: 'realise', ...form
        }, ...prev]);
        setShowModal(false);
        setForm(emptyForm);
    };

    return (
        <div className="historique-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Historique des Interactions</h1>
                    <p className="subtitle">Journal chronologique de toutes les activités commerciales</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Ajouter une interaction
                </button>
            </div>

            {/* Toolbar */}
            <div className="historique-toolbar card-premium">
                <div className="search-box">
                    <User size={16} className="text-muted" />
                    <input type="text" placeholder="Rechercher un contact ou une activité..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="type-filters">
                    <Filter size={16} className="text-muted" />
                    {[{ key: 'all', label: 'Tout' }, { key: 'visite', label: 'Visites' }, { key: 'appel', label: 'Appels' }, { key: 'email', label: 'Emails' }, { key: 'rdv', label: 'RDV' }, { key: 'note', label: 'Notes' }].map(f => (
                        <button key={f.key} className={`filter-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
                    ))}
                </div>
            </div>

            {/* Stats rapides */}
            <div className="hist-stats">
                {Object.entries(typeConfig).map(([k, v]) => (
                    <div key={k} className="hist-stat-chip" style={{ borderColor: v.color }} onClick={() => setFilter(k)}>
                        <span style={{ color: v.color }}>{history.filter(h => h.type === k).length}</span>
                        <span>{v.label}</span>
                    </div>
                ))}
            </div>

            {/* Timeline */}
            <div className="historique-timeline">
                {filtered.map((item, index) => {
                    const type = typeConfig[item.type] || typeConfig['note'];
                    const showDate = index === 0 || filtered[index - 1].date !== item.date;
                    const isExpanded = expandedId === item.id;
                    return (
                        <div key={item.id}>
                            {showDate && <div className="timeline-date-header"><span>{item.date}</span></div>}
                            <div className="timeline-entry">
                                <div className="te-icon" style={{ backgroundColor: type.bg, color: type.color }}>{type.icon}</div>
                                <div className="te-connector"></div>
                                <div className="te-card card-premium">
                                    <div className="te-card-header" onClick={() => setExpandedId(isExpanded ? null : item.id)} style={{ cursor: 'pointer' }}>
                                        <span className="te-type-badge" style={{ color: type.color, backgroundColor: type.bg }}>{type.label}</span>
                                        <h3 className="te-title">{item.titre}</h3>
                                        <div className="te-meta">
                                            <span className="te-meta-item"><Clock size={13} /> {item.heure}</span>
                                            <span className="te-meta-item"><User size={13} /> {item.contact}</span>
                                            <span className="te-meta-item"><MapPin size={13} /> Agent : {item.agent}</span>
                                        </div>
                                        <ChevronDown size={16} className={`te-chevron ${isExpanded ? 'open' : ''}`} />
                                    </div>

                                    {/* Détails expansibles */}
                                    {isExpanded && (
                                        <div className="te-expanded">
                                            <p className="te-description">{item.description}</p>
                                            <div className="te-issue">
                                                <span className="te-issue-label">Suite à donner :</span>
                                                <span>{item.issue}</span>
                                            </div>
                                            <div className="te-actions">
                                                <button className="btn-outline btn-sm" onClick={() => navigate('/prospects')}>
                                                    <User size={13} /> Voir fiche contact
                                                </button>
                                                <button className="btn-outline btn-sm" onClick={() => navigate('/relances')}>
                                                    <Calendar size={13} /> Programmer relance
                                                </button>
                                                <button className="btn-outline btn-sm" onClick={() => navigate('/visites')}>
                                                    <HardHat size={13} /> Planifier visite
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="empty-section"><Clock size={40} /><p>Aucune interaction trouvée.</p></div>
                )}
            </div>

            {/* ---- Modale Ajouter une interaction ---- */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Enregistrer une interaction" size="lg">
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            <option value="appel">📞 Appel</option>
                            <option value="email">📧 Email</option>
                            <option value="rdv">📅 RDV Bureau</option>
                            <option value="visite">🏗️ Visite Terrain</option>
                            <option value="note">📝 Note interne</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contact *</label>
                        <input className="form-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Nom du client/prospect" />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Titre *</label>
                        <input className="form-input" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Appel de suivi qualification" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Agent</label>
                        <input className="form-input" value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })} placeholder="Nom du commercial" />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Description / Résumé</label>
                        <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ce qui a été dit ou fait..." />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Suite à donner</label>
                        <input className="form-input" value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} placeholder="Prochaine action à réaliser..." />
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSave}>Enregistrer</button>
                </div>
            </Modal>
        </div>
    );
};

export default Historique;
