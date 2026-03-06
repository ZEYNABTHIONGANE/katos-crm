import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Phone, Mail, MapPin, Eye, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import '../components/Modal.css';
import './ContactsList.css';
import './ContactsListExtras.css';

type Contact = {
    id: number; name: string; company: string; email: string;
    phone: string; status: string; location: string; lastAction: string;
};

const defaultContacts: Contact[] = [
    { id: 1, name: 'Moussa Diop', company: 'SCAC Sénégal', email: 'm.diop@scac.sn', phone: '+221 77 123 45 67', status: 'Client', location: 'Dakar Plateau', lastAction: 'Livraison phase 1' },
    { id: 2, name: 'Awa Ndiaye', company: 'Particulier', email: 'awa.nd@gmail.com', phone: '+221 76 987 65 43', status: 'Prospect', location: 'Almadies', lastAction: 'Appel de qualification' },
    { id: 3, name: 'Cheikh Fall', company: 'BTP Construction', email: 'c.fall@btp.sn', phone: '+221 77 555 11 22', status: 'En Qualification', location: 'Diamniadio', lastAction: 'Envoi devis' },
    { id: 4, name: 'Fatou Sow', company: 'Particulier', email: 'fsow.pro@yahoo.fr', phone: '+221 78 444 99 88', status: 'Prospect', location: 'Mermoz', lastAction: 'Visite terrain planifiée' },
    { id: 5, name: 'Entreprise ABC', company: 'Groupe ABC', email: 'contact@abc-sn.com', phone: '+221 33 800 00 00', status: 'Client', location: 'Dakar', lastAction: 'Signature contrat' },
    { id: 6, name: 'Ibou Thiam', company: 'Particulier', email: 'ibou.thiam@hotmail.com', phone: '+221 70 111 22 33', status: 'Projet Livré', location: 'Saly', lastAction: 'Remise des clés' }
];

const emptyForm = { name: '', company: '', email: '', phone: '', status: 'Prospect', location: '', lastAction: '' };

const ContactsList = () => {
    const [contacts, setContacts] = useState<Contact[]>(defaultContacts);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('Tous');
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editContact, setEditContact] = useState<Contact | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<Contact | null>(null);
    const [form, setForm] = useState(emptyForm);
    const navigate = useNavigate();

    const filtered = contacts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company.toLowerCase().includes(searchTerm.toLowerCase());
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
    const openEdit = (c: Contact) => { setEditContact(c); setForm({ ...c }); setShowModal(true); setOpenMenu(null); };

    const handleSave = () => {
        if (!form.name.trim()) return;
        if (editContact) {
            setContacts(prev => prev.map(c => c.id === editContact.id ? { ...c, ...form } : c));
        } else {
            const newId = Math.max(...contacts.map(c => c.id)) + 1;
            setContacts(prev => [...prev, { id: newId, ...form }]);
        }
        setShowModal(false);
    };

    const handleDelete = (c: Contact) => { setContacts(prev => prev.filter(x => x.id !== c.id)); setShowDeleteConfirm(null); };

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
                            <th>Localisation</th>
                            <th>Statut</th>
                            <th>Dernière action</th>
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
                                    <div className="icon-text text-sm"><MapPin size={14} className="text-muted" />{contact.location}</div>
                                </td>
                                <td>{getStatusBadge(contact.status)}</td>
                                <td className="text-sm text-muted">{contact.lastAction}</td>
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
                            <tr><td colSpan={6} className="empty-state">Aucun contact trouvé.</td></tr>
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
                        <label className="form-label">Entreprise / Statut</label>
                        <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Ex: Particulier, SCAC..." />
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
                        <label className="form-label">Statut CRM</label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="Prospect">Prospect</option>
                            <option value="En Qualification">En Qualification</option>
                            <option value="Client">Client</option>
                            <option value="Projet Livré">Projet Livré</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Localisation</label>
                        <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ex: Almadies, Dakar" />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Dernière action / Note</label>
                        <input className="form-input" value={form.lastAction} onChange={e => setForm({ ...form, lastAction: e.target.value })} placeholder="Ex: Appel de qualification" />
                    </div>
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
