import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
    MoreVertical, FileText, MessageSquare, Bookmark, FileSignature, CreditCard, Folder, Wrench,
    Circle, Clock, CheckCircle2, Star, Link as LinkIcon, Megaphone, User,
    Search, Trash2, Calendar, GripVertical
} from 'lucide-react';
import { useContactStore, STATUS_TO_COLUMN, type CrmContact } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';
import { fetchCommercials } from '../api/contactApi';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import Modal from '@/components/ui/Modal';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

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
    contact, colId, colColor, onMove, onDelete, userRole, provided, isDragging
}: {
    contact: CrmContact; colId: string; colColor: string;
    onMove: (id: number, toColId: string) => void;
    onDelete: (id: number) => void;
    userRole?: string;
    provided: any;
    isDragging: boolean;
}) => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const svc = contact.service ? SERVICE_LABELS[contact.service] : null;

    return (
        <div
            className={`kanban-card ${isDragging ? 'dragging' : ''}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ 
                ...provided.draggableProps.style,
                cursor: 'grab', 
                padding: '0.8rem', 
                borderRadius: '12px', 
                marginBottom: '0.75rem',
                borderLeft: `4px solid ${colColor}`,
                boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.1)' : 'var(--shadow-sm)'
            }}
            onClick={() => navigate(`/prospects/${contact.id}`)}
        >
            <div className="kcard-header" style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="drag-handle" style={{ color: 'var(--text-muted)', display: 'flex', opacity: 0.5 }}>
                    <GripVertical size={14} />
                </div>
                <div className="kcard-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem', backgroundColor: colColor + '22', color: colColor }}>
                    {contact.name.charAt(0)}
                </div>
                <div className="kcard-info" style={{ flex: 1 }}>
                    <span className="kcard-name" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>{contact.name}</span>
                    {contact.company && <span className="kcard-company" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.company}</span>}
                </div>
                <div className="kcard-menu-wrap" onClick={e => e.stopPropagation()}>
                    <button className="btn-icon-sm" onClick={() => setMenuOpen(!menuOpen)}>
                        <MoreVertical size={14} />
                    </button>
                    {menuOpen && (
                        <div className="kcard-dropdown">
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

            <div className="kcard-meta" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {svc && (
                    <span className="kcard-tag" style={{
                        fontSize: '0.7rem', padding: '2px 8px', color: svc.color,
                        borderColor: svc.color + '33', background: svc.color + '11',
                        borderRadius: '4px', fontWeight: 600
                    }}>
                        {svc.label}
                    </span>
                )}
                {contact.source && (
                    <span className="kcard-tag" style={{ 
                        fontSize: '0.7rem', padding: '2px 8px', 
                        background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                        borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <Megaphone size={10} /> {contact.source}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {contact.propertyTitle && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LinkIcon size={12} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.propertyTitle}</span>
                    </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={12} /> {contact.assignedAgent || 'Non assigné'}
                </div>
            </div>

            <div className="kcard-footer" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <span className="kcard-since" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    #{contact.id} · {contact.phone}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    <Clock size={10} /> {contact.lastAction || 'Récemment'}
                </div>
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

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const contactId = parseInt(draggableId);
        const targetStatusId = destination.droppableId;
        const newStatus = COLUMN_TO_STATUS[targetStatusId];
        const contact = contacts.find(c => c.id === contactId);

        if (newStatus && contact) {
            setMoveModal({ contactId, targetStatus: newStatus, contactName: contact.name });
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
                showToast(`Mise à jour : ${moveModal.targetStatus}`);
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
                    <p className="subtitle">Gérez vos prospects par glisser-déposer ({filteredTotal} prospects)</p>
                </div>
            </div>

            <div className="pipeline-toolbar mb-4">
                <div className="search-box">
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

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board" style={{ paddingBottom: '2rem' }}>
                    {columnOrder.map(colId => {
                        const meta = COLUMN_META[colId];
                        const cards = filteredColumns[colId] ?? [];
                        return (
                            <div key={colId} className="kanban-column">
                                <div className="column-header" style={{ borderTopColor: meta.color, borderRadius: '12px 12px 0 0', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div className="column-title">
                                        <span style={{ color: meta.color }}>{meta.icon}</span>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{meta.title}</h3>
                                        <span className="column-count" style={{ backgroundColor: meta.color + '22', color: meta.color, fontSize: '0.75rem' }}>{cards.length}</span>
                                    </div>
                                </div>
                                <Droppable droppableId={colId}>
                                    {(provided, snapshot) => (
                                        <div 
                                            className={`column-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{ 
                                                background: snapshot.isDraggingOver ? meta.color + '08' : 'transparent',
                                                transition: 'background 0.2s ease',
                                                minHeight: '200px',
                                                padding: '1rem 0.75rem'
                                            }}
                                        >
                                            {cards.length > 0 ? cards.map((contact, index) => (
                                                <Draggable key={contact.id} draggableId={contact.id.toString()} index={index}>
                                                    {(provided, snapshot) => (
                                                        <KanbanCard 
                                                            contact={contact} 
                                                            colId={colId} 
                                                            colColor={meta.color} 
                                                            onMove={moveCard}
                                                            onDelete={deleteContact} 
                                                            userRole={user?.role} 
                                                            provided={provided}
                                                            isDragging={snapshot.isDragging}
                                                        />
                                                    )}
                                                </Draggable>
                                            )) : (
                                                <div className="empty-column" style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', margin: '0.5rem 0' }}>
                                                    <Circle size={16} style={{ color: 'var(--text-muted)', opacity: 0.3 }} /> 
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{search ? 'Aucun résultat' : 'Déposez ici'}</span>
                                                </div>
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>

            <Modal isOpen={!!moveModal} onClose={() => setMoveModal(null)} title={`Changement d'étape : ${moveModal?.contactName}`} size="md">
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
                             {moveModal?.contactName.charAt(0)}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontWeight: 600 }}>{moveModal?.contactName}</p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Nouvelle étape : <strong style={{ color: 'var(--primary)' }}>{moveModal?.targetStatus}</strong>
                            </p>
                        </div>
                    </div>

                    {moveModal?.targetStatus === 'Pas intéressé' ? (
                        <div className="refusal-selection mb-15">
                            <label className="form-label" style={{ fontWeight: 700 }}>Motif du refus <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                {REFUSAL_REASONS.map(reason => (
                                    <label key={reason} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', 
                                        cursor: 'pointer', padding: '10px 12px', background: selectedRefusal === reason ? 'var(--primary-light)' : '#f8fafc', 
                                        borderRadius: '8px', border: '1px solid', borderColor: selectedRefusal === reason ? 'var(--primary)' : '#e2e8f0',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input 
                                            type="radio" 
                                            name="refusal_reason" 
                                            value={reason} 
                                            checked={selectedRefusal === reason}
                                            onChange={e => setSelectedRefusal(e.target.value)}
                                        />
                                        <span style={{ fontWeight: selectedRefusal === reason ? 600 : 400 }}>{reason}</span>
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
                                        style={{ borderRadius: '8px' }}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">Note de suivi (facultatif)</label>
                            <textarea 
                                className="form-textarea" rows={4} 
                                placeholder="Ajoutez un commentaire sur ce changement d'étape..." 
                                value={transitionNote} 
                                onChange={e => setTransitionNote(e.target.value)} 
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}
                </div>
                <div className="form-actions" style={{ gap: '12px' }}>
                    <button className="btn-secondary" onClick={() => setMoveModal(null)} disabled={isMoving} style={{ borderRadius: '8px', flex: 1 }}>Annuler</button>
                    <button 
                        className="btn-primary" 
                        onClick={confirmMove} 
                        disabled={isMoving || (moveModal?.targetStatus === 'Pas intéressé' && !selectedRefusal)}
                        style={{ borderRadius: '8px', flex: 2 }}
                    >
                        {isMoving ? 'Mise à jour...' : 'Confirmer le déplacement'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Pipeline;

