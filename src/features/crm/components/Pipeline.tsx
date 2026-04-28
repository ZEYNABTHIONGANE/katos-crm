import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
    Search, User, Filter, Layout, Phone, 
    Calendar, ArrowRight, MoreVertical, Trash2, 
    Circle, Folder, GripVertical, FileText, Megaphone, MapPin,
    CreditCard, FileCheck, Truck, Heart, XCircle, Settings, ClipboardList,
    Upload, Plus
} from 'lucide-react';
import { useContactStore } from '@/stores/contactStore';
import type { CrmContact } from '@/stores/contactStore';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/app/providers/ToastProvider';
import { REFUSAL_REASONS } from '../utils/crmConstants';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';

const COLUMN_META: Record<string, { title: string; color: string; icon: any }> = {
    'prospect': { title: 'Prospect', color: '#E96C2E', icon: <User size={18} /> },
    'qualification': { title: 'Qualification', color: '#F59E0B', icon: <Filter size={18} /> },
    'rdv': { title: 'RDV', color: '#8b5cf6', icon: <Calendar size={18} /> },
    'visite_terrain': { title: 'Visite Terrain', color: '#c026d3', icon: <MapPin size={18} /> },
    'proposition': { title: 'Proposition', color: '#2B2E83', icon: <ClipboardList size={18} /> },
    'negociation': { title: 'Négociation', color: '#6366f1', icon: <Layout size={18} /> },
    'reservation': { title: 'Réservation', color: '#ec4899', icon: <FileCheck size={18} /> },
    'contrat': { title: 'Contrat', color: '#10B981', icon: <ArrowRight size={18} /> },
    'paiement': { title: 'Paiement', color: '#059669', icon: <CreditCard size={18} /> },
    'transfert_technique': { title: 'Transfert Tech', color: '#0ea5e9', icon: <Settings size={18} /> },
    'suivi_chantier': { title: 'Suivi Chantier', color: '#f97316', icon: <Truck size={18} /> },
    'livraison': { title: 'Livraison', color: '#10b981', icon: <Truck size={18} /> },
    'fidelisation': { title: 'Fidélisation', color: '#ef4444', icon: <Heart size={18} /> },
    'pas_interesse': { title: 'Pas intéressé', color: '#64748b', icon: <XCircle size={18} /> }
};

const columnOrder = [
    'prospect', 'qualification', 'rdv', 'visite_terrain', 'proposition', 'negociation', 
    'reservation', 'contrat', 'paiement', 'transfert_technique', 
    'suivi_chantier', 'livraison', 'fidelisation', 'pas_interesse'
] as const;

const STATUS_TO_COLUMN: Record<string, string> = {
    'Prospect': 'prospect',
    'Qualification': 'qualification',
    'En Qualification': 'qualification',
    'RDV': 'rdv',
    'RDV / Visite Terrain': 'visite_terrain',
    'Visite Terrain': 'visite_terrain',
    'Proposition Commerciale': 'proposition',
    'Négociation': 'negociation',
    'Réservation': 'reservation',
    'Contrat': 'contrat',
    'Paiement': 'paiement',
    'Transfert de dossier technique': 'transfert_technique',
    'Suivi Chantier': 'suivi_chantier',
    'Livraison Client': 'livraison',
    'Fidélisation': 'fidelisation',
    'Pas intéressé': 'pas_interesse'
};

// Aligning with Store's STATUS_TO_COLUMN more strictly
const FINAL_STATUS_MAP: Record<string, string> = {
    'prospect': 'Prospect',
    'qualification': 'En Qualification',
    'rdv': 'RDV',
    'visite_terrain': 'Visite Terrain',
    'proposition': 'Proposition Commerciale',
    'negociation': 'Négociation',
    'reservation': 'Réservation',
    'contrat': 'Contrat',
    'paiement': 'Paiement',
    'transfert_technique': 'Transfert dossier tech',
    'suivi_chantier': 'Suivi Chantier',
    'livraison': 'Livraison Client',
    'fidelisation': 'Fidélisation',
    'pas_interesse': 'Pas intéressé'
};

