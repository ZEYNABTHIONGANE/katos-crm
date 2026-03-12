import { useState, useMemo } from 'react';
import { Plus, MapPin, Clock, CheckCircle2, Calendar, AlertCircle, Search, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useContactStore } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    terrain: { label: 'Terrain', color: '#E96C2E', bg: 'rgba(233,108,46,0.1)' },
    chantier: { label: 'Chantier', color: '#2B2E83', bg: '#EBECF5' },
    bureau: { label: 'Bureau / RDV', color: '#10B981', bg: '#f0fdf4' },
};

const AGENTS = ['Abdou Sarr', 'Omar Diallo', 'Katos Admin'];
const TECHNICIANS = ['Samba Tall', 'Moussa Sène', 'Katos Tech'];

const emptyForm = { title: '', contactId: 0, date: '', heure: '09:00', lieu: '', type: 'terrain' as 'terrain' | 'chantier' | 'bureau', agent: '', technician: '', notes: '' };

const Visites = () => {
    const { contacts, visits, addVisit, moveVisitStatut } = useContactStore();
    const { showToast } = useToast();
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [contactSearch, setContactSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const filtered = visits.filter(v => {
        const matchesStatut = filter === 'all' || v.statut === filter;
        const contact = contacts.find(c => c.id === v.contactId);
        const matchesSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (contact?.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDate = !dateFilter || v.date === dateFilter;

        return matchesStatut && matchesSearch && matchesDate;
    });
    const countByStatut = (s: string) => visits.filter(v => v.statut === s).length;

    const filteredContacts = useMemo(() => {
        if (!contactSearch.trim()) return [];
        return contacts.filter(c =>
            c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
            c.company.toLowerCase().includes(contactSearch.toLowerCase())
        ).slice(0, 5);
    }, [contacts, contactSearch]);

    const handleSave = () => {
        if (!form.title.trim() || !form.contactId) {
            showToast('Veuillez remplir le titre et sélectionner un contact', 'error');
            return;
        }
        addVisit({ ...form, statut: 'upcoming' });
        showToast('Nouvelle visite planifiée avec succès');
        setShowModal(false);
        setForm(emptyForm);
        setContactSearch('');
    };

    const getStatutBadge = (statut: string) => {
        if (statut === 'today') return <span className="statut-badge statut-today"><AlertCircle size={14} /> Aujourd'hui</span>;
        if (statut === 'upcoming') return <span className="statut-badge statut-upcoming"><Calendar size={14} /> À venir</span>;
        return <span className="statut-badge statut-done"><CheckCircle2 size={14} /> Réalisée</span>;
    };

    const getContactName = (id: number) => contacts.find(c => c.id === id)?.name || 'Inconnu';

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
                    <div><div className="vstat-number">{visits.length}</div><div className="vstat-label">Total</div></div>
                </div>
            </div>

            <div className="visites-filters-bar flex flex-wrap gap-4 items-center">
                <div className="visites-statut-filters flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {[{ key: 'all', label: 'Toutes' }, { key: 'today', label: "Aujourd'hui" }, { key: 'upcoming', label: 'À venir' }, { key: 'completed', label: 'Réalisées' }].map(f => (
                        <button
                            key={f.key}
                            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="search-input flex-1 min-w-[200px]">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par contact ou titre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="date-filter flex items-center gap-2 bg-white px-3 py-2 border rounded-lg shadow-sm">
                    <Calendar size={18} className="text-muted" />
                    <input
                        type="date"
                        className="border-none outline-none text-sm"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                    {dateFilter && (
                        <button
                            className="clear-date"
                            onClick={() => setDateFilter('')}
                            title="Effacer le filtre date"
                        >
                            <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                        </button>
                    )}
                </div>
            </div>

            <div className="visites-list">
                {filtered.map(visite => {
                    const type = typeConfig[visite.type] || typeConfig.terrain;
                    const contact = contacts.find(c => c.id === visite.contactId);
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
                                            <div className="person-avatar person-contact">{contact?.name.charAt(0) || 'C'}</div>
                                            <div><div className="person-role">Contact</div><div className="person-name">{contact?.name || 'Inconnu'}</div></div>
                                        </div>
                                        <div className="person-item">
                                            <div className="person-avatar person-agent">{visite.agent.charAt(0) || 'A'}</div>
                                            <div><div className="person-role">Agent</div><div className="person-name">{visite.agent}</div></div>
                                        </div>
                                        {visite.technician && (
                                            <div className="person-item">
                                                <div className="person-avatar person-tech" style={{ backgroundColor: '#f59e0b' }}>{visite.technician.charAt(0) || 'T'}</div>
                                                <div><div className="person-role">Tech</div><div className="person-name">{visite.technician}</div></div>
                                            </div>
                                        )}
                                    </div>
                                    {visite.statut !== 'completed' && (
                                        <button className="btn-mark-done" onClick={() => {
                                            moveVisitStatut(visite.id, 'completed');
                                            showToast('Visite marquée comme réalisée');
                                        }}>
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

                    <div className="form-group col-2">
                        <label className="form-label">Rechercher un contact existant *</label>
                        <div className="search-input-wrapper">
                            <Search size={16} className="search-icon" />
                            <input
                                className="form-input search-input"
                                value={form.contactId ? getContactName(form.contactId) : contactSearch}
                                onChange={e => {
                                    setContactSearch(e.target.value);
                                    if (form.contactId) setForm({ ...form, contactId: 0 });
                                }}
                                placeholder="Taper le nom du contact..."
                            />
                            {form.contactId > 0 && (
                                <button className="clear-search" onClick={() => { setForm({ ...form, contactId: 0 }); setContactSearch(''); }}>
                                    <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                                </button>
                            )}
                        </div>
                        {contactSearch && !form.contactId && (
                            <div className="search-results-dropdown">
                                {filteredContacts.length > 0 ? filteredContacts.map(c => (
                                    <div key={c.id} className="search-result-item" onClick={() => {
                                        setForm({
                                            ...form,
                                            contactId: c.id,
                                            type: c.service === 'foncier' ? 'terrain' : c.service === 'construction' ? 'chantier' : 'bureau',
                                            lieu: c.propertyTitle || c.address || '',
                                            title: c.propertyTitle ? `Visite ${c.propertyTitle}` : form.title
                                        });
                                        setContactSearch(c.name);
                                    }}>
                                        <div className="result-icon"><User size={14} /></div>
                                        <div className="result-info">
                                            <div className="result-name">{c.name}</div>
                                            <div className="result-sub">{c.company} · {c.phone}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="search-result-empty">Aucun contact trouvé</div>
                                )}
                            </div>
                        )}
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
                        <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                            <option value="terrain">Visite Terrain</option>
                            <option value="chantier">Visite Chantier</option>
                            <option value="bureau">RDV Bureau</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Agent responsable</label>
                        <select className="form-select" value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })}>
                            <option value="">— Sélectionner un agent —</option>
                            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Technicien (optionnel)</label>
                        <select className="form-select" value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })}>
                            <option value="">— Aucun technicien —</option>
                            {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
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
