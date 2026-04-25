import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
    MoreVertical, FileText, MessageSquare, Bookmark, FileSignature, CreditCard, Folder, Wrench,
    Circle, Clock, CheckCircle2, Star, Link as LinkIcon, Megaphone, User,
    Search, ArrowRight, Trash2, Calendar
} from 'lucide-react';
import { useContactStore, STATUS_TO_COLUMN, type CrmContact } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';
import { fetchCommercials } from '../api/contactApi';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import Modal from '@/components/ui/Modal';

// ---------- Types ----------
const COLUMN_META: Record<string, { title: string; color: string; icon: React.ReactNode }> = {
    prospect: { title: 'Prospect', color: '#64748b', icon: <Circle size={16} /> },
    qualification: { title: 'Qualification', color: '#E96C2E', icon: <Clock size={16} /> },
    rdv: { title: 'RDV', color: '#F59E0B', icon: <Calendar size={16} /> },
    proposition: { title: 'Proposition Commerciale', color: '#3B82F6', icon: <FileText size={16} /> },
    negociation: { title: 'Négociation', color: '#8B5CF6', icon: <MessageSquare size={16} /> },
    reservation: { title: 'Réservation', color: '#EC4899', icon: <Bookmark size={16} /> },
    contrat: { title: 'Contrat', color: '#6366F1', icon: <FileSignature size={16} /> },
    paiement: { title: 'Paiement', color: '#14B8A6', icon: <CreditCard size={16} /> },
    transfert_technique: { title: 'Transfert Technique', color: '#F97316', icon: <Folder size={16} /> },
    suivi_chantier: { title: 'Suivi Chantier', color: '#FBBF24', icon: <Wrench size={16} /> },
    livraison: { title: 'Livraison Client', color: '#10B981', icon: <CheckCircle2 size={16} /> },
    fidelisation: { title: 'Fidélisation', color: '#2B2E83', icon: <Star size={16} /> },
    pas_interesse: { title: 'Pas intéressé', color: '#ef4444', icon: <Trash2 size={16} /> },
};

const columnOrder = [
    'prospect', 'qualification', 'rdv', 'proposition', 'negociation',
    'reservation', 'contrat', 'paiement', 'transfert_technique',
    'suivi_chantier', 'livraison', 'fidelisation', 'pas_interesse'
];

const COLUMN_TO_STATUS: Record<string, string> = {
    prospect: 'Prospect',
    qualification: 'Qualification',
    rdv: 'RDV',
    proposition: 'Proposition Commerciale',
    negociation: 'Négociation',
    reservation: 'Réservation',
    contrat: 'Contrat',
    paiement: 'Paiement',
    transfert_technique: 'Transfert de dossier technique',
    suivi_chantier: 'Suivi Chantier',
    livraison: 'Livraison Client',
    fidelisation: 'Fidélisation',
    pas_interesse: 'Pas intéressé',
};

const REFUSAL_REASONS = [
    "Prospect n'a pas de budget",
    "Prospect n'a pas confiance",
    "Prospect a peur des litiges",
    "Prospect veut voir avec sa banque",
    "La localisation est un peu loin pour le prospect",
    "Autre (Précisez ci-dessous)"
];

const SERVICE_LABELS: Record<string, { label: string; color: string }> = {
    foncier: { label: 'Foncier', color: '#E96C2E' },
    construction: { label: 'Construction', color: '#2B2E83' },
    gestion_immobiliere: { label: 'Gestion Immo', color: '#10B981' },
};