const getAgentColor = (name: string) => {
    if (!name) return { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' };
    const colors = [
        { bg: 'rgba(43, 46, 131, 0.1)', text: '#2B2E83' }, 
        { bg: 'rgba(233, 108, 46, 0.1)', text: '#E96C2E' }, 
        { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' }, 
        { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366F1' }, 
        { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

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
    onMove: (contact: CrmContact) => void;
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
            data-col-id={colId}
            style={{ 
                ...provided.draggableProps.style,
                padding: '0.8rem', 
                borderRadius: '12px', 
                marginBottom: '0.75rem',
                borderLeft: `4px solid ${colColor}`,
                boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.1)' : 'var(--shadow-sm)',
                cursor: 'grab'
            }}
            onClick={() => navigate(`/prospects/${contact.id}`)}
        >
            <div className="kcard-header" style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="drag-handle" style={{ color: 'var(--text-muted)', display: 'flex', opacity: 0.5 }}>
                    <GripVertical size={14} />
                </div>
                <div className="kcard-info" style={{ flex: 1 }}>
                    <span className="kcard-name" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>{contact.name}</span>
                    {contact.company && <span className="kcard-company" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{contact.company}</span>}
                </div>
                <div className="kcard-menu-wrap" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                    <button className="btn-icon-sm" onClick={() => setMenuOpen(!menuOpen)}>
                        <MoreVertical size={14} />
                    </button>
                    {menuOpen && (
                        <div className="kcard-dropdown" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', minWidth: '150px' }}>
                            <button onClick={() => { navigate(`/prospects/${contact.id}`); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}>
                                <FileText size={13} /> Voir la fiche
                            </button>
                            <button onClick={() => { onMove(contact); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}>
                                <ArrowRight size={13} /> Avancer l'étape
                            </button>
                            <button onClick={() => { onMove({ ...contact, targetStatusOverride: 'Pas intéressé' } as any); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--danger)' }}>
                                <XCircle size={13} /> Pas intéressé
                            </button>
                            {['admin', 'dir_commercial'].includes(userRole || '') && (
                                <button className="danger" onClick={() => { if(window.confirm('Supprimer ce prospect ?')) onDelete(contact.id); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--danger)' }}>
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
                        borderRadius: '4px', fontWeight: 600, border: '1px solid'
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                {contact.phone && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} /> <span>{contact.phone}</span>
                    </div>
                )}
                {contact.assignedAgent ? (() => {
                    const theme = getAgentColor(contact.assignedAgent);
                    return (
                        <div style={{ 
                            fontSize: '0.7rem', 
                            padding: '3px 8px', 
                            borderRadius: '12px', 
                            background: theme.bg, 
                            color: theme.text, 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            fontWeight: 600,
                            marginTop: '2px'
                        }}>
                            <User size={10} /> {contact.assignedAgent}
                        </div>
                    );
                })() : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={12} /> À dispatcher
                    </div>
                )}
            </div>

            <div className="kcard-footer" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                        className="btn-icon-sm danger" 
                        title="Pas intéressé"
                        style={{ width: '24px', height: '24px', padding: 0 }}
                        onClick={() => onMove({ ...contact, targetStatusOverride: 'Pas intéressé' } as any)}
                    >
                        <XCircle size={14} />
                    </button>
                    <span className="kcard-since" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        #{contact.id}
                    </span>
                </div>
                <button 
                    className="kcard-advance-btn" 
                    style={{ color: colColor, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => onMove(contact)}
                >
                    Avancer <ArrowRight size={12} />
                </button>
            </div>
        </div>
    );
};

const Pipeline = () => {
    const { contacts, commercials, moveContactStatus, deleteContact } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [agentFilter, setAgentFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [moveModal, setMoveModal] = useState<any>(null);
    const [transitionNote, setTransitionNote] = useState('');
    const [selectedRefusal, setSelectedRefusal] = useState('');
    const [isMoving, setIsMoving] = useState(false);

    const agentOptions = useMemo(() => {
        try {
            const supervisedNames = getSupervisedAgentNames(user, commercials);
            if (supervisedNames === null) {
                const set = new Set<string>();
                contacts.forEach(c => { if (c.assignedAgent) set.add(c.assignedAgent); });
                return Array.from(set).sort();
            }
            return supervisedNames.sort();
        } catch (err) {
            console.error("Error calculating agentOptions:", err);
            return [];
        }
    }, [commercials, user, contacts]);

    const filteredContacts = useMemo(() => {
        try {
            const supervisedNames = getSupervisedAgentNames(user, commercials);
            const lowerSupervised = supervisedNames ? supervisedNames.map(n => n?.trim().toLowerCase()) : null;

            return (contacts || []).filter(c => {
                const matchesSearch = !search || 
                    c.name.toLowerCase().includes(search.toLowerCase()) ||
                    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
                    (c.phone || '').includes(search) ||
                    (c.assignedAgent || '').toLowerCase().includes(search.toLowerCase());
                
                const matchesAgent = !agentFilter 
                    || (agentFilter === 'UNASSIGNED' && !c.assignedAgent) 
                    || (c.assignedAgent || '').trim().toLowerCase() === agentFilter.toLowerCase();
                    
                const matchesService = !serviceFilter || c.service === serviceFilter;

                let isAllowed = true;
                if (lowerSupervised !== null) {
                    if (user?.role === 'assistante') {
                        isAllowed = !!(c.createdBy === user?.name || !c.assignedAgent);
                    } else if (user?.role === 'resp_commercial') {
                        // Un responsable ne voit QUE ses agents supervisés (pas les non assignés)
                        isAllowed = !!(c.assignedAgent && lowerSupervised.includes((c.assignedAgent || '').trim().toLowerCase()));
                    } else if (user?.role === 'commercial') {
                        // Un commercial ne voit QUE ses propres prospects
                        isAllowed = (c.assignedAgent || '').trim().toLowerCase() === (user?.name || '').trim().toLowerCase();
                    } else {
                        // Pour les autres (Admin, Dir_Com), on autorise tout ce qui est supervisé ou non assigné
                        isAllowed = !!(!c.assignedAgent || lowerSupervised.includes((c.assignedAgent || '').trim().toLowerCase()));
                    }
                }

                return matchesSearch && matchesAgent && matchesService && isAllowed;
            });
        } catch (err) {
            console.error("Error calculating filteredContacts:", err);
            return [];
        }
    }, [contacts, search, agentFilter, serviceFilter, user, commercials]);

    const filteredTotal = filteredContacts.length;

    const filteredColumns = useMemo(() => {
        try {
            const cols: Record<string, any[]> = {
                prospect: [], qualification: [], rdv: [], visite_terrain: [], proposition: [], negociation: [], 
                reservation: [], contrat: [], paiement: [], transfert_technique: [], 
                suivi_chantier: [], livraison: [], fidelisation: [], pas_interesse: []
            };

            filteredContacts.forEach(c => {
                const colId = STATUS_TO_COLUMN[c.status] || 'prospect';
                if (cols[colId]) cols[colId].push(c);
            });

            return cols;
        } catch (err) {
            console.error("Error calculating filteredColumns:", err);
            return {};
        }
    }, [filteredContacts]);

    const onDragEnd = (result: any) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const contact = contacts.find(c => c.id.toString() === draggableId);
        if (!contact) return;

        const targetStatus = FINAL_STATUS_MAP[destination.droppableId];
        handleMoveAttempt(contact, targetStatus);
    };

    const handleMoveAttempt = (contact: any, targetStatus: string) => {
        setMoveModal({ contactId: contact.id, contactName: contact.name, targetStatus });
    };

    const confirmMove = async (id?: number, status?: string, refusalReason?: string) => {
        const contactId = id || moveModal?.contactId;
        const targetStatus = status || moveModal?.targetStatus;
        if (!contactId || !targetStatus) return;

        setIsMoving(true);
        try {
            await moveContactStatus(contactId, targetStatus, transitionNote, user?.name, refusalReason);
            showToast(`Statut mis à jour : ${targetStatus}`);
            setMoveModal(null);
            setTransitionNote('');
            setSelectedRefusal('');
        } catch (err) {
            showToast('Erreur lors de la mise à jour', 'error');
        } finally {
            setIsMoving(false);
        }
    };

    const moveCard = (contact: any) => {
        if (contact.targetStatusOverride) {
            handleMoveAttempt(contact, contact.targetStatusOverride);
            return;
        }
        const currentIndex = columnOrder.indexOf(STATUS_TO_COLUMN[contact.status] as any);
        if (currentIndex < columnOrder.length - 1) {
            const nextColId = columnOrder[currentIndex + 1];
            handleMoveAttempt(contact, FINAL_STATUS_MAP[nextColId]);
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="pipeline-page">
                <div className="page-header d-flex-between" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h1>Pipeline Commercial</h1>
                        <p className="subtitle">Visualisez et gérez l'avancement de vos dossiers ({filteredTotal} prospects)</p>
                    </div>
                    <div className="d-flex gap-2">
                        {['admin', 'dir_commercial', 'assistante', 'marketing'].includes(user?.role || '') && (
                            <>
                                <button className="btn-secondary btn-sm" style={{ height: '38px', gap: '8px', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/prospects?action=import')}>
                                    <Upload size={16} /> Importer
                                </button>
                                <button className="btn-primary btn-sm" style={{ height: '38px', gap: '8px', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/prospects?action=new')}>
                                    <Plus size={16} /> Nouveau Prospect
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="pipeline-toolbar mb-3">
                    <div className="search-box">
                        <Search size={16} className="text-muted" />
                        <input 
                            type="text" 
                            placeholder="Rechercher par nom..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                    </div>
                    <div className="filter-group">
                        <User size={14} className="text-muted" />
                        <select 
                            value={agentFilter} 
                            onChange={(e) => setAgentFilter(e.target.value)} 
                        >
                            <option value="">Tous les commerciaux</option>
                            <option value="UNASSIGNED">À dispatcher</option>
                            {agentOptions.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <Folder size={14} className="text-muted" />
                        <select 
                            value={serviceFilter} 
                            onChange={(e) => setServiceFilter(e.target.value)} 
                        >
                            <option value="">Tous les services</option>
                            <option value="foncier">Vente Terrains</option>
                            <option value="construction">Construction</option>
                            <option value="gestion_immobiliere">Gestion Immo</option>
                        </select>
                    </div>
                    {(search || agentFilter || serviceFilter) && (
                        <button className="btn-text-sm text-primary" onClick={() => { setSearch(''); setAgentFilter(''); setServiceFilter(''); }} style={{ fontSize: '0.75rem', fontWeight: 600 }}>Réinitialiser</button>
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
                                        <span style={{ color: meta.color }}>{meta.icon}</span>
                                        <h3>{meta.title}</h3>
                                        <span className="column-count" style={{ backgroundColor: meta.color + '22', color: meta.color }}>{cards.length}</span>
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
                                                    {(provided, snapshot) => {
                                                        const child = (
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
                                                        );
                                                        if (snapshot.isDragging) {
                                                            return createPortal(child, document.body);
                                                        }
                                                        return child;
                                                    }}
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
            </div>

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
                                            name="refusalReason" 
                                            value={reason} 
                                            checked={selectedRefusal === reason}
                                            onChange={() => setSelectedRefusal(reason)}
                                        />
                                        {reason}
                                    </label>
                                ))}
                            </div>
                            {(selectedRefusal.includes('Autre') || selectedRefusal === '') && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label className="form-label">Note complémentaire</label>
                                    <textarea 
                                        className="form-textarea" 
                                        placeholder="Précisez la raison..." 
                                        value={transitionNote} 
                                        onChange={e => setTransitionNote(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">Note de suivi (facultatif)</label>
                            <textarea 
                                className="form-textarea" 
                                placeholder="Ajoutez un commentaire sur ce changement..." 
                                value={transitionNote} 
                                onChange={e => setTransitionNote(e.target.value)}
                                rows={4}
                            />
                        </div>
                    )}

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2rem' }}>
                        <button className="btn-secondary" onClick={() => setMoveModal(null)}>Annuler</button>
                        <button 
                            className="btn-primary" 
                            disabled={isMoving || (moveModal?.targetStatus === 'Pas intéressé' && !selectedRefusal)}
                            onClick={() => confirmMove(moveModal.contactId, moveModal.targetStatus, selectedRefusal)}
                        >
                            {isMoving ? 'Traitement...' : 'Confirmer le déplacement'}
                        </button>
                    </div>
                </div>
            </Modal>
        </DragDropContext>
    );
};

export default Pipeline;
