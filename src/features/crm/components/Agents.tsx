import { useState, useEffect, useMemo } from 'react';
import { Users, TrendingUp, Target, Award, Star, Mail, Phone, Search, Upload } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { fetchCommercials, bulkInsertProfiles, type ProfileRow } from '../api/contactApi';
import { manageAgentAccount, fetchPotentialManagers, deleteAgentAccount, type AgentData } from '../api/usersApi';
import { useContactStore } from '@/stores/contactStore';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/app/providers/ToastProvider';
import { Edit2, Plus, Shield, Briefcase, Lock, User, Trash2 } from 'lucide-react';
import { SALE_STATUSES } from '../utils/crmConstants';

const getAgentColor = (name: string) => {
    if (!name) return { bg: '#64748b', text: '#fff' };
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



const Agents = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { contacts, interactions, fetchData } = useContactStore();
    const [agents, setAgents] = useState<{ id: string, name: string, service: string, email?: string, phone?: string, role?: string, parent_id?: string, group_name?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'resp_commercial' | 'commercial' | 'conformite' | 'technicien_terrain' | 'technicien_chantier'>('all');

    // Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<ProfileRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    // User Management state
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [potentialManagers, setPotentialManagers] = useState<{ id: string, name: string, role: string }[]>([]);
    
    const [formData, setFormData] = useState<AgentData>({
        name: '',
        email: '',
        password: '',
        role: 'commercial',
        service: null,
        parent_id: '',
        group_name: '',
        phone: ''
    });

    const loadAgents = async () => {
        setLoading(true);
        if (contacts.length === 0) {
            await fetchData();
        }
        
        const isDirector = ['admin', 'dir_commercial', 'conformite'].includes(user?.role || '');
        const isRC = user?.role === 'resp_commercial';
        
        let roles: string[] = ['commercial'];
        if (isDirector) {
            roles = ['commercial', 'resp_commercial', 'conformite', 'assistante', 'dir_commercial', 'admin', 'technicien_terrain', 'technicien_chantier'];
        } else if (isRC) {
            roles = ['commercial', 'resp_commercial'];
        }
        
        const rolesToFetch = isDirector ? undefined : roles;
        const data = await fetchCommercials(undefined, rolesToFetch) as any[];
        
        let filteredData = data;
        if (isRC) {
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
                else if (rawRole.includes('conf') || rawRole.includes('liti')) role = 'conformite';
                else if (rawRole.includes('terrain')) role = 'technicien_terrain';
                else if (rawRole.includes('chantier')) role = 'technicien_chantier';
                else if (rawRole.includes('tech')) role = 'technicien_terrain' as any;

                return {
                    name: item.nom || item.name || '',
                    email: item.email || item.courriel || '',
                    phone: item.telephone || item.phone || item.tel || '',
                    role,
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

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setSelectedAgentId(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'commercial',
            service: null,
            parent_id: '',
            group_name: '',
            phone: ''
        });
        setShowAgentModal(true);
    };

    const handleOpenEditModal = (agent: any) => {
        setIsEditing(true);
        setSelectedAgentId(agent.id);
        setFormData({
            id: agent.id,
            name: agent.name,
            email: agent.email || '',
            password: '', // On ne pré-remplit pas le mot de passe
            role: agent.role as any,
            service: agent.service as any,
            parent_id: agent.parent_id || '',
            group_name: agent.group_name || '',
            phone: agent.phone || ''
        });
        setShowAgentModal(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation basique
        if (!isEditing && (!formData.password || formData.password.length < 6)) {
            showToast('Le mot de passe doit faire au moins 6 caractères', 'error');
            return;
        }
        if (isEditing && formData.password && formData.password.length < 6) {
            showToast('Le nouveau mot de passe doit faire au moins 6 caractères', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const action = isEditing ? 'update' : 'create';
            
            // Nettoyage des données pour éviter l'erreur UUID "" (doit être null)
            const submissionData = {
                ...formData,
                parent_id: formData.parent_id === '' ? null : formData.parent_id,
                service: (formData.service as any) === '' ? null : formData.service
            };

            try {
                // Optimisation : Si on modifie et que l'email/password ne change pas, on fait un update direct
                const originalAgent = agents.find(a => a.id === selectedAgentId);
                const emailChanged = isEditing && originalAgent && formData.email !== originalAgent.email;
                const hasPassword = !!formData.password;

                if (isEditing && !emailChanged && !hasPassword) {
                    const { fallbackUpdateProfile } = await import('../api/usersApi');
                    await fallbackUpdateProfile(submissionData);
                    showToast('Profil mis à jour avec succès');
                    setShowAgentModal(false);
                    await loadAgents();
                    return;
                }

                // Sinon, méthode normale via Edge Function
                await manageAgentAccount(action, submissionData);
                showToast(isEditing ? 'Agent mis à jour avec succès' : 'Agent créé avec succès');
            } catch (functionErr: any) {
                console.warn("Échec Edge Function, tentative fallback...", functionErr);
                
                // Si c'est une création, on tente le fallback client-side
                if (!isEditing) {
                    try {
                        await import('../api/usersApi').then(m => m.fallbackCreateAgent(submissionData));
                        showToast('Agent créé via méthode de secours');
                    } catch (fallbackErr: any) {
                        throw new Error(`Échec total : ${functionErr.message}. Fallback : ${fallbackErr.message}`);
                    }
                } else {
                    // Pour update, on tente la mise à jour directe du profil (RLS Admin permet ça)
                    try {
                        const { fallbackUpdateProfile } = await import('../api/usersApi');
                        await fallbackUpdateProfile(submissionData);
                        showToast('Profil mis à jour directement (mode secours)');
                        setShowAgentModal(false);
                        await loadAgents();
                    } catch (fallbackErr: any) {
                        throw new Error(`Échec total : ${functionErr.message}. Fallback : ${fallbackErr.message}`);
                    }
                }
            }

            setShowAgentModal(false);
            await loadAgents();
        } catch (err: any) {
            console.error("Erreur complète lors de la gestion de l'agent:", err);
            showToast(err.message || 'Erreur lors de l\'opération', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAgent = async () => {
        if (!selectedAgentId) return;
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce collaborateur ? Cette action est irréversible et supprimera également son compte d'authentification.")) return;
        
        setIsSubmitting(true);
        try {
            await deleteAgentAccount(selectedAgentId);
            showToast('Agent supprimé avec succès');
            setShowAgentModal(false);
            await loadAgents();
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Erreur lors de la suppression', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const updateManagers = async () => {
            if (formData.role) {
                const managers = await fetchPotentialManagers(formData.role as any);
                setPotentialManagers(managers);
            }
        };
        updateManagers();
    }, [formData.role]);

    useEffect(() => {
        loadAgents();
    }, [user]);

    // Calcul des statistiques pour chaque agent
    const agentsWithStats = useMemo(() => {
        try {
            // Uses shared SALE_STATUSES from crmConstants for consistency with Dashboard
            const currentAgents = agents || [];
            
            const filteredAgents = currentAgents.filter(a => {
                const search = (searchTerm || '').toLowerCase();
                const matchesSearch = (
                    (a.name || '').toLowerCase().includes(search) ||
                    (a.email?.toLowerCase().includes(search))
                );
                
                const matchesRole = filterRole === 'all' || a.role === filterRole;
                
                return matchesSearch && matchesRole;
            });

            const withStats = filteredAgents.map(agent => {
                const isResp = agent.role === 'resp_commercial';
                const isSupervisorRole = agent.role === 'resp_commercial';
                
                const normAgentName = (agent.name || '').trim().toLowerCase();

                // Pour un superviseur, on compte son équipe. Pour un commercial, on compte ses attributions.
                const agentContacts = (contacts || []).filter(c => {
                    const assigned = (c.assignedAgent || '').trim().toLowerCase();
                    if (isResp) {
                        // RC voit les clients de son équipe (ceux rattachés à lui-même ou à ses agents)
                        const supervisedAgents = currentAgents.filter(comm => comm.parent_id === agent.id);
                        const supervisedNames = [agent.name, ...supervisedAgents.map(a => a.name)].map(n => (n || '').trim().toLowerCase());
                        return supervisedNames.includes(assigned);
                    }
                    return assigned === normAgentName;
                });

                const agentInteractions = (interactions || []).filter(i => {
                    const iAgent = (i.agent || '').trim().toLowerCase();
                    if (isResp) {
                        const supervisedAgents = currentAgents.filter(comm => comm.parent_id === agent.id);
                        const supervisedNames = [agent.name, ...supervisedAgents.map(a => a.name)].map(n => (n || '').trim().toLowerCase());
                        return supervisedNames.includes(iAgent);
                    }
                    return iAgent === normAgentName;
                });

                const agentSales = agentContacts.filter(c => SALE_STATUSES.includes(c.status));
                
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
        } catch (err) {
            console.error("Error calculating agentsWithStats:", err);
            return [];
        }
    }, [agents, contacts, interactions, searchTerm, filterRole]);

    // Stats globales
    const globalStats = useMemo(() => {
        try {
            if (!agentsWithStats || agentsWithStats.length === 0) return { avgPerf: 0, totalSales: 0, topAgent: '—' };
            
            const totalSales = agentsWithStats.reduce((sum, a) => sum + (a.stats?.ventes || 0), 0);
            const avgPerf = agentsWithStats.reduce((sum, a) => sum + Number(a.stats?.performance || 0), 0) / agentsWithStats.length;
            const topAgent = agentsWithStats[0].name;

            return {
                avgPerf: avgPerf.toFixed(0),
                totalSales,
                topAgent
            };
        } catch (err) {
            console.error("Error calculating globalStats:", err);
            return { avgPerf: 0, totalSales: 0, topAgent: '—' };
        }
    }, [agentsWithStats]);

    return (
        <div className="agents-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Gestion des Agents</h1>
                    <p className="subtitle">Suivi des performances et activités de l'équipe commerciale</p>
                </div>
                
                <div className="header-actions">
                    {(user?.role === 'admin' || user?.role === 'dir_commercial') && (
                        <>
                            <button className="btn-primary" onClick={handleOpenCreateModal}>
                                <Plus size={18} /> Nouveau Collaborateur
                            </button>
                            <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                                <Upload size={18} /> <span>Importer des agents</span>
                            </button>
                        </>
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
                            { k: 'conformite', l: 'Conformité' },
                            { k: 'technicien_terrain', l: 'Tech. Terrain' },
                            { k: 'technicien_chantier', l: 'Tech. Chantier' },
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
                                            {agent.role === 'resp_commercial' ? 'Responsable Commercial' : 
                                             agent.role === 'conformite' ? 'Agent Conformité' :
                                             agent.role === 'assistante' ? 'Assistante' : 
                                             agent.role === 'dir_commercial' ? 'Directeur Commercial' : 
                                             agent.role === 'technicien_terrain' ? 'Technicien Terrain' :
                                             agent.role === 'technicien_chantier' ? 'Technicien Chantier' :
                                             agent.role === 'admin' ? 'Administrateur' : 'Commercial'}
                                            {agent.group_name && ` • ${agent.group_name}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="perf-badge">
                                    <Star size={14} fill="currentColor" />
                                    {agent.stats.performance}%
                                </div>
                                {(user?.role === 'admin' || user?.role === 'dir_commercial') && (
                                    <button className="btn-icon-sm" onClick={() => handleOpenEditModal(agent)} title="Modifier l'agent">
                                        <Edit2 size={14} />
                                    </button>
                                )}
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

            {/* ---- Modale de Création/Edition d'Agent ---- */}
            <Modal 
                isOpen={showAgentModal} 
                onClose={() => setShowAgentModal(false)} 
                title={isEditing ? "Modifier le collaborateur" : "Nouveau collaborateur"}
                size="md"
            >
                <form onSubmit={handleFormSubmit} className="agent-form">
                    <div className="form-section">
                        <h4><User size={18} /> Informations personnelles</h4>
                        <div className="form-group">
                            <label>Nom complet</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="ex: Jean Dupont"
                            />
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Email professionnel</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    placeholder="jean.dupont@katos.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>Téléphone</label>
                                <input 
                                    type="tel" 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    placeholder="+221 ..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4><Shield size={18} /> Rôle et Sécurité</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Rôle</label>
                                <select 
                                    value={formData.role} 
                                    onChange={e => setFormData({...formData, role: e.target.value as any})}
                                >
                                    <option value="commercial">Commercial</option>
                                    <option value="manager">Manager</option>
                                    <option value="resp_commercial">Responsable Commercial</option>
                                    <option value="superviseur">Superviseur</option>
                                    <option value="conformite">Agent Conformité</option>
                                    <option value="dir_commercial">Directeur Commercial</option>
                                    <option value="assistante">Assistante</option>
                                    <option value="technicien_terrain">Technicien Terrain</option>
                                    <option value="technicien_chantier">Technicien Chantier</option>
                                    {user?.role === 'admin' && <option value="admin">Administrateur</option>}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{isEditing ? "Changer le mot de passe" : "Mot de passe"}</label>
                                <div className="input-with-icon">
                                    <Lock size={16} />
                                    <input 
                                        type="password" 
                                        required={!isEditing}
                                        value={formData.password} 
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        placeholder={isEditing ? "Laisser vide pour ne pas changer" : "Minimum 6 caractères"}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4><Briefcase size={18} /> Hiérarchie et Équipe</h4>
                        <div className="form-grid">
                        <div className="form-group">
                            <label>Supérieur hiérarchique (Facultatif)</label>
                            <select 
                                value={formData.parent_id || ''} 
                                onChange={e => setFormData({...formData, parent_id: e.target.value})}
                            >
                                <option value="">Aucun</option>
                                {potentialManagers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                ))}
                            </select>
                        </div>
                        </div>
                        <div className="form-group">
                            <label>Nom du groupe / équipe (Facultatif)</label>
                            <input 
                                type="text" 
                                value={formData.group_name} 
                                onChange={e => setFormData({...formData, group_name: e.target.value})}
                                placeholder="ex: Groupe Alpha"
                            />
                        </div>
                    </div>

                    <div className="alert-info-sm" style={{ marginBottom: '20px' }}>
                        <p>💡 L'utilisateur recevra un email de confirmation (si activé sur Supabase) et pourra se connecter immédiatement avec son mot de passe.</p>
                    </div>

                    <div className="form-actions">
                        <div className="d-flex gap-2">
                            {isEditing && (
                                <button 
                                    type="button" 
                                    className="btn-danger-outline" 
                                    onClick={handleDeleteAgent}
                                    disabled={isSubmitting}
                                    style={{ marginRight: 'auto' }}
                                >
                                    <Trash2 size={16} /> Supprimer le compte
                                </button>
                            )}
                            <button type="button" className="btn-secondary" onClick={() => setShowAgentModal(false)}>Annuler</button>
                            <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Enregistrement...' : (isEditing ? 'Enregistrer les modifications' : 'Créer le collaborateur')}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Agents;
