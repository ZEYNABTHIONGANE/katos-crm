import { useState, useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
    MoreVertical, FileText, MessageSquare, Bookmark, FileSignature, CreditCard, Folder, Wrench,
    Circle, Clock, CheckCircle2, Star, Link as LinkIcon, Megaphone, User,
    Search, X, ArrowRight, Trash2, Calendar
} from 'lucide-react';
import { useContactStore, STATUS_TO_COLUMN, type CrmContact } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';

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
};

const columnOrder = [
    'prospect', 'qualification', 'rdv', 'proposition', 'negociation',
    'reservation', 'contrat', 'paiement', 'transfert_technique',
    'suivi_chantier', 'livraison', 'fidelisation'
];

// Inverse map: column → status
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
};



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
    const nextCol = columnOrder[curIdx + 1];
    const svc = contact.service ? SERVICE_LABELS[contact.service] : null;

    return (
        <div
            className="kanban-card"
            style={{ 
                cursor: 'pointer', 
                padding: '0.6rem',
                borderRadius: '8px',
                marginBottom: '0.5rem'
            }}
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
                            {/* ... menu items ... */}
                            {nextCol && (
                                <button onClick={() => { onMove(contact.id, nextCol); setMenuOpen(false); }}>
                                    <ArrowRight size={13} /> Avancer l'étape
                                </button>
                            )}
                            <button onClick={() => { navigate(`/prospects/${contact.id}`); setMenuOpen(false); }}>
                                <FileText size={13} /> Voir la fiche
                            </button>
                            {!['commercial', 'superviseur'].includes(userRole || '') && (
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
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        color: svc.color, 
                        borderColor: svc.color + '33', 
                        background: svc.color + '0a' 
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
                {nextCol && (
                    <button
                        className="kcard-advance-btn"
                        style={{ 
                            borderColor: colColor, 
                            color: colColor,
                            padding: '2px 8px',
                            fontSize: '0.65rem'
                        }}
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



    // Group contacts into columns based on their status
    const columns = useMemo(() => {
        return columnOrder.reduce((acc, colId) => {
            const statusForCol = COLUMN_TO_STATUS[colId];
            let filteredContacts = contacts.filter(c => STATUS_TO_COLUMN[c.status] === colId || c.status === statusForCol);

            // Un commercial voit TOUS ses propres contacts (tous services confondus)
            if (user?.role === 'commercial') {
                filteredContacts = filteredContacts.filter(c => c.assignedAgent === user.name);
            }
            
            // Un superviseur voit TOUT (identique à admin/dir_commercial)
            if (user?.role === 'superviseur') {
                // Pas de filtrage supplémentaire
            }

            // Restriction pour les managers : ne voir que les contacts de son service
            if (user?.role === 'manager') {
                const userService = user.service === 'gestion' ? 'gestion_immobiliere' : user.service;
                filteredContacts = filteredContacts.filter(c => !c.service || c.service === userService);
            }

            // Restriction pour l'assistante : voir ses propres prospects (ceux qu'elle a créés)
            if (user?.role === 'assistante') {
                filteredContacts = filteredContacts.filter(c => {
                    if (c.createdBy) return c.createdBy === user.name;
                    return !c.assignedAgent; // Fallback pour les anciens contacts
                });
            }

            acc[colId] = filteredContacts;
            return acc;
        }, {} as Record<string, CrmContact[]>);
    }, [contacts, user]);

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



    const moveCard = (id: number, toColId: string) => {
        const newStatus = COLUMN_TO_STATUS[toColId];
        if (newStatus) {
            moveContactStatus(id, newStatus);
            showToast(`Statut mis à jour : ${newStatus}`);
        }
    };


    return (
        <div className="pipeline-page">
            <div className="page-header d-flex-between" style={{ marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Pipeline Commercial</h1>
                    <p className="subtitle" style={{ fontSize: '0.813rem' }}>
                        {search ? `${filteredTotal} résultat(s) sur ${totalCards}` : `${totalCards} dossiers actifs`}
                        {' · '}Suivre les prospects par étapes
                    </p>
                </div>
            </div>

            {/* ── Barre de recherche ── */}
            <div className="card-premium" style={{ padding: '0.5rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Chercher par nom, téléphone, service..."
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.813rem', color: 'var(--text-main)' }}
                />
                {search && (
                    <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={14} />
                    </button>
                )}
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
                                        userRole={user?.role}
                                    />
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

        </div>
    );
};

export default Pipeline;
