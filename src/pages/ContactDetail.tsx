import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, Edit2, CheckCircle2, FileText, Plus } from 'lucide-react';
import Modal from '../components/Modal';
import '../components/Modal.css';
import './ContactsList.css';
import './ContactDetail.css';

const mockContactDetails: Record<number, any> = {
    1: { id: 1, name: 'Moussa Diop', company: 'SCAC Sénégal', email: 'm.diop@scac.sn', phone: '+221 77 123 45 67', status: 'Client', location: 'Dakar Plateau', address: '12 Avenue Léopold Sédar Senghor', city: 'Dakar', country: 'Sénégal', notes: 'Client très intéressé par le projet Résidence Horizon.', dateAdded: '12/01/2026' },
    2: { id: 2, name: 'Awa Ndiaye', company: 'Particulier', email: 'awa.nd@gmail.com', phone: '+221 76 987 65 43', status: 'Prospect', location: 'Almadies', address: 'Quartier des Almadies', city: 'Dakar', country: 'Sénégal', notes: 'Cherche un terrain pour construire une villa R+1.', dateAdded: '03/03/2026' },
    3: { id: 3, name: 'Cheikh Fall', company: 'BTP Construction', email: 'c.fall@btp.sn', phone: '+221 77 555 11 22', status: 'En Qualification', location: 'Diamniadio', address: 'Zone Franche, Diamniadio', city: 'Thiès', country: 'Sénégal', notes: 'Intéressé par des terrains à Diamniadio pour un projet commercial.', dateAdded: '27/02/2026' },
    4: { id: 4, name: 'Fatou Sow', company: 'Particulier', email: 'fsow.pro@yahoo.fr', phone: '+221 78 444 99 88', status: 'Prospect', location: 'Mermoz', address: 'Quartier Mermoz', city: 'Dakar', country: 'Sénégal', notes: 'Cherche un terrain pour villa familiale.', dateAdded: '20/02/2026' },
    5: { id: 5, name: 'Entreprise ABC', company: 'Groupe ABC', email: 'contact@abc-sn.com', phone: '+221 33 800 00 00', status: 'Client', location: 'Dakar', address: 'Immeuble ABC, Rue de Thiong', city: 'Dakar', country: 'Sénégal', notes: 'Projet résidentiel de 20 logements en cours.', dateAdded: '05/02/2026' },
    6: { id: 6, name: 'Ibou Thiam', company: 'Particulier', email: 'ibou.thiam@hotmail.com', phone: '+221 70 111 22 33', status: 'Projet Livré', location: 'Saly', address: 'Résidence Saly 2', city: 'Mbour', country: 'Sénégal', notes: 'Projet livré en Janvier 2026. Client satisfait.', dateAdded: '10/01/2026' },
};

const initHistory = [
    { id: 1, type: 'call', title: 'Appel de qualification', date: '05 Mar 2026', time: '14:30', description: 'Discussion sur le budget et les préférences de zone.' },
    { id: 2, type: 'email', title: 'Envoi catalogue', date: '04 Mar 2026', time: '09:15', description: 'Brochure PDF des terrains disponibles envoyée par email.' },
];

const initAppointments = [
    { id: 1, title: 'Visite Terrain Almadies', date: '10 Mar 2026', time: '10:00', location: 'Lotissement Almadies Phase 2', status: 'upcoming' },
    { id: 2, title: 'Rendez-vous Bureau', date: '28 Fév 2026', time: '15:00', location: 'Siège Katos', status: 'completed' },
];

const ContactDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const rawContact = mockContactDetails[Number(id)] || mockContactDetails[1];

    const [contact, setContact] = useState(rawContact);
    const [history, setHistory] = useState(initHistory);
    const [appointments, setAppointments] = useState(initAppointments);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showRdvModal, setShowRdvModal] = useState(false);
    const [editForm, setEditForm] = useState(contact);
    const [noteForm, setNoteForm] = useState({ type: 'call', title: '', description: '' });
    const [rdvForm, setRdvForm] = useState({ title: '', date: '', time: '', location: '' });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Prospect': return <span className="badge badge-warning">Prospect</span>;
            case 'En Qualification': return <span className="badge badge-info">En Qualification</span>;
            case 'Client': return <span className="badge badge-success">Client</span>;
            case 'Projet Livré': return <span className="badge badge-primary">Livré</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    const saveEdit = () => { setContact(editForm); setShowEditModal(false); };

    const saveNote = () => {
        if (!noteForm.title.trim()) return;
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        setHistory(prev => [{ id: Date.now(), ...noteForm, date: dateStr, time: timeStr }, ...prev]);
        setNoteForm({ type: 'call', title: '', description: '' });
        setShowNoteModal(false);
    };

    const saveRdv = () => {
        if (!rdvForm.title.trim()) return;
        setAppointments(prev => [{ id: Date.now(), ...rdvForm, status: 'upcoming' }, ...prev]);
        setRdvForm({ title: '', date: '', time: '', location: '' });
        setShowRdvModal(false);
    };

    const markRdvDone = (apId: number) => setAppointments(prev => prev.map(a => a.id === apId ? { ...a, status: 'completed' } : a));

    return (
        <div className="contact-detail-page">
            <button className="btn-back" onClick={() => navigate('/prospects')}>
                <ArrowLeft size={18} /> Retour à la liste
            </button>

            <div className="detail-header card-premium">
                <div className="header-info">
                    <div className="avatar-large">{contact.name.charAt(0)}</div>
                    <div className="title-section">
                        <div className="d-flex align-center gap-sm">
                            <h1>{contact.name}</h1>
                            {getStatusBadge(contact.status)}
                        </div>
                        <p className="subtitle">{contact.company} • Ajouté le {contact.dateAdded}</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-outline" onClick={() => { setEditForm(contact); setShowEditModal(true); }}>
                        <Edit2 size={16} /> Modifier
                    </button>
                    <a href={`tel:${contact.phone}`} className="btn-primary" style={{ cursor: 'pointer' }} onClick={e => { e.preventDefault(); setNoteForm({ type: 'call', title: 'Appel téléphonique', description: '' }); setShowNoteModal(true); }}>
                        <Phone size={16} /> Enregistrer un appel
                    </a>
                </div>
            </div>

            <div className="detail-grid">
                <div className="grid-left">
                    <div className="info-card card-premium">
                        <h3>Informations</h3>
                        <div className="info-list">
                            <div className="info-item">
                                <Mail className="icon-muted" size={18} />
                                <div><span className="info-label">Email</span><a href={`mailto:${contact.email}`} className="info-value link">{contact.email}</a></div>
                            </div>
                            <div className="info-item">
                                <Phone className="icon-muted" size={18} />
                                <div><span className="info-label">Téléphone</span><a href={`tel:${contact.phone}`} className="info-value link">{contact.phone}</a></div>
                            </div>
                            <div className="info-item">
                                <MapPin className="icon-muted" size={18} />
                                <div><span className="info-label">Adresse</span><span className="info-value">{contact.address}, {contact.city}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="info-card card-premium mt-15">
                        <div className="d-flex-between" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>Notes Internes</h3>
                            <button
                                className="btn-outline"
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                                onClick={() => { setEditForm({ ...contact }); setShowEditModal(true); }}
                            >
                                <Edit2 size={12} /> Modifier
                            </button>
                        </div>
                        <p className="notes-text">{contact.notes || <em style={{ color: 'var(--text-muted)' }}>Aucune note pour ce contact.</em>}</p>
                    </div>
                </div>

                <div className="grid-right">
                    <div className="tabs-container card-premium">
                        <div className="tabs-header">
                            <button className="tab active">Historique & Actions</button>
                        </div>
                        <div className="tab-content">
                            <div className="timeline">
                                <div className="d-flex-between mb-sm">
                                    <h4 className="section-title">Rendez-vous / Visites</h4>
                                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }} onClick={() => setShowRdvModal(true)}>
                                        <Plus size={13} /> Ajouter RDV
                                    </button>
                                </div>
                                {appointments.map(apt => (
                                    <div key={apt.id} className={`timeline-item ${apt.status}`}>
                                        <div className="timeline-icon"><Calendar size={16} /></div>
                                        <div className="timeline-content">
                                            <div className="timeline-header">
                                                <strong>{apt.title}</strong>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {apt.status === 'completed' && <CheckCircle2 size={16} className="text-success" />}
                                                    {apt.status !== 'completed' && (
                                                        <button style={{ fontSize: '0.75rem', color: '#10b981', cursor: 'pointer', background: 'none', border: '1px solid #10b981', borderRadius: '4px', padding: '2px 8px' }} onClick={() => markRdvDone(apt.id)}>✓ Réalisé</button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="timeline-meta">
                                                <span><Clock size={12} /> {apt.date} à {apt.time}</span>
                                                <span><MapPin size={12} /> {apt.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="d-flex-between mb-sm mt-15">
                                    <h4 className="section-title">Historique des interactions</h4>
                                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }} onClick={() => setShowNoteModal(true)}>
                                        <Plus size={13} /> Ajouter
                                    </button>
                                </div>
                                {history.map(item => (
                                    <div key={item.id} className="timeline-item">
                                        <div className="timeline-icon bg-light">
                                            {item.type === 'email' ? <Mail size={16} /> : <Phone size={16} />}
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-header"><strong>{item.title}</strong></div>
                                            <div className="timeline-meta"><span><Clock size={12} /> {item.date} à {item.time}</span></div>
                                            <p className="timeline-desc">{item.description}</p>
                                        </div>
                                    </div>
                                ))}

                                <button className="btn-outline w-full mt-10" onClick={() => setShowNoteModal(true)}>
                                    <FileText size={16} /> Ajouter une note ou action
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---- Modale Modifier Contact ---- */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier le contact" size="lg">
                <div className="form-grid">
                    <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Entreprise</label><input className="form-input" value={editForm.company} onChange={e => setEditForm({ ...editForm, company: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                    <div className="form-group">
                        <label className="form-label">Statut</label>
                        <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                            <option value="Prospect">Prospect</option><option value="En Qualification">En Qualification</option><option value="Client">Client</option><option value="Projet Livré">Projet Livré</option>
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Localisation</label><input className="form-input" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} /></div>
                    <div className="form-group col-2"><label className="form-label">Notes</label><textarea className="form-textarea" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
                </div>
            </Modal>

            {/* ---- Modale Ajouter Note ---- */}
            <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="Ajouter une interaction" size="md">
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select className="form-select" value={noteForm.type} onChange={e => setNoteForm({ ...noteForm, type: e.target.value })}>
                            <option value="call">Appel</option><option value="email">Email</option><option value="note">Note interne</option>
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Titre *</label><input className="form-input" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Ex: Appel de relance" /></div>
                    <div className="form-group col-2"><label className="form-label">Description</label><textarea className="form-textarea" value={noteForm.description} onChange={e => setNoteForm({ ...noteForm, description: e.target.value })} placeholder="Résumé de l'échange..." /></div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowNoteModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveNote}>Ajouter</button>
                </div>
            </Modal>

            {/* ---- Modale Ajouter RDV ---- */}
            <Modal isOpen={showRdvModal} onClose={() => setShowRdvModal(false)} title="Nouveau Rendez-vous" size="md">
                <div className="form-grid">
                    <div className="form-group col-2"><label className="form-label">Titre *</label><input className="form-input" value={rdvForm.title} onChange={e => setRdvForm({ ...rdvForm, title: e.target.value })} placeholder="Ex: Visite terrain Almadies" /></div>
                    <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={rdvForm.date} onChange={e => setRdvForm({ ...rdvForm, date: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Heure</label><input className="form-input" type="time" value={rdvForm.time} onChange={e => setRdvForm({ ...rdvForm, time: e.target.value })} /></div>
                    <div className="form-group col-2"><label className="form-label">Lieu</label><input className="form-input" value={rdvForm.location} onChange={e => setRdvForm({ ...rdvForm, location: e.target.value })} placeholder="Adresse ou lieu du RDV" /></div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowRdvModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveRdv}>Créer le RDV</button>
                </div>
            </Modal>
        </div>
    );
};

export default ContactDetail;