// ---------- KanbanCard ----------
const KanbanCard = ({
    contact, colId, colColor, onMove, onDelete, userRole
}: {
    contact: CrmContact; colId: string; colColor: string;
    onMove: (id: number, toColId: string) => void;
    onDelete: (id: number) => void;
    userRole?: string;
}) => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const curIdx = columnOrder.indexOf(colId);
    const nextCol = columnOrder.slice(curIdx + 1).find(c => c !== 'pas_interesse');
    const svc = contact.service ? SERVICE_LABELS[contact.service] : null;

    return (
        <div
            className="kanban-card"
            style={{ cursor: 'pointer', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.5rem' }}
            onClick={() => navigate(`/prospects/${contact.id}`)}
        >
            <div className="kcard-header" style={{ marginBottom: '0.5rem' }}>
                <div className="kcard-avatar" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                    {contact.name.charAt(0)}
                </div>
                <div className="kcard-info">
                    <span className="kcard-name" style={{ fontSize: '0.813rem', fontWeight: 600 }}>{contact.name}</span>
                    {contact.company && <span className="kcard-company" style={{ fontSize: '0.7rem' }}>{contact.company}</span>}
                </div>
                <div className="kcard-menu-wrap" onClick={e => e.stopPropagation()}>
                    <button className="btn-icon-sm" onClick={() => setMenuOpen(!menuOpen)}>
                        <MoreVertical size={14} />
                    </button>
                    {menuOpen && (
                        <div className="kcard-dropdown">
                            {nextCol && ['commercial', 'admin', 'dir_commercial'].includes(userRole || '') && (
                                <button onClick={() => { onMove(contact.id, nextCol); setMenuOpen(false); }}>
                                    <ArrowRight size={13} /> Avancer l'étape
                                </button>
                            )}
                            <button onClick={() => { navigate(`/prospects/${contact.id}`); setMenuOpen(false); }}>
                                <FileText size={13} /> Voir la fiche
                            </button>
                            {colId !== 'pas_interesse' && (
                                <button className="danger" onClick={() => { onMove(contact.id, 'pas_interesse'); setMenuOpen(false); }}>
                                    <Trash2 size={13} /> Pas intéressé
                                </button>
                            )}
                            {['admin', 'dir_commercial'].includes(userRole || '') && (
                                <button className="danger" onClick={() => { onDelete(contact.id); setMenuOpen(false); }}>
                                    <Trash2 size={13} /> Supprimer
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="kcard-meta" style={{ gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                {svc && (
                    <span className="kcard-tag" style={{
                        fontSize: '0.65rem', padding: '1px 6px', color: svc.color,
                        borderColor: svc.color + '33', background: svc.color + '0a'
                    }}>
                        {svc.label}
                    </span>
                )}
                {contact.source && (
                    <span className="kcard-tag" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        <Megaphone size={9} /> {contact.source}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {contact.propertyTitle && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <LinkIcon size={10} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.propertyTitle}</span>
                    </div>
                )}
                <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={10} /> {contact.assignedAgent || 'Non assigné'}
                </div>
            </div>

            <div className="kcard-footer" style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <span className="kcard-since" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    #{contact.id} · {contact.phone}
                </span>
                {nextCol && ['commercial', 'admin', 'dir_commercial'].includes(userRole || '') && (
                    <button
                        className="kcard-advance-btn"
                        style={{ borderColor: colColor, color: colColor, padding: '2px 8px', fontSize: '0.65rem' }}
                        onClick={() => onMove(contact.id, nextCol)}
                    >
                        Avancer <ArrowRight size={10} />
                    </button>
                )}
            </div>
        </div>
    );
};

// ---------- Page Pipeline ----------
const Pipeline = () => {
    const { contacts, moveContactStatus, deleteContact } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [search, setSearch] = useState('');
    const [agentFilter, setAgentFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [commercials, setCommercials] = useState<any[]>([]);

    const [moveModal, setMoveModal] = useState<{ contactId: number; targetStatus: string; contactName: string } | null>(null);
    const [transitionNote, setTransitionNote] = useState('');
    const [selectedRefusal, setSelectedRefusal] = useState('');
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await fetchCommercials();
            setCommercials(data);
        };
        load();
    }, []);

    const agentOptions = useMemo(() => {
        try {
            const supervised = getSupervisedAgentNames(user, commercials);
            if (supervised === null) return commercials.map(c => c.name).sort();
            return supervised.sort();
        } catch (err) {
            console.error("Error calculating agentOptions:", err);
            return [];
        }
    }, [commercials, user]);

    const columns = useMemo(() => {
        try {
            const supervisedNames = getSupervisedAgentNames(user, commercials);
            const lowerSupervised = supervisedNames ? supervisedNames.map(n => n?.trim().toLowerCase()) : null;

            return columnOrder.reduce((acc, colId) => {
                const statusForCol = COLUMN_TO_STATUS[colId];
                let list = (contacts || []).filter(c => STATUS_TO_COLUMN[c.status] === colId || c.status === statusForCol);

                if (lowerSupervised !== null) {
                    if (user?.role === 'assistante') {
                        list = list.filter(c => c.createdBy === user?.name || !c.assignedAgent);
                    } else {
                        list = list.filter(c => lowerSupervised.includes((c.assignedAgent || '').trim().toLowerCase()));
                    }
                }

                if (user?.role === 'manager') {
                    const userService = user.service === 'gestion' ? 'gestion_immobiliere' : user.service;
                    list = list.filter(c => !c.service || c.service === userService);
                }

                if (agentFilter) list = list.filter(c => (c.assignedAgent || '').trim().toLowerCase() === agentFilter.toLowerCase());
                if (serviceFilter) list = list.filter(c => c.service === serviceFilter);

                acc[colId] = list;
                return acc;
            }, {} as Record<string, CrmContact[]>);
        } catch (err) {
            console.error("Error calculating columns:", err);
            return columnOrder.reduce((acc, colId) => { acc[colId] = []; return acc; }, {} as Record<string, CrmContact[]>);
        }
    }, [contacts, user, commercials, agentFilter, serviceFilter]);

    const filteredColumns = useMemo(() => {
        try {
            if (!search.trim()) return columns;
            const q = search.toLowerCase();
            return columnOrder.reduce((acc, colId) => {
                acc[colId] = (columns[colId] || []).filter(c =>
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.company || '').toLowerCase().includes(q) ||
                    (c.phone || '').toLowerCase().includes(q) ||
                    (c.email && c.email.toLowerCase().includes(q)) ||
                    (c.notes && c.notes.toLowerCase().includes(q)) ||
                    (c.assignedAgent && c.assignedAgent.toLowerCase().includes(q)) ||
                    (c.service && c.service.toLowerCase().includes(q)) ||
                    (c.propertyTitle && c.propertyTitle.toLowerCase().includes(q))
                );
                return acc;
            }, {} as Record<string, CrmContact[]>);
        } catch (err) {
            console.error("Error calculating filteredColumns:", err);
            return columns;
        }
    }, [columns, search]);

    const filteredTotal = Object.values(filteredColumns).reduce((s, arr) => s + arr.length, 0);

    const moveCard = (id: number, toColId: string) => {
        const newStatus = COLUMN_TO_STATUS[toColId];
        const contact = contacts.find(c => c.id === id);
        if (newStatus && contact) {
            setMoveModal({ contactId: id, targetStatus: newStatus, contactName: contact.name });
            setTransitionNote('');
            setSelectedRefusal('');
        }
    };

    const confirmMove = async () => {
        if (!moveModal) return;
        setIsMoving(true);
        
        // Build the final note
        let finalNote = transitionNote.trim();
        if (moveModal.targetStatus === 'Pas intéressé') {
            if (selectedRefusal && !selectedRefusal.includes('Autre')) {
                finalNote = selectedRefusal + (transitionNote ? ` - ${transitionNote}` : '');
            }
        }

        try {
            const success = await moveContactStatus(
                moveModal.contactId, 
                moveModal.targetStatus, 
                finalNote || undefined,
                user?.name,
                selectedRefusal || undefined
            );
            if (success) {
                showToast(`Passage à l'étape : ${moveModal.targetStatus}`);
                setMoveModal(null);
            } else {
                showToast(`Erreur lors de la mise à jour`, 'error');
            }
        } finally {
            setIsMoving(false);
        }
    };

    return (
        <div className="pipeline-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Pipeline Commercial</h1>
                    <p className="subtitle">Suivi visuel du cycle de vente ({filteredTotal} prospects)</p>
                </div>
            </div>

            <div className="pipeline-toolbar card-premium mb-4" style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
                    <Search size={18} className="text-muted" />
                    <input type="text" placeholder="Rechercher (nom, commercial, tel...)" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="filter-group d-flex align-items-center gap-2">
                    <User size={16} className="text-muted" />
                    <select className="form-select-sm" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} style={{ minWidth: '180px' }}>
                        <option value="">Tous les commerciaux</option>
                        {agentOptions.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <div className="filter-group d-flex align-items-center gap-2">
                    <Folder size={16} className="text-muted" />
                    <select className="form-select-sm" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ minWidth: '150px' }}>
                        <option value="">Tous les services</option>
                        <option value="foncier">Vente Terrains</option>
                        <option value="construction">Construction</option>
                        <option value="gestion_immobiliere">Gestion Immo</option>
                    </select>
                </div>
                {(search || agentFilter || serviceFilter) && (
                    <button className="btn-text-sm text-primary" onClick={() => { setSearch(''); setAgentFilter(''); setServiceFilter(''); }}>Réinitialiser</button>
                )}
            </div>

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
                            </div>
                            <div className="column-body">
                                {cards.length > 0 ? cards.map(contact => (
                                    <KanbanCard key={contact.id} contact={contact} colId={colId} colColor={meta.color} onMove={moveCard} onDelete={deleteContact} userRole={user?.role} />
                                )) : (
                                    <div className="empty-column">
                                        <Circle size={16} style={{ color: 'var(--text-muted)', opacity: 0.3 }} /> {search ? 'Aucun résultat' : 'Colonne vide'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={!!moveModal} onClose={() => setMoveModal(null)} title={`Avancement : ${moveModal?.contactName}`} size="md">
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Vous déplacez ce prospect vers l'étape : <strong>{moveModal?.targetStatus}</strong>
                    </p>

                    {moveModal?.targetStatus === 'Pas intéressé' ? (
                        <div className="refusal-selection mb-15">
                            <label className="form-label" style={{ fontWeight: 700 }}>Motif du refus</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                {REFUSAL_REASONS.map(reason => (
                                    <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <input 
                                            type="radio" 
                                            name="refusal_reason" 
                                            value={reason} 
                                            checked={selectedRefusal === reason}
                                            onChange={e => setSelectedRefusal(e.target.value)}
                                        />
                                        {reason}
                                    </label>
                                ))}
                            </div>
                            {(selectedRefusal.includes('Autre') || selectedRefusal === '') && (
                                <div className="mt-15">
                                    <label className="form-label">Note complémentaire / Précisions</label>
                                    <textarea 
                                        className="form-textarea" rows={3} 
                                        placeholder="Détaillez la raison du refus..." 
                                        value={transitionNote} 
                                        onChange={e => setTransitionNote(e.target.value)} 
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">Note de suivi (facultatif)</label>
                            <textarea className="form-textarea" rows={4} placeholder="Décrivez la situation..." value={transitionNote} onChange={e => setTransitionNote(e.target.value)} />
                        </div>
                    )}
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setMoveModal(null)} disabled={isMoving}>Annuler</button>
                    <button className="btn-primary" onClick={confirmMove} disabled={isMoving || (moveModal?.targetStatus === 'Pas intéressé' && !selectedRefusal)}>
                        {isMoving ? 'Mise à jour...' : 'Confirmer le changement'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Pipeline;
