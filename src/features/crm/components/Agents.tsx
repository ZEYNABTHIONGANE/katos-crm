import { useState, useEffect, useMemo } from 'react';
import { Users, TrendingUp, Target, Award, Star, Mail, Phone, Search, Upload } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { fetchCommercials, bulkInsertProfiles, type ProfileRow } from '../api/contactApi';
import { useContactStore } from '@/stores/contactStore';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/app/providers/ToastProvider';

const getAgentColor = (name: string) => {
    const colors = [
        { bg: '#2B2E83', text: '#fff' }, 
        { bg: '#E96C2E', text: '#fff' }, 
        { bg: '#10B981', text: '#fff' }, 
        { bg: '#6366F1', text: '#fff' }, 
        { bg: '#F59E0B', text: '#fff' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const SERVICE_LABELS: Record<string, string> = {
    foncier: 'Foncier',
    construction: 'Construction',
    gestion: 'Gestion Immobilière',
};

const Agents = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { contacts, interactions, fetchData } = useContactStore();
    const [agents, setAgents] = useState<{ id: string, name: string, service: string, email?: string, phone?: string, role?: string, parent_id?: string, group_name?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'resp_commercial' | 'manager' | 'commercial' | 'superviseur'>('all');

    // Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<ProfileRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const loadAgents = async () => {
        setLoading(true);
        if (contacts.length === 0) {
            await fetchData();
        }
        
        const isDirector = ['admin', 'dir_commercial', 'superviseur'].includes(user?.role || '');
        const isRC = user?.role === 'resp_commercial';
        const isManager = user?.role === 'manager';
        
        let roles: string[] = ['commercial'];
        if (isDirector || isRC) {
            roles = ['commercial', 'manager', 'resp_commercial', 'superviseur'];
        } else if (isManager) {
            roles = ['commercial', 'manager'];
        }
        
        // Fetch all (or by service if we still want that, but hierarchy is the priority here)
        const data = await fetchCommercials(undefined, roles) as any[];
        
        let filteredData = data;
        if (isRC) {
            // RC voit ses managers et les agents de ses managers
            const supervisedManagers = data.filter(comm => comm.parent_id === user.id && comm.role === 'manager');
            const supervisedManagerIds = supervisedManagers.map(m => m.id);
            filteredData = data.filter(comm => 
                comm.parent_id === user.id || 
                (comm.parent_id && supervisedManagerIds.includes(comm.parent_id))
            );
        } else if (isManager) {
            // Manager voit ses commerciaux
            filteredData = data.filter(comm => comm.parent_id === user.id || comm.id === user.id);
        }
        
        setAgents(filteredData);
        setLoading(false);
    };

    const handleAgentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            if (!text) return;
            const rows = text.split(/\r?\n/).filter(r => r.trim());
            if (rows.length < 2) { showToast('Fichier vide ou invalide', 'error'); return; }

            const header = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
            const data = rows.slice(1).map(row => {
                const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const obj: any = {};
                header.forEach((h, i) => { obj[h] = values[i] || ''; });
                return obj;
            });

            const mapped: ProfileRow[] = data.map(item => {
                let svc = item.service || '';
                if (svc.toLowerCase().includes('foncier')) svc = 'foncier';
                else if (svc.toLowerCase().includes('const')) svc = 'construction';
                else if (svc.toLowerCase().includes('gest')) svc = 'gestion';

                let role: ProfileRow['role'] = 'commercial';
                const rawRole = (item.role || item.poste || '').toLowerCase();
                if (rawRole.includes('resp')) role = 'resp_commercial';
                else if (rawRole.includes('manager')) role = 'manager';
                else if (rawRole.includes('superviseur')) role = 'superviseur';
                else if (rawRole.includes('dir')) role = 'dir_commercial';
                else if (rawRole.includes('sup')) role = 'superviseur';
                else if (rawRole.includes('admin')) role = 'admin';
                else if (rawRole.includes('assist')) role = 'assistante';

                return {
                    name: item.nom || item.name || '',
                    email: item.email || item.courriel || '',
                    phone: item.telephone || item.phone || item.tel || '',
                    role,
                    service: svc || undefined,
                };
            }).filter(p => p.name);

            if (mapped.length === 0) { showToast('Aucun agent trouvé dans le fichier', 'info'); return; }
            setImportData(mapped);
        };
        reader.readAsText(file);
    };

    const processAgentImport = async () => {
        if (importData.length === 0) return;
        setIsImporting(true);
        try {
            const count = await bulkInsertProfiles(importData);
            if (count > 0) {
                showToast(`${count} agents importés avec succès !`);
                setShowImportModal(false);
                setImportData([]);
                await loadAgents();
            } else {
                showToast("Erreur lors de l'importation", 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Erreur inattendue lors de l\'importation', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    useEffect(() => {
        loadAgents();
    }, [user]);

    // Calcul des statistiques pour chaque agent
    const agentsWithStats = useMemo(() => {
        const salesStatuses = ['Contrat', 'Paiement', 'Livraison Client', 'Fidélisation'];
        
        const filteredAgents = agents.filter(a => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = (
                a.name.toLowerCase().includes(search) ||
                (a.email?.toLowerCase().includes(search)) ||
                (a.service?.toLowerCase().includes(search))
            );
            
            const matchesRole = filterRole === 'all' || a.role === filterRole;
            
            return matchesSearch && matchesRole;
        });

        const withStats = filteredAgents.map(agent => {
            const isManager = agent.role === 'manager';
            const isResp = agent.role === 'resp_commercial';
            const isSupervisorRole = ['manager', 'resp_commercial', 'superviseur'].includes(agent.role || '');
            
            // Pour un superviseur, on compte son équipe. Pour un commercial, on compte ses attributions.
            const agentContacts = contacts.filter(c => {
                if (isResp) {
                    // RC voit ses managers et leurs agents
                    const supervisedManagers = agents.filter(comm => comm.parent_id === agent.id);
                    const supervisedManagerIds = supervisedManagers.map(m => m.id);
                    const supervisedAgents = agents.filter(comm => 
                        comm.parent_id === agent.id || 
                        (comm.parent_id && supervisedManagerIds.includes(comm.parent_id))
                    );
                    const supervisedNames = [agent.name, ...supervisedAgents.map(a => a.name)];
                    return supervisedNames.includes(c.assignedAgent || '');
                }
                if (isManager) {
                    // Manager voit ses agents
                    const groupAgents = agents.filter(comm => comm.parent_id === agent.id);
                    const groupAgentNames = [agent.name, ...groupAgents.map(a => a.name)];
                    return groupAgentNames.includes(c.assignedAgent || '');
                }
                return c.assignedAgent === agent.name;
            });

            const agentInteractions = interactions.filter(i => {
                if (isResp) {
                    const supervisedManagers = agents.filter(comm => comm.parent_id === agent.id);
                    const supervisedManagerIds = supervisedManagers.map(m => m.id);
                    const supervisedAgents = agents.filter(comm => 
                        comm.parent_id === agent.id || 
                        (comm.parent_id && supervisedManagerIds.includes(comm.parent_id))
                    );
                    const supervisedNames = [agent.name, ...supervisedAgents.map(a => a.name)];
                    return supervisedNames.includes(i.agent || '');
                }
                if (isManager) {
                    const groupAgents = agents.filter(comm => comm.parent_id === agent.id);
                    const groupAgentNames = [agent.name, ...groupAgents.map(a => a.name)];
                    return groupAgentNames.includes(i.agent || '');
                }
                return i.agent === agent.name;
            });

            const agentSales = agentContacts.filter(c => salesStatuses.includes(c.status));
            
            const prospectsCount = agentContacts.length;
            const salesCount = agentSales.length;
            const conversionRate = prospectsCount > 0 ? (salesCount / prospectsCount) * 100 : 0;
            
            // Ajustement performance : On pondère différemment pour un superviseur (gestion d'équipe)
            const performance = Math.min(100, isSupervisorRole 
                ? (salesCount * 5) + (agentInteractions.length * 0.2) // Stats globales de l'équipe
                : (salesCount * 10) + (agentInteractions.length * 0.5) // Stats individuelles
            );

            return {
                ...agent,
                stats: {
                    prospects: prospectsCount,
                    ventes: salesCount,
                    interactions: agentInteractions.length,
                    conversion: conversionRate.toFixed(1),
                    performance: performance.toFixed(0)
                }
            };
        });

        // Tri : par performance
        return withStats.sort((a, b) => Number(b.stats.performance) - Number(a.stats.performance));
    }, [agents, contacts, interactions, searchTerm, filterRole]);

    // Stats globales
    const globalStats = useMemo(() => {
        if (agentsWithStats.length === 0) return { avgPerf: 0, totalSales: 0, topAgent: '—' };
        
        const totalSales = agentsWithStats.reduce((sum, a) => sum + a.stats.ventes, 0);
        const avgPerf = agentsWithStats.reduce((sum, a) => sum + Number(a.stats.performance), 0) / agentsWithStats.length;
        const topAgent = agentsWithStats[0].name;

        return {
            avgPerf: avgPerf.toFixed(0),
            totalSales,
            topAgent
        };
    }, [agentsWithStats]);

    return (
        <div className="agents-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Gestion des Agents</h1>
                    <p className="subtitle">Suivi des performances et activités de l'équipe commerciale</p>
                </div>
                
                <div className="header-actions">
                    {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') && (
                        <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                            <Upload size={18} /> <span>Importer des agents</span>
                        </button>
                    )}
                    <div className="search-box">
                        <Search size={18} className="text-muted" />
                        <input 
                            type="text" 
                            placeholder="Rechercher un agent..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filtres par Rôle (Directeur uniquement) */}
            {(user?.role === 'dir_commercial' || user?.role === 'admin' || user?.role === 'superviseur') && (
                <div className="filters-bar mt-15 mb-15">
                    <div className="tabs-segmented mb-10">
                        {[
                            { k: 'all', l: 'Tous les collaborateurs' },
                            { k: 'resp_commercial', l: 'Responsables Com.' },
                            { k: 'manager', l: 'Managers' },
                            { k: 'superviseur', l: 'Superviseurs' },
                            { k: 'commercial', l: 'Commerciaux' },
                        ].map(f => (
                            <button
                                key={f.k}
                                className={`tab-segment ${filterRole === f.k ? 'active' : ''}`}
                                onClick={() => setFilterRole(f.k as any)}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Globales */}
            <div className="agents-overview-grid">
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(43,46,131,0.1)', color: '#2B2E83' }}>
                        <Users size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Total Agents</span>
                        <div className="d-flex items-end gap-2">
                            <span className="ov-value">{agents.length}</span>
                        </div>
                    </div>
                </div>
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(233,108,46,0.1)', color: '#E96C2E' }}>
                        <Target size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Performance Moyenne</span>
                        <span className="ov-value">{globalStats.avgPerf}%</span>
                    </div>
                </div>
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Total Ventes</span>
                        <span className="ov-value">{globalStats.totalSales}</span>
                    </div>
                </div>
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                        <Award size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Top Agent</span>
                        <span className="ov-value">{globalStats.topAgent}</span>
                    </div>
                </div>
            </div>

            {/* Liste des Agents */}
            <div className="agents-grid">
                {loading ? (
                    <div className="empty-state">Chargement...</div>
                ) : agentsWithStats.length > 0 ? agentsWithStats.map(agent => {
                    const theme = getAgentColor(agent.name);
                    const avatar = agent.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                    
                    return (
                        <div key={agent.id} className="agent-card card-premium">
                            <div className="agent-card-header">
                                <div className="agent-main-info">
                                    <div className="agent-profile-img" style={{ background: theme.bg, color: theme.text }}>
                                        {avatar}
                                    </div>
                                    <div>
                                        <h3>{agent.name}</h3>
                                        <p className="agent-role-tag">
                                            {agent.role === 'resp_commercial' ? 'Responsable Commercial' : agent.role === 'superviseur' ? 'Superviseur' : agent.role === 'manager' ? 'Manager' : 'Commercial'} • {SERVICE_LABELS[agent.service as keyof typeof SERVICE_LABELS] || agent.service}
                                            {agent.group_name && ` • ${agent.group_name}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="perf-badge">
                                    <Star size={14} fill="currentColor" />
                                    {agent.stats.performance}%
                                </div>
                            </div>

                            <div className="agent-contact-info">
                                <span><Mail size={14} /> {agent.email || '—'}</span>
                                <span><Phone size={14} /> {agent.phone || '—'}</span>
                            </div>

                            <div className="agent-stats-strip">
                                <div className="as-item">
                                    <span className="as-val">{agent.stats.prospects}</span>
                                    <span className="as-lbl">Prospects</span>
                                </div>
                                <div className="as-item">
                                    <span className="as-val">{agent.stats.ventes}</span>
                                    <span className="as-lbl">Ventes</span>
                                </div>
                                <div className="as-item">
                                    <span className="as-val">{agent.stats.conversion}%</span>
                                    <span className="as-lbl">Taux de V.</span>
                                </div>
                            </div>

                            <div className="perf-bar-container mt-15">
                                <div className="perf-bar-label">
                                    <span>Score de performance</span>
                                    <span>{agent.stats.performance}%</span>
                                </div>
                                <div className="perf-bar-bg">
                                    <div
                                        className="perf-bar-fill"
                                        style={{ width: `${agent.stats.performance}%`, background: theme.bg }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="empty-state">
                        <p>Aucun agent trouvé.</p>
                        <p className="text-sm mt-10">Vérifiez vos filtres ou la présence d'agents dans la base de données.</p>
                    </div>
                )}
            </div>

            {/* ---- Modale Import Agents CSV ---- */}
            <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportData([]); }} title="Importer des agents (CSV)" size="lg">
                {!importData.length ? (
                    <div style={{ border: '2px dashed var(--border-color)', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
                        <Upload size={48} style={{ color: 'var(--primary)', marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ marginBottom: '8px' }}>Sélectionnez votre fichier CSV</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                            Colonnes recommandées : <strong>Nom, Email, Telephone, Role, Service</strong><br />
                            <span style={{ fontSize: '0.78rem' }}>Rôles acceptés : commercial, manager, superviseur, dir_commercial, admin, assistante</span>
                        </p>
                        <input type="file" accept=".csv" id="agent-csv-upload" style={{ display: 'none' }} onChange={handleAgentFileChange} />
                        <label htmlFor="agent-csv-upload" className="btn-primary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                            Choisir un fichier
                        </label>
                    </div>
                ) : (
                    <div>
                        <p style={{ marginBottom: '16px' }}><strong>{importData.length}</strong> agents détectés. Aperçu :</p>
                        <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '16px' }}>
                            <table className="contacts-table" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th>Nom</th>
                                        <th>Email / Téléphone</th>
                                        <th>Rôle</th>
                                        <th>Service</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importData.slice(0, 5).map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.name}</td>
                                            <td>
                                                <div>{row.email}</div>
                                                <div>{row.phone}</div>
                                            </td>
                                            <td><span className="badge badge-primary">{row.role}</span></td>
                                            <td>{row.service ? SERVICE_LABELS[row.service as keyof typeof SERVICE_LABELS] || row.service : '—'}</td>
                                        </tr>
                                    ))}
                                    {importData.length > 5 && (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>... et {importData.length - 5} autres</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="alert" style={{ background: 'rgba(59,130,246,0.05)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid rgba(59,130,246,0.1)' }}>
                            💡 Ces agents seront ajoutés comme <strong>profils CRM</strong>. Des comptes de connexion devront être créés séparément depuis Supabase Auth si nécessaire.
                        </div>
                        <div className="form-actions">
                            <button className="btn-secondary" onClick={() => setImportData([])} disabled={isImporting}>Changer de fichier</button>
                            <button className="btn-primary" onClick={processAgentImport} disabled={isImporting} style={{ minWidth: '150px' }}>
                                {isImporting ? 'Importation...' : `Confirmer (${importData.length} agents)`}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Agents;
