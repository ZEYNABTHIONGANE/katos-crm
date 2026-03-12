import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, MoreVertical, Phone, Calendar, ArrowRight, Trash2, Search, X,
    Circle, Clock, CheckCircle2, Star, MapPin, DollarSign, Link as LinkIcon, Megaphone, User
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ServiceSelector, { type ServiceType } from './ServiceSelector';
import PropertyPicker, { type SelectedProperty } from './PropertyPicker';
import { useContactStore, STATUS_TO_COLUMN, type CrmContact } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';

// ---------- Types ----------
const COLUMN_META: Record<string, { title: string; color: string; icon: React.ReactNode }> = {
    nouveau: { title: 'Nouveau Prospect', color: '#64748b', icon: <Circle size={16} /> },
    qualification: { title: 'En Qualification', color: '#E96C2E', icon: <Clock size={16} /> },
    rdv: { title: 'RDV / Visite Terrain', color: '#F59E0B', icon: <Calendar size={16} /> },
    client: { title: 'Client Actif', color: '#2B2E83', icon: <Star size={16} /> },
    livre: { title: 'Projet Livré', color: '#10B981', icon: <CheckCircle2 size={16} /> },
};

const columnOrder = ['nouveau', 'qualification', 'rdv', 'client', 'livre'];

// Inverse map: column → status
const COLUMN_TO_STATUS: Record<string, string> = {
    nouveau: 'Prospect',
    qualification: 'En Qualification',
    rdv: 'RDV / Visite Terrain',
    client: 'Client',
    livre: 'Projet Livré',
};

const SOURCE_OPTIONS = ['Site web', 'Facebook', 'LinkedIn', 'Instagram', 'TikTok', 'Recommandation', 'Autre'];
const AGENTS = ['Abdou Sarr', 'Omar Diallo', 'Katos Admin'];

const SERVICE_LABELS: Record<string, { label: string; color: string }> = {
    foncier: { label: 'Foncier', color: '#E96C2E' },
    construction: { label: 'Construction', color: '#2B2E83' },
    gestion_immobiliere: { label: 'Gestion Immo', color: '#10B981' },
};

// ---------- KanbanCard ----------
const KanbanCard = ({
    contact, colId, colColor, onMove, onDelete
}: {
    contact: CrmContact; colId: string; colColor: string;
    onMove: (id: number, toColId: string) => void;
    onDelete: (id: number) => void;
}) => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const curIdx = columnOrder.indexOf(colId);
    const nextCol = columnOrder[curIdx + 1];
    const svc = contact.service ? SERVICE_LABELS[contact.service] : null;

    return (
        <div
            className="kanban-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/prospects/${contact.id}`)}
        >
            <div className="kcard-header">
                <div className="kcard-avatar">{contact.name.charAt(0)}</div>
                <div className="kcard-info">
                    <span className="kcard-name">{contact.name}</span>
                    <span className="kcard-company">{contact.company}</span>
                </div>
                <div className="kcard-menu-wrap" onClick={e => e.stopPropagation()}>
                    <button className="btn-icon-sm" onClick={() => setMenuOpen(!menuOpen)}>
                        <MoreVertical size={15} />
                    </button>
                    {menuOpen && (
                        <div className="kcard-dropdown">
                            {nextCol && (
                                <button onClick={() => { onMove(contact.id, nextCol); setMenuOpen(false); }}>
                                    <ArrowRight size={13} /> Avancer l'étape
                                </button>
                            )}
                            <button onClick={() => { navigate(`/prospects/${contact.id}`); setMenuOpen(false); }}>
                                <Phone size={13} /> Voir la fiche
                            </button>
                            <button onClick={() => setMenuOpen(false)}>
                                <Calendar size={13} /> Planifier RDV
                            </button>
                            <button className="danger" onClick={() => { onDelete(contact.id); setMenuOpen(false); }}>
                                <Trash2 size={13} /> Supprimer
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="kcard-meta">
                {contact.address && (
                    <span className="kcard-tag">
                        <MapPin size={10} /> {contact.address}
                    </span>
                )}
                {contact.budget && contact.budget !== 'NC' && (
                    <span className="kcard-tag kcard-budget">
                        <DollarSign size={10} /> {contact.budget}
                    </span>
                )}
                {svc && (
                    <span className="kcard-tag" style={{ color: svc.color, borderColor: svc.color + '44', background: svc.color + '12' }}>
                        {svc.label}
                    </span>
                )}
            </div>

            {contact.propertyTitle && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <LinkIcon size={10} /> {contact.propertyTitle}
                </div>
            )}
            {contact.source && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Megaphone size={10} /> {contact.source}
                </div>
            )}
            {contact.assignedAgent && (
                <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={10} /> {contact.assignedAgent}
                </div>
            )}

            <div className="kcard-footer" onClick={e => e.stopPropagation()}>
                <span className="kcard-since" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    #{contact.id} · {contact.phone}
                </span>
                {nextCol && (
                    <button
                        className="kcard-advance-btn"
                        style={{ borderColor: colColor, color: colColor }}
                        onClick={() => onMove(contact.id, nextCol)}
                        title="Avancer à l'étape suivante"
                    >
                        <ArrowRight size={13} /> Avancer
                    </button>
                )}
            </div>
        </div>
    );
};

// ---------- Page Pipeline ----------
type FormData = {
    name: string; company: string; phone: string;
    address: string; country: string; budget: string;
    source: string;
    service?: ServiceType;
    propertyId?: string;
    propertyTitle?: string;
    assignedAgent?: string;
};

const emptyForm: FormData = {
    name: '', company: 'Particulier', phone: '',
    address: '', country: 'Sénégal', budget: '',
    source: '', service: undefined, propertyId: undefined, propertyTitle: undefined,
    assignedAgent: '',
};

