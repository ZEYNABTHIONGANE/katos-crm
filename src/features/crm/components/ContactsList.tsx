import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Phone, Mail, MapPin, Eye, Edit2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ServiceSelector from './ServiceSelector';
import PropertyPicker, { type SelectedProperty } from './PropertyPicker';
import { useContactStore, type CrmContact } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';

const SOURCE_OPTIONS = ['Site web', 'Facebook', 'LinkedIn', 'Instagram', 'TikTok', 'Recommandation', 'Autre'];
const AGENTS = ['Abdou Sarr', 'Omar Diallo', 'Katos Admin'];

const SERVICE_LABELS: Record<string, string> = {
    foncier: 'Foncier',
    construction: 'Construction',
    gestion_immobiliere: 'Gestion Immo',
};

type FormData = Omit<CrmContact, 'id'>;

const emptyForm: FormData = {
    name: '', company: '', email: '', phone: '',
    status: 'Prospect', address: '', country: 'Sénégal',
    source: '', service: undefined, propertyId: undefined, propertyTitle: undefined,
    lastAction: '', budget: '', assignedAgent: '',
};

const ContactsList = () => {
    const { contacts, addContact, updateContact, deleteContact } = useContactStore();
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('Tous');
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editContact, setEditContact] = useState<CrmContact | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<CrmContact | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const navigate = useNavigate();

    const filtered = contacts.filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'Tous' ? true : c.status === filter;
        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Prospect': return <span className="badge badge-warning">Prospect</span>;
            case 'En Qualification': return <span className="badge badge-info">En Qualification</span>;
            case 'Client': return <span className="badge badge-success">Client</span>;
            case 'Projet Livré': return <span className="badge badge-primary">Livré</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    const openAdd = () => { setEditContact(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (c: CrmContact) => { setEditContact(c); setForm({ ...c }); setShowModal(true); setOpenMenu(null); };

    const handleSave = () => {
        if (!form.name.trim()) return;
        if (editContact) {
            updateContact(editContact.id, form);
            showToast('Contact mis à jour avec succès');
        } else {
            addContact(form);
            showToast('Nouveau contact ajouté');
        }
        setShowModal(false);
    };

    const handleDelete = (c: CrmContact) => {
        deleteContact(c.id);
        showToast('Contact supprimé');
        setShowDeleteConfirm(null);
    };

    const handlePropertySelect = (prop: SelectedProperty) => {
        setForm(f => ({ ...f, propertyId: prop.id, propertyTitle: prop.title }));
    };

    return (
        <div className="contacts-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Prospects & Clients</h1>
                    <p className="subtitle">Gérez votre base de contacts et suivez leurs dossiers</p>
                </div>
                <button className="btn-primary" onClick={openAdd}>
                    <Plus size={18} /> Nouveau Contact
                </button>
            </div>

            <div className="contacts-toolbar card-premium">
                <div className="search-box">
                    <Search size={18} className="text-muted" />
                    <input type="text" placeholder="Rechercher par nom ou entreprise..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="filters">
                    <div className="filter-group">
                        <Filter size={18} className="text-muted" />
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="Tous">Tous les statuts</option>
                            <option value="Prospect">Prospects</option>
                            <option value="En Qualification">En Qualification</option>
                            <option value="Client">Clients</option>
                            <option value="Projet Livré">Projets Livrés</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="contacts-table-container card-premium">
                <table className="contacts-table">
                    <thead>
                        <tr>
                            <th>Contact / Entreprise</th>
                            <th>Coordonnées</th>
                            <th>Adresse / Pays</th>
                            <th>Service</th>
                            <th>Commercial</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((contact) => (
                            <tr key={contact.id} className="contact-row clickable" onClick={() => navigate(`/prospects/${contact.id}`)}>
                                <td>
                                    <div className="user-profile-cell">
                                        <div className="avatar-initial">{contact.name.charAt(0)}</div>
                                        <div>
                                            <div className="font-medium text-main">{contact.name}</div>
                                            <div className="text-sm text-muted">{contact.company}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="contact-links">
                                        <span className="icon-link"><Phone size={14} /> {contact.phone}</span>
                                        <span className="icon-link"><Mail size={14} /> {contact.email}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="icon-text text-sm">
                                        <MapPin size={14} className="text-muted" />
                                        <span>{contact.address}{contact.country ? `, ${contact.country}` : ''}</span>
                                    </div>
                                </td>
                                <td>
                                    {contact.service ? (
                                        <div>
                                            <div className="text-sm font-medium">{SERVICE_LABELS[contact.service]}</div>
                                            {contact.propertyTitle && (
                                                <div className="text-sm text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.propertyTitle}</div>
                                            )}
                                        </div>
                                    ) : <span className="text-sm text-muted">—</span>}
                                </td>
                                <td>
                                    {contact.assignedAgent ? (
                                        <div className="text-sm font-medium" style={{ color: 'var(--primary)' }}>{contact.assignedAgent}</div>
                                    ) : <span className="text-sm text-muted">—</span>}
                                </td>
                                <td>{getStatusBadge(contact.status)}</td>
                                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                    <div className="action-menu-wrap">
                                        <button className="btn-icon" onClick={() => setOpenMenu(openMenu === contact.id ? null : contact.id)}>⋮</button>
                                        {openMenu === contact.id && (
                                            <div className="action-dropdown">
                                                <button onClick={() => { navigate(`/prospects/${contact.id}`); setOpenMenu(null); }}><Eye size={14} /> Voir</button>
                                                <button onClick={() => openEdit(contact)}><Edit2 size={14} /> Modifier</button>
                                                <button className="danger" onClick={() => { setShowDeleteConfirm(contact); setOpenMenu(null); }}><Trash2 size={14} /> Supprimer</button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className="empty-state">Aucun contact trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ---- Modale Nouveau / Modifier Contact ---- */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editContact ? 'Modifier le contact' : 'Nouveau Contact'} size="lg">
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Nom complet *</label>
                        <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Moussa Diop" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Entreprise / Profil</label>
                        <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Particulier, SCAC..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Téléphone</label>
                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Adresse</label>
                        <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Ex: 12 Avenue Senghor, Almadies" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Pays</label>
                        <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Ex: Sénégal, France..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Statut CRM</label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="Prospect">Prospect</option>
                            <option value="En Qualification">En Qualification</option>
                            <option value="Client">Client</option>
                            <option value="Projet Livré">Projet Livré</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Comment nous avez-vous connu ?</label>
                        <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                            <option value="">— Sélectionner —</option>
                            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Commercial affecté</label>
                        <select className="form-select" value={form.assignedAgent || ''} onChange={e => setForm({ ...form, assignedAgent: e.target.value })}>
                            <option value="">— Non assigné —</option>
                            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Budget estimé</label>
                        <input className="form-input" value={form.budget || ''} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="Ex: 25M FCFA" />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Service demandé</label>
                        <ServiceSelector
                            value={form.service}
                            onChange={service => setForm({ ...form, service, propertyId: undefined, propertyTitle: undefined })}
                        />
                    </div>
                    {form.service && (
                        <div className="form-group col-2">
                            <label className="form-label">
                                {form.service === 'foncier' ? 'Terrain associé' : form.service === 'construction' ? 'Modèle de villa' : 'Bien immobilier'}
                                {form.propertyTitle && (
                                    <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--primary)', fontSize: '0.78rem' }}>
                                        ✓ {form.propertyTitle}
                                    </span>
                                )}
                            </label>
                            <PropertyPicker service={form.service} selectedId={form.propertyId} onSelect={handlePropertySelect} />
                        </div>
                    )}
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSave}>{editContact ? 'Enregistrer' : 'Créer le contact'}</button>
                </div>
            </Modal>

            {/* ---- Confirmation suppression ---- */}
            <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Supprimer le contact" size="sm">
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Voulez-vous vraiment supprimer <strong>{showDeleteConfirm?.name}</strong> ? Cette action est irréversible.
                </p>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Annuler</button>
                    <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>
                        Supprimer
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ContactsList;
