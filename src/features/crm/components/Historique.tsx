import { useState, useMemo, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Phone, Mail, Calendar, HardHat, FileText, Filter, Clock, User, MapPin, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContactStore, type InteractionType } from '@/stores/contactStore';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { fetchCommercials } from '../api/contactApi';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import Modal from '@/components/ui/Modal';

const INTERACTION_CONFIG: Record<InteractionType, { icon: ReactElement; label: string; color: string; bg: string }> = {
    call: { icon: <Phone size={16} />, label: 'Appel', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' },
    email: { icon: <Mail size={16} />, label: 'Email', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
    rdv: { icon: <Calendar size={16} />, label: 'Rendez-vous', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
    visite_terrain: { icon: <MapPin size={16} />, label: 'Visite Terrain', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
    visite_chantier: { icon: <HardHat size={16} />, label: 'Visite Chantier', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
    note: { icon: <FileText size={16} />, label: 'Note interne', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' },
    pipeline_step: { icon: <FileText size={16} />, label: 'Étape Pipeline', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
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

    const unifiedHistory = useMemo(() => {
        try {
            const historyItems = [
                ...(interactions || [])
                    .filter(i => i.type !== 'pipeline_step')
                    .map(i => ({ ...i, category: 'interaction' as const, is_visit: false })),
                ...(visits || []).map(v => ({ 
                    id: 'v' + v.id, contactId: v.contactId,
                    type: (v.type === 'chantier' ? 'visite_chantier' : v.type === 'terrain' ? 'visite_terrain' : 'rdv') as InteractionType,
                    title: v.title, description: v.notes, date: v.date, heure: v.heure, agent: v.agent, lieu: v.lieu,
                    category: 'visit' as const, is_visit: true, statut: v.statut, issue: undefined, technician: v.technician
                }))
            ];

            const uniqueItems: any[] = [];
            const seenKeys = new Set<string>();

            for (const item of historyItems) {
                if (item.type === 'note') { uniqueItems.push(item); continue; }
                const key = `${item.contactId}_${item.date}_${item.heure || '00:00'}_${((item.title || '').toLowerCase().trim())}`;
                if (!seenKeys.has(key)) { uniqueItems.push(item); seenKeys.add(key); }
            }

            return uniqueItems.sort((a, b) => {
                try {
                    return new Date(b.date + 'T' + (b.heure || '00:00')).getTime() - new Date(a.date + 'T' + (a.heure || '00:00')).getTime();
                } catch { return 0; }
            });
        } catch (err) {
            console.error("Error calculating unifiedHistory:", err);
            return [];
        }
    }, [interactions, visits]);

    const agents = useMemo(() => {
        const set = new Set<string>();
        unifiedHistory.forEach(h => { if (h.agent) set.add(h.agent); });
        return Array.from(set).sort();
    }, [unifiedHistory]);

    const filtered = useMemo(() => {
        try {
            return unifiedHistory.filter(h => {
                const contact = (contacts || []).find(c => c.id === h.contactId);
                const supervisedNames = getSupervisedAgentNames(user, commercials);
                
                if (supervisedNames !== null) {
                    if (user?.role === 'assistante') {
                        if (contact?.createdBy !== user.name && contact?.assignedAgent) return false;
                    } else {
                        const lowerSupervised = supervisedNames.map(n => (n || '').trim().toLowerCase());
                        if (!lowerSupervised.includes((h.agent || '').trim().toLowerCase())) return false;
                    }
                }

                const matchType = filter === 'all' || h.type === filter;
                const matchAgent = agentFilter === 'all' || h.agent === agentFilter;
                const matchSearch = search === '' || 
                    (contact?.name || '').toLowerCase().includes(search.toLowerCase()) ||
                    (h.title || '').toLowerCase().includes(search.toLowerCase()) ||
                    (h.agent && h.agent.toLowerCase().includes(search.toLowerCase()));
                
                return matchType && matchAgent && matchSearch;
            });
        } catch (err) {
            console.error("Error calculating filtered history:", err);
            return [];
        }
    }, [unifiedHistory, filter, search, contacts, user, commercials]);

    return (
        <div className="historique-page">
            <div className="page-header">
                <div>
                    <h1>Historique des Interactions</h1>
                    <p className="subtitle">Journal complet de tous les échanges et activités</p>
                </div>
            </div>

            <div className="historique-toolbar card-premium" style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
                <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
                    <User size={16} className="text-muted" />
                    <input type="text" placeholder="Rechercher contact, commercial..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-group d-flex align-center gap-2">
                    <Filter size={16} className="text-muted" />
                    <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">Tous les types</option>
                        {Object.entries(INTERACTION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
                {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'manager') && (
                    <div className="filter-group d-flex align-center gap-2">
                        <User size={16} className="text-muted" />
                        <select className="filter-select" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
                            <option value="all">Tous les commerciaux</option>
                            {agents.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="historique-timeline">
                {filtered.map((item, index) => {
                    const typeKey = (item.type as InteractionType) || 'note';
                    const type = INTERACTION_CONFIG[typeKey as InteractionType] || INTERACTION_CONFIG.note;
                    const contact = contacts.find(c => c.id === item.contactId);
                    const showDate = index === 0 || filtered[index - 1].date !== item.date;
                    const dateStr = new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

                    return (
                        <div key={item.id}>
                            {showDate && <div className="timeline-date-header"><span>{dateStr}</span></div>}
                            <div className="timeline-entry">
                                <div className="te-icon" style={{ backgroundColor: type.bg, color: type.color }}>{type.icon}</div>
                                <div className="te-connector"></div>
                                <div className="te-card card-premium">
                                    <div className="te-card-header" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{ cursor: 'pointer' }}>
                                        <div className="d-flex align-center gap-sm wrap">
                                            <span className="te-type-badge" style={{ color: type.color, backgroundColor: type.bg }}>{type.label}</span>
                                            <h3 className="te-title">{item.title}</h3>
                                        </div>
                                        <div className="te-meta">
                                            <span className="te-meta-item"><Clock size={13} /> {item.heure}</span>
                                            <span className="te-meta-item"><User size={13} /> {contact?.name || 'Inconnu'}</span>
                                            <span className="te-meta-item"><MapPin size={13} /> {item.agent}</span>
                                        </div>
                                        <ChevronDown size={16} className={`te-chevron ${expandedId === item.id ? 'open' : ''}`} />
                                    </div>
                                    {expandedId === item.id && (
                                        <div className="te-expanded">
                                            <p className="te-description">{item.description || "Aucun compte-rendu."}</p>
                                            <div className="te-actions mt-15">
                                                <button className="btn-outline btn-sm" onClick={() => navigate(`/prospects/${item.contactId}`)}>Fiche contact</button>
                                                {!item.is_visit && user?.name === item.agent && (
                                                    <button className="btn-outline btn-sm" onClick={() => handleEdit(item)}>Modifier</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={!!editingInteraction} onClose={() => setEditingInteraction(null)} title="Modifier l'interaction" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Titre</label>
                        <input className="form-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
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