const Pipeline = () => {
    const { contacts, addContact, moveContactStatus, deleteContact } = useContactStore();
    const { showToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [targetCol, setTargetCol] = useState('nouveau');
    const [form, setForm] = useState<FormData>(emptyForm);
    const [search, setSearch] = useState('');

    // Group contacts into columns based on their status
    const columns = useMemo(() => {
        return columnOrder.reduce((acc, colId) => {
            const statusForCol = COLUMN_TO_STATUS[colId];
            acc[colId] = contacts.filter(c => STATUS_TO_COLUMN[c.status] === colId || c.status === statusForCol);
            return acc;
        }, {} as Record<string, CrmContact[]>);
    }, [contacts]);

    // Apply search filter
    const filteredColumns = useMemo(() => {
        if (!search.trim()) return columns;
        const q = search.toLowerCase();
        return columnOrder.reduce((acc, colId) => {
            acc[colId] = columns[colId].filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.company.toLowerCase().includes(q) ||
                c.phone.toLowerCase().includes(q) ||
                (c.address && c.address.toLowerCase().includes(q)) ||
                (c.service && c.service.toLowerCase().includes(q)) ||
                (c.propertyTitle && c.propertyTitle.toLowerCase().includes(q))
            );
            return acc;
        }, {} as Record<string, CrmContact[]>);
    }, [columns, search]);

    const totalCards = contacts.length;
    const filteredTotal = Object.values(filteredColumns).reduce((s, arr) => s + arr.length, 0);

    const openAdd = (colId: string) => { setTargetCol(colId); setForm(emptyForm); setShowModal(true); };

    const handleSave = () => {
        if (!form.name.trim()) return;
        const status = COLUMN_TO_STATUS[targetCol] || 'Prospect';
        addContact({
            ...form,
            email: '',
            status,
            lastAction: 'Ajouté via Pipeline',
        });
        showToast('Nouveau prospect ajouté avec succès');
        setShowModal(false);
    };

    const moveCard = (id: number, toColId: string) => {
        const newStatus = COLUMN_TO_STATUS[toColId];
        if (newStatus) {
            moveContactStatus(id, newStatus);
            showToast(`Statut mis à jour : ${newStatus}`);
        }
    };

    const handlePropertySelect = (prop: SelectedProperty) => {
        setForm(f => ({ ...f, propertyId: prop.id, propertyTitle: prop.title }));
    };

    return (
        <div className="pipeline-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Pipeline Commercial</h1>
                    <p className="subtitle">
                        {search ? `${filteredTotal} résultat(s) sur ${totalCards}` : `${totalCards} dossiers actifs`}
                        {' · '}Suivez chaque prospect à travers les étapes
                    </p>
                </div>
                <button className="btn-primary" onClick={() => openAdd('nouveau')}>
                    <Plus size={18} /> Nouveau Prospect
                </button>
            </div>

            {/* ── Barre de recherche ── */}
            <div className="card-premium" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Search size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un prospect par nom, téléphone, adresse, service..."
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.88rem', color: 'var(--text-main)' }}
                />
                {search && (
                    <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* ── Résumé ── */}
            <div className="pipeline-summary">
                {columnOrder.map(colId => {
                    const meta = COLUMN_META[colId];
                    const count = filteredColumns[colId]?.length ?? 0;
                    return (
                        <div key={colId} className="summary-chip" style={{ borderColor: meta.color }}>
                            <span className="summary-count" style={{ color: meta.color }}>{count}</span>
                            <span className="summary-label">{meta.title}</span>
                        </div>
                    );
                })}
            </div>

            {/* ── Colonnes Kanban ── */}
            <div className="kanban-board">
                {columnOrder.map(colId => {
                    const meta = COLUMN_META[colId];
                    const cards = filteredColumns[colId] ?? [];
                    return (
                        <div key={colId} className="kanban-column">
                            <div className="column-header" style={{ borderTopColor: meta.color }}>
                                <div className="column-title">
                                    <span>{meta.icon}</span>
                                    <h3>{meta.title}</h3>
                                    <span className="column-count" style={{ backgroundColor: meta.color }}>{cards.length}</span>
                                </div>
                                <button className="btn-icon-sm" title="Ajouter un dossier" onClick={() => openAdd(colId)}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="column-body">
                                {cards.length > 0 ? cards.map(contact => (
                                    <KanbanCard
                                        key={contact.id}
                                        contact={contact}
                                        colId={colId}
                                        colColor={meta.color}
                                        onMove={moveCard}
                                        onDelete={deleteContact}
                                    />
                                )) : (
                                    <div className="empty-column" onClick={() => openAdd(colId)} style={{ cursor: 'pointer' }}>
                                        <Plus size={16} /> {search ? 'Aucun résultat' : 'Ajouter un dossier'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Modale Nouveau Prospect ── */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Ajouter dans "${COLUMN_META[targetCol]?.title}"`} size="lg">
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
                        <label className="form-label">Téléphone</label>
                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Budget estimé</label>
                        <input className="form-input" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="Ex: 25M FCFA" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Adresse</label>
                        <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Ex: Quartier Almadies, Dakar" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Pays</label>
                        <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Ex: Sénégal, France..." />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Comment nous a-t-il connu ?</label>
                        <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                            <option value="">— Sélectionner —</option>
                            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Commercial affecté</label>
                        <select className="form-select" value={form.assignedAgent || ''} onChange={e => setForm({ ...form, assignedAgent: e.target.value })}>
                            <option value="">— Non assigné —</option>
                            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
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
                    <button className="btn-primary" onClick={handleSave}>Ajouter au Pipeline</button>
                </div>
            </Modal>
        </div>
    );
};

export default Pipeline;
