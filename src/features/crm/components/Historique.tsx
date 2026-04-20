import { useState, useMemo } from 'react';
import type { ReactElement } from 'react';
import { Phone, Mail, Calendar, HardHat, FileText, Filter, Clock, User, MapPin, ChevronDown, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContactStore, type InteractionType } from '@/stores/contactStore';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { fetchCommercials } from '../api/contactApi';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import { useEffect } from 'react';
import Modal from '@/components/ui/Modal';

const INTERACTION_CONFIG: Record<InteractionType, { icon: ReactElement; label: string; color: string; bg: string }> = {
    call: { icon: <Phone size={16} />, label: 'Appel', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' },
    email: { icon: <Mail size={16} />, label: 'Email', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
    rdv: { icon: <Calendar size={16} />, label: 'Rendez-vous', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
    visite_terrain: { icon: <MapPin size={16} />, label: 'Visite Terrain', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
    visite_chantier: { icon: <HardHat size={16} />, label: 'Visite Chantier', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
    note: { icon: <FileText size={16} />, label: 'Note interne', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' },
};

const Historique = () => {
    const { contacts, interactions, visits, updateInteraction } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [filter, setFilter] = useState('all');
    const [agentFilter, setAgentFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [commercials, setCommercials] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            const data = await fetchCommercials();
            setCommercials(data);
        };
        load();
    }, []);

    const [editingInteraction, setEditingInteraction] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ title: '', description: '', date: '', heure: '', type: 'call' as InteractionType });

    const handleEdit = (item: any) => {
        setEditingInteraction(item);
        setEditForm({
            title: item.title,
            description: item.description || '',
            date: item.date,
            heure: item.heure || '',
            type: item.type
        });
    };

    const handleSaveEdit = () => {
        if (!editingInteraction) return;
        updateInteraction(editingInteraction.id, editForm);
        showToast('Interaction mise à jour');
        setEditingInteraction(null);
    };

    // Combine interactions and visits from store
    const unifiedHistory = useMemo(() => {
        const historyItems = [
            ...interactions.map(i => ({ 
                ...i, 
                category: 'interaction' as const,
                is_visit: false 
            })),
            ...visits.map(v => ({ 
                id: 'v' + v.id, 
                contactId: v.contactId,
                type: (v.type === 'chantier' ? 'visite_chantier' : v.type === 'terrain' ? 'visite_terrain' : 'rdv') as InteractionType,
                title: v.title,
                description: v.notes,
                date: v.date,
                heure: v.heure,
                agent: v.agent,
                lieu: v.lieu,
                category: 'visit' as const,
                is_visit: true,
                statut: v.statut,
                issue: undefined,
                technician: v.technician
            }))
        ];

        // Déduplication des éléments pour ne pas montrer à la fois l'interaction et la visite liée
        const uniqueItems: any[] = [];
        const seenKeys = new Set<string>();

        for (const item of historyItems) {
            // Pour les notes internes, on les garde toujours
            if (item.type === 'note') {
                uniqueItems.push(item);
                continue;
            }

            // Clé de déduplication basée sur le contact, la date, l'heure et le titre
            // On normalise le titre pour éviter les faux doublons dus aux espaces/casse
            const dateKey = `${item.contactId}_${item.date}_${item.heure || '00:00'}`;
            const titleKey = (item.title || '').toLowerCase().trim();
            const key = `${dateKey}_${titleKey}`;

            if (!seenKeys.has(key)) {
                uniqueItems.push(item);
                seenKeys.add(key);
            }
        }

        return uniqueItems.sort((a, b) => {
            const dateA = new Date(a.date + 'T' + (a.heure || '00:00')).getTime();
            const dateB = new Date(b.date + 'T' + (b.heure || '00:00')).getTime();
            return dateB - dateA;
        });
    }, [interactions, visits]);

    const agents = useMemo(() => {
        const set = new Set<string>();
        unifiedHistory.forEach(h => { if (h.agent) set.add(h.agent); });
        return Array.from(set).sort();
    }, [unifiedHistory]);

    const filtered = useMemo(() => {
        return unifiedHistory.filter(h => {
            const contact = contacts.find(c => c.id === h.contactId);
            
            // ─── Filtrage hiérarchique ───
            const supervisedNames = getSupervisedAgentNames(user, commercials);
            
            if (supervisedNames !== null) {
                if (user?.role === 'assistante') {
                    const isCreator = contact?.createdBy ? contact.createdBy === user.name : !contact?.assignedAgent;
                    if (!isCreator) return false;
                } else {
                    // RC, Manager, Commercial
                    const lowerSupervised = supervisedNames.map(n => n?.trim().toLowerCase());
                    if (!lowerSupervised.includes((h.agent || '').trim().toLowerCase())) return false;
                }
            }

            const contactName = contact?.name || '';
            const matchType = filter === 'all' || h.type === filter;
            const matchAgent = agentFilter === 'all' || h.agent === agentFilter;
            
            const matchSearch = search === '' ||
                contactName.toLowerCase().includes(search.toLowerCase()) ||
                h.title.toLowerCase().includes(search.toLowerCase()) ||
                (h.agent && h.agent.toLowerCase().includes(search.toLowerCase()));
            
            return matchType && matchAgent && matchSearch;
        });
    }, [unifiedHistory, filter, search, contacts, user]);

    return (
        <div className="historique-page">
            <div className="page-header">
                <div>
                    <h1>Historique des Interactions</h1>
                    <p className="subtitle">Journal complet de tous les échanges et activités avec vos contacts</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="historique-toolbar card-premium">
                <div className="search-box">
                    <User size={16} className="text-muted" />
                    <input type="text" placeholder="Rechercher un contact, un titre..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="type-filters">
                    <Filter size={16} className="text-muted" />
                    <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">Tous les types</option>
                        {Object.entries(INTERACTION_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                </div>

                {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur' || user?.role === 'manager') && (
                    <div className="type-filters">
                        <User size={16} className="text-muted" />
                        <select className="filter-select" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
                            <option value="all">Tous les agents</option>
                            {agents.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats rapides */}
            <div className="hist-stats">
                {Object.entries(INTERACTION_CONFIG).map(([k, v]) => {
                    const count = unifiedHistory.filter(h => h.type === k).length;
                    if (count === 0) return null;
                    return (
                        <div key={k} className={`hist-stat-chip ${filter === k ? 'active' : ''}`} style={{ borderColor: v.color }} onClick={() => setFilter(k)}>
                            <span style={{ color: v.color }}>{count}</span>
                            <span>{v.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Timeline */}
            <div className="historique-timeline">
                {filtered.map((item, index) => {
                    const typeKey = (item.type as string) in INTERACTION_CONFIG ? item.type : 'note';
                    const type = INTERACTION_CONFIG[typeKey as InteractionType];
                    const contact = contacts.find(c => c.id === item.contactId);
                    const showDate = index === 0 || filtered[index - 1].date !== item.date;
                    const isExpanded = expandedId === item.id;
                    
                    // Format date for display
                    const dateObj = new Date(item.date);
                    const dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

                    return (
                        <div key={item.id}>
                            {showDate && <div className="timeline-date-header"><span>{dateStr}</span></div>}
                            <div className="timeline-entry">
                                <div className="te-icon" style={{ backgroundColor: type.bg, color: type.color }}>{type.icon}</div>
                                <div className="te-connector"></div>
                                <div className="te-card card-premium">
                                    <div className="te-card-header" onClick={() => setExpandedId(isExpanded ? null : item.id)} style={{ cursor: 'pointer' }}>
                                        <div className="d-flex align-center gap-sm wrap">
                                            <span className="te-type-badge" style={{ color: type.color, backgroundColor: type.bg }}>{type.label}</span>
                                            <h3 className="te-title">{item.title}</h3>
                                        </div>
                                        <div className="te-meta wrap">
                                            <span className="te-meta-item"><Clock size={13} /> {item.heure}</span>
                                            <span className="te-meta-item"><User size={13} /> {contact?.name || 'Contact inconnu'}</span>
                                            <span className="te-meta-item"><MapPin size={13} /> Agent : {item.agent}</span>
                                            {item.technician && <span className="te-meta-item"><HardHat size={13} /> Expert : {item.technician}</span>}
                                        </div>
                                        <ChevronDown size={16} className={`te-chevron ${isExpanded ? 'open' : ''}`} />
                                    </div>

                                    {/* Détails expansibles */}
                                    {isExpanded && (
                                        <div className="te-expanded">
                                            {item.lieu && <div className="te-lieu mb-10"><MapPin size={13} /> <strong>Lieu :</strong> {item.lieu}</div>}
                                            <p className="te-description">{item.description || "Aucun compte-rendu renseigné."}</p>
                                            
                                            {item.issue && (
                                                <div className="te-issue mt-10">
                                                    <span className="te-issue-label">Suites à donner :</span>
                                                    <span>{item.issue}</span>
                                                </div>
                                            )}

                                            <div className="te-actions mt-15">
                                                <button className="btn-outline btn-sm" onClick={() => navigate(`/prospects/${item.contactId}`)}>
                                                    <User size={13} /> Voir fiche contact
                                                </button>
                                                {!item.is_visit && user?.role !== 'resp_commercial' && (user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur' || user?.name === item.agent) && (
                                                    <button className="btn-outline btn-sm" onClick={() => handleEdit(item)}>
                                                        <Edit2 size={13} /> Modifier
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="empty-section text-center p-40">
                        <Clock size={48} className="text-muted mb-15" />
                        <h3>Aucune interaction trouvée</h3>
                        <p className="text-muted">Ajustez vos filtres ou effectuez une nouvelle recherche.</p>
                    </div>
                )}
            </div>

            {/* ---- Modale Modifier Interaction ---- */}
            <Modal isOpen={!!editingInteraction} onClose={() => setEditingInteraction(null)} title="Modifier l'interaction" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Titre</label>
                        <input className="form-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Compte-rendu / Description</label>
                        <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Heure</label>
                        <input className="form-input" type="time" value={editForm.heure} onChange={e => setEditForm({ ...editForm, heure: e.target.value })} />
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setEditingInteraction(null)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSaveEdit}>Enregistrer</button>
                </div>
            </Modal>
        </div>
    );
};

export default Historique;

// --- CSS Supplémentaire pour les Filtres (Style Premium) ---
const historiqueStyles = `
.historique-toolbar.card-premium {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 16px;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    flex-wrap: wrap;
}

.type-filters, .date-filters {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #f8fafc;
    padding: 0.5rem 0.8rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s;
}

.type-filters:hover, .date-filters:hover {
    border-color: var(--primary);
    background: white;
    box-shadow: 0 2px 8px rgba(43, 46, 131, 0.05);
}

.filter-select {
    border: none;
    background: transparent;
    font-size: 0.85rem;
    font-weight: 500;
    color: #334155;
    outline: none;
    cursor: pointer;
    min-width: 120px;
}

.date-filters input[type="date"] {
    border: none;
    background: transparent;
    font-size: 0.85rem;
    font-family: inherit;
    color: #334155;
    outline: none;
}

.search-box {
    flex: 1;
    min-width: 250px;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: #f8fafc;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
}

.search-box input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 0.9rem;
    outline: none;
}

.btn-text.p-0 {
    background: #fee2e2;
    color: #ef4444;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    font-weight: bold;
    cursor: pointer;
    margin-left: 5px;
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = historiqueStyles;
    document.head.appendChild(style);
}
