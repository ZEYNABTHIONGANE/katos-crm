import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, Edit2, CheckCircle2, Plus,
    Megaphone, Target, User, Folder, MessageSquare, ClipboardList, HardHat, ClipboardCheck
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import DocumentManager from './DocumentManager';
import { useContactStore, type InteractionType } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';

const SOURCE_OPTIONS = ['Site web', 'Facebook', 'LinkedIn', 'Instagram', 'TikTok', 'Recommandation', 'Autre'];
const AGENTS = ['Abdou Sarr', 'Omar Diallo', 'Katos Admin'];

const SERVICE_INFO: Record<string, { label: string; color: string }> = {
    foncier: { label: 'Foncier', color: '#E96C2E' },
    construction: { label: 'Construction', color: '#2B2E83' },
    gestion_immobiliere: { label: 'Gestion Immobilière', color: '#10B981' },
};

const INTERACTION_CONFIG: Record<InteractionType, { icon: any; label: string; color: string }> = {
    call: { icon: Phone, label: 'Appel', color: '#3b82f6' },
    email: { icon: Mail, label: 'Email', color: '#10b981' },
    rdv: { icon: Calendar, label: 'Rendez-vous', color: '#8b5cf6' },
    visite_terrain: { icon: MapPin, label: 'Visite Terrain', color: '#f59e0b' },
    visite_chantier: { icon: HardHat, label: 'Visite Chantier', color: '#ef4444' },
    note: { icon: MessageSquare, label: 'Note interne', color: '#6b7280' },
};

const ContactDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { 
        contacts, updateContact,
        visits, addVisit, moveVisitStatut,
        interactions, addInteraction,
        addFollowUp 
    } = useContactStore();
    const { showToast } = useToast();

    // Find contact in store or fallback to the first one (for demo safety)
    const contact = useMemo(() => {
        return contacts.find(c => c.id === Number(id)) || contacts[0];
    }, [contacts, id]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showInteractionModal, setShowInteractionModal] = useState(false);
    const [showRelanceModal, setShowRelanceModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'documents'>('history');

    const [editForm, setEditForm] = useState(contact);
    const [interactionForm, setInteractionForm] = useState({
        type: 'call' as InteractionType,
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        lieu: '',
        executionStatus: 'fait' as 'fait' | 'a_faire',
        technician: ''
    });

    const [relanceForm, setRelanceForm] = useState({
        dateRelance: '',
        note: '',
        priorite: 'normale' as 'haute' | 'normale' | 'basse'
    });

    // Filter interactions from store for this contact
    const contactInteractions = useMemo(() => {
        return interactions.filter(i => i.contactId === contact?.id);
    }, [interactions, contact]);

    // Filter appointments (visits) from store for this contact
    const contactVisits = useMemo(() => {
        return visits.filter(v => v.contactId === contact?.id);
    }, [visits, contact]);

    // Combine interactions and visits into a single, sorted history
    const unifiedHistory = useMemo(() => {
        const historyItems = [
            ...contactInteractions.map(i => ({ ...i, category: 'interaction', statut: 'done' as const })),
            ...contactVisits.map(v => ({ 
                id: v.id.toString(), 
                contactId: v.contactId,
                type: (v.type === 'chantier' ? 'visite_chantier' : v.type === 'terrain' ? 'visite_terrain' : 'rdv') as InteractionType,
                title: v.title,
                description: v.notes,
                date: v.date,
                heure: v.heure,
                agent: v.agent,
                lieu: v.lieu,
                statut: v.statut,
                category: 'visit',
                technician: v.technician
            }))
        ];
        return historyItems.sort((a, b) => new Date(b.date + 'T' + b.heure).getTime() - new Date(a.date + 'T' + a.heure).getTime());
    }, [contactInteractions, contactVisits]);

    // Update edit form when contact changes (e.g. initial load)
    useMemo(() => {
        if (contact) setEditForm(contact);
    }, [contact]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Prospect': return <span className="badge badge-warning">Prospect</span>;
            case 'En Qualification': return <span className="badge badge-info">En Qualification</span>;
            case 'Client': return <span className="badge badge-success">Client</span>;
            case 'Projet Livré': return <span className="badge badge-primary">Livré</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    const saveEdit = () => {
        updateContact(contact.id, editForm);
        showToast('Informations du contact mises à jour');
        setShowEditModal(false);
    };

    const saveInteraction = () => {
        if (!interactionForm.title.trim()) {
            showToast('Le titre est obligatoire', 'error');
            return;
        }

        const interactionData = {
            contactId: contact.id,
            type: interactionForm.type,
            title: interactionForm.title,
            description: interactionForm.description,
            date: interactionForm.date,
            heure: interactionForm.heure,
            agent: contact.assignedAgent || 'Katos Admin',
            lieu: interactionForm.lieu,
            executionStatus: interactionForm.executionStatus,
            technician: interactionForm.technician
        };

        addInteraction(interactionData);

        // If it's a visit or RDV, also add to visits for tracking
        if (['rdv', 'visite_terrain', 'visite_chantier'].includes(interactionForm.type)) {
            addVisit({
                title: interactionForm.title,
                contactId: contact.id,
                date: interactionForm.date,
                heure: interactionForm.heure,
                lieu: interactionForm.lieu,
                type: interactionForm.type === 'visite_chantier' ? 'chantier' : interactionForm.type === 'visite_terrain' ? 'terrain' : 'bureau',
                statut: 'upcoming',
                agent: contact.assignedAgent || 'Katos Admin',
                technician: interactionForm.technician,
                notes: interactionForm.description
            });
        }

        showToast('Interaction enregistrée');
        setShowInteractionModal(false);
        setInteractionForm({
            type: 'call',
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            lieu: '',
            executionStatus: 'fait',
            technician: ''
        });
    };

    const saveRelance = () => {
        if (!relanceForm.dateRelance) {
            showToast('La date de relance est obligatoire', 'error');
            return;
        }

        addFollowUp({
            contactId: contact.id,
            agent: contact.assignedAgent || 'Katos Admin',
            dateRelance: relanceForm.dateRelance,
            note: relanceForm.note || 'Relance planifiée',
            statut: 'upcoming',
            priorite: relanceForm.priorite
        });

        showToast('Tâche programmée avec succès');
        setShowRelanceModal(false);
        setRelanceForm({ dateRelance: '', note: '', priorite: 'normale' });
    };

    const markVisitDone = (vid: number) => {
        moveVisitStatut(vid, 'completed');
        showToast('Visite marquée comme effectuée');
    };

    if (!contact) return <div className="p-20">Contact introuvable.</div>;

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
                        <p className="subtitle">{contact.company} · Réf #{contact.id}</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-outline" onClick={() => { setEditForm(contact); setShowEditModal(true); }}>
                        <Edit2 size={16} /> Modifier
                    </button>
                    <button className="btn-primary" onClick={() => setShowInteractionModal(true)}>
                        <Plus size={16} /> Ajouter une interaction
                    </button>
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
                                <div><span className="info-label">Adresse / Pays</span><span className="info-value">{contact.address}{contact.country ? `, ${contact.country}` : ''}</span></div>
                            </div>
                            {contact.source && (
                                <div className="info-item">
                                    <Megaphone className="icon-muted" size={18} />
                                    <div><span className="info-label">Source</span><span className="info-value">{contact.source}</span></div>
                                </div>
                            )}
                            <div className="info-item">
                                <User className="icon-muted" size={18} />
                                <div>
                                    <span className="info-label">Commercial affecté</span>
                                    <span className="info-value" style={{ color: 'var(--primary)', fontWeight: 600 }}>{contact.assignedAgent || 'Non assigné'}</span>
                                </div>
                            </div>
                            {contact.service && (
                                <div className="info-item">
                                    <Target className="icon-muted" size={18} />
                                    <div>
                                        <span className="info-label">Service</span>
                                        <span className="info-value" style={{ color: SERVICE_INFO[contact.service]?.color, fontWeight: 600 }}>{SERVICE_INFO[contact.service]?.label}</span>
                                        {contact.propertyTitle && <span className="info-value" style={{ marginLeft: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>→ {contact.propertyTitle}</span>}
                                    </div>
                                </div>
                            )}
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
                            <button 
                                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')}
                            >
                                <ClipboardList size={16} className="mr-2" style={{ verticalAlign: 'middle', marginTop: -2 }} />
                                Historique des interactions
                            </button>
                            <button 
                                className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
                                onClick={() => setActiveTab('documents')}
                            >
                                <Folder size={16} className="mr-2" style={{ verticalAlign: 'middle', marginTop: -2 }} />
                                Documents & Contrats
                            </button>
                        </div>
                        <div className="tab-content">
                            {activeTab === 'history' ? (
                                <div className="timeline">
                                    <div className="d-flex-between mb-sm">
                                        <h4 className="section-title">Timeline des échanges</h4>
                                        <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }} onClick={() => setShowInteractionModal(true)}>
                                            <Plus size={13} /> Ajouter
                                        </button>
                                    </div>
                                    
                                    {unifiedHistory.length === 0 ? (
                                        <div className="empty-state p-20 text-center">
                                            <p className="text-muted">Aucune interaction enregistrée pour le moment.</p>
                                        </div>
                                    ) : (
                                        unifiedHistory.map((item) => {
                                            const config = INTERACTION_CONFIG[item.type];
                                            const Icon = config.icon;
                                            return (
                                                <div key={item.id} className={`timeline-item ${item.category === 'visit' ? item.statut : ''}`}>
                                                    <div className="timeline-marker">
                                                        <div className="timeline-icon" style={{ backgroundColor: config.color + '20', color: config.color }}>
                                                            <Icon size={16} />
                                                        </div>
                                                    </div>
                                                    <div className="timeline-content">
                                                        <div className="timeline-header">
                                                            <strong>{item.title}</strong>
                                                            {item.category === 'visit' && item.statut !== 'completed' && (
                                                                <button 
                                                                    style={{ fontSize: '0.7rem', color: '#10b981', cursor: 'pointer', background: 'none', border: '1px solid #10b981', borderRadius: '4px', padding: '1px 6px' }} 
                                                                    onClick={() => markVisitDone(Number(item.id))}
                                                                >
                                                                    ✓ Réalisé
                                                                </button>
                                                            )}
                                                            {item.category === 'visit' && item.statut === 'completed' && (
                                                                <CheckCircle2 size={14} className="text-success" />
                                                            )}
                                                        </div>
                                                        <div className="timeline-meta">
                                                            <span><Clock size={12} /> {item.date} à {item.heure}</span>
                                                            {item.lieu && <span><MapPin size={12} /> {item.lieu}</span>}
                                                            <span><User size={12} /> Commercial : {item.agent}</span>
                                                            {item.technician && <span><HardHat size={12} /> Expert Tech : {item.technician}</span>}
                                                        </div>
                                                        {item.description && <p className="timeline-desc">{item.description}</p>}
                                                        <div className="timeline-actions mt-10">
                                                                <button 
                                                                    className="btn-relance-timeline" 
                                                                    onClick={() => {
                                                                        setRelanceForm({
                                                                            ...relanceForm,
                                                                            note: `Tâche de suivi suite à : ${item.title}`
                                                                        });
                                                                        setShowRelanceModal(true);
                                                                    }}
                                                                >
                                                                    <ClipboardCheck size={12} />
                                                                    Programmer une tâche
                                                                </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                <DocumentManager contactId={contact.id} />
                            )}
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
                    <div className="form-group">
                        <label className="form-label">Comment nous avez-vous connu ?</label>
                        <select className="form-select" value={editForm.source || ''} onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
                            <option value="">— Sélectionner —</option>
                            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Commercial affecté</label>
                        <select className="form-select" value={editForm.assignedAgent || ''} onChange={e => setEditForm({ ...editForm, assignedAgent: e.target.value })}>
                            <option value="">— Non assigné —</option>
                            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Adresse</label><input className="form-input" value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Ex: 12 avenue Senghor" /></div>
                    <div className="form-group"><label className="form-label">Pays</label><input className="form-input" value={editForm.country || ''} onChange={e => setEditForm({ ...editForm, country: e.target.value })} placeholder="Ex: Sénégal" /></div>
                    <div className="form-group col-2"><label className="form-label">Notes Internes</label><textarea className="form-textarea" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
                </div>
            </Modal>

            {/* ---- Modale UNIFIÉE Interaction ---- */}
            <Modal isOpen={showInteractionModal} onClose={() => setShowInteractionModal(false)} title="Nouvelle Interaction" size="lg">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Type d'interaction</label>
                        <div className="interaction-type-selector">
                                                            {(Object.keys(INTERACTION_CONFIG) as InteractionType[]).map(type => {
                                                                const cfg = INTERACTION_CONFIG[type];
                                                                const Icon = cfg.icon;
                                                                return (
                                                                    <button 
                                                                        key={type}
                                                                        className={`btn-type ${interactionForm.type === type ? 'active' : ''}`}
                                                                        onClick={() => setInteractionForm({ ...interactionForm, type })}
                                                                        style={{ 
                                                                            borderColor: interactionForm.type === type ? cfg.color : 'transparent',
                                                                            backgroundColor: interactionForm.type === type ? cfg.color + '15' : 'var(--bg-app)',
                                                                        }}
                                                                    >
                                                                        <div className="type-icon-wrapper" style={{ color: cfg.color, backgroundColor: cfg.color + '10' }}>
                                                                            <Icon size={18} />
                                                                        </div>
                                                                        <span className="type-label">{cfg.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                    </div>
                    
                    <div className="form-group col-2">
                        <label className="form-label">Titre de l'interaction *</label>
                        <input 
                            className="form-input" 
                            value={interactionForm.title} 
                            onChange={e => setInteractionForm({ ...interactionForm, title: e.target.value })} 
                            placeholder="Ex: Appel de relance devis" 
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={interactionForm.date} onChange={e => setInteractionForm({ ...interactionForm, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Heure</label>
                        <input className="form-input" type="time" value={interactionForm.heure} onChange={e => setInteractionForm({ ...interactionForm, heure: e.target.value })} />
                    </div>

                    {['rdv', 'visite_terrain', 'visite_chantier'].includes(interactionForm.type) && (
                        <>
                            <div className="form-group col-2">
                                <label className="form-label">Lieu</label>
                                <input className="form-input" value={interactionForm.lieu} onChange={e => setInteractionForm({ ...interactionForm, lieu: e.target.value })} placeholder="Adresse ou lieu précis" />
                            </div>
                            <div className="form-group col-2">
                                <label className="form-label">Technicien / Expert accompagnateur (Optionnel)</label>
                                <input className="form-input" value={interactionForm.technician} onChange={e => setInteractionForm({ ...interactionForm, technician: e.target.value })} placeholder="Ex: Samba Tall (Technicien)" />
                            </div>
                        </>
                    )}

                    <div className="form-group col-2">
                        <label className="form-label">Description / Compte-rendu</label>
                        <textarea className="form-textarea" value={interactionForm.description} onChange={e => setInteractionForm({ ...interactionForm, description: e.target.value })} placeholder="Résumé de l'échange..." />
                    </div>

                    <div className="form-group col-2 mt-10">
                        <label className="form-label">État de l'action</label>
                        <div className="status-selector-pills">
                            <button 
                                className={`pill-btn ${interactionForm.executionStatus === 'fait' ? 'active done' : ''}`}
                                onClick={() => setInteractionForm({ ...interactionForm, executionStatus: 'fait' })}
                            >
                                <CheckCircle2 size={16} /> Action déjà faite
                            </button>
                            <button 
                                className={`pill-btn ${interactionForm.executionStatus === 'a_faire' ? 'active todo' : ''}`}
                                onClick={() => setInteractionForm({ ...interactionForm, executionStatus: 'a_faire' })}
                            >
                                <Clock size={16} /> Action à faire
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-actions mt-20">
                    <button className="btn-secondary" onClick={() => setShowInteractionModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveInteraction}>Enregistrer l'interaction</button>
                </div>
            </Modal>

            {/* ---- Modale DÉDIÉE Tâche ---- */}
            <Modal isOpen={showRelanceModal} onClose={() => setShowRelanceModal(false)} title="Programmer une tâche de suivi" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Date d'échéance *</label>
                        <input className="form-input" type="date" value={relanceForm.dateRelance} onChange={e => setRelanceForm({ ...relanceForm, dateRelance: e.target.value })} />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Priorité</label>
                        <select className="form-select" value={relanceForm.priorite} onChange={e => setRelanceForm({ ...relanceForm, priorite: e.target.value as any })}>
                            <option value="basse">Basse</option>
                            <option value="normale">Normale</option>
                            <option value="haute">Haute</option>
                        </select>
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Note / Description de la tâche</label>
                        <textarea className="form-textarea" value={relanceForm.note} onChange={e => setRelanceForm({ ...relanceForm, note: e.target.value })} placeholder="Ex: Rappeler pour validation devis final..." />
                    </div>
                </div>
                <div className="form-actions mt-20">
                    <button className="btn-secondary" onClick={() => setShowRelanceModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveRelance}>Planifier la tâche</button>
                </div>
            </Modal>
        </div>
    );
};

export default ContactDetail;
