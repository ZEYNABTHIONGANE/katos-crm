import { useState, useMemo } from 'react';
import type { ReactElement } from 'react';
import { Phone, Mail, Calendar, HardHat, FileText, Filter, Clock, User, MapPin, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContactStore, type InteractionType } from '@/stores/contactStore';

const INTERACTION_CONFIG: Record<InteractionType, { icon: ReactElement; label: string; color: string; bg: string }> = {
    call: { icon: <Phone size={16} />, label: 'Appel', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' },
    email: { icon: <Mail size={16} />, label: 'Email', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
    rdv: { icon: <Calendar size={16} />, label: 'Rendez-vous', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
    visite_terrain: { icon: <MapPin size={16} />, label: 'Visite Terrain', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
    visite_chantier: { icon: <HardHat size={16} />, label: 'Visite Chantier', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
    note: { icon: <FileText size={16} />, label: 'Note interne', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' },
};

const Historique = () => {
    const { contacts, interactions, visits } = useContactStore();
    const navigate = useNavigate();

    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Combine interactions and visits from store
    const unifiedHistory = useMemo(() => {
        const historyItems = [
            ...interactions.map(i => ({ 
                ...i, 
                category: 'interaction',
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
                category: 'visit',
                is_visit: true,
                statut: v.statut,
                issue: undefined,
                technician: v.technician
            }))
        ];
        return historyItems.sort((a, b) => {
            const dateA = new Date(a.date + 'T' + (a.heure || '00:00')).getTime();
            const dateB = new Date(b.date + 'T' + (b.heure || '00:00')).getTime();
            return dateB - dateA;
        });
    }, [interactions, visits]);

    const filtered = useMemo(() => {
        return unifiedHistory.filter(h => {
            const contact = contacts.find(c => c.id === h.contactId);
            const contactName = contact?.name || '';
            const matchType = filter === 'all' || h.type === filter;
            const matchSearch = search === '' ||
                contactName.toLowerCase().includes(search.toLowerCase()) ||
                h.title.toLowerCase().includes(search.toLowerCase());
            return matchType && matchSearch;
        });
    }, [unifiedHistory, filter, search, contacts]);

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
                    const type = INTERACTION_CONFIG[item.type] || INTERACTION_CONFIG['note'];
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
        </div>
    );
};

export default Historique;
