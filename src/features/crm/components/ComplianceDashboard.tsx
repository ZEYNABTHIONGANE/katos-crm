import { useState, useEffect, useMemo } from 'react';
import { 
    Search, Filter, ShieldAlert, User, 
    ChevronRight, ShieldCheck, Eye, AlertTriangle
} from 'lucide-react';
import { fetchComplianceIssues, type ComplianceIssue } from '../api/complianceApi';
import { useAuth } from '@/app/providers/AuthProvider';
import Modal from '@/components/ui/Modal';
import ComplianceIssueDetail from '@/features/crm/components/ComplianceIssueDetail';

const ComplianceDashboard = ({ showStats = true }: { showStats?: boolean }) => {
    useAuth();
    const [issues, setIssues] = useState<ComplianceIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedIssue, setSelectedIssue] = useState<ComplianceIssue | null>(null);

    const stats = useMemo(() => {
        const totalActive = issues.filter(i => i.status !== 'resolu').length;
        const highPriority = issues.filter(i => i.priority === 'haute' && i.status !== 'resolu').length;
        const resolvedThisMonth = issues.filter(i => {
            if (i.status !== 'resolu') return false;
            const resDate = new Date(i.createdAt);
            const now = new Date();
            return resDate.getMonth() === now.getMonth() && resDate.getFullYear() === now.getFullYear();
        }).length;

        return [
            { label: 'Litiges Actifs', value: totalActive, color: 'text-primary' },
            { label: 'Priorité Haute', value: highPriority, color: 'text-danger' },
            { label: 'Résolus (ce mois)', value: resolvedThisMonth, color: 'text-success' }
        ];
    }, [issues]);

    const loadIssues = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: apiError } = await fetchComplianceIssues();
            if (apiError) {
                setError(apiError);
                setIssues([]);
            } else {
                const mapped = (data || []).map((d: any) => ({
                    id: d.id,
                    contactId: d.contact_id,
                    signaledBy: d.signaled_by,
                    description: d.description,
                    status: d.status,
                    priority: d.priority,
                    createdAt: d.created_at,
                    contactName: d.contacts?.name || `Client #${d.contact_id}`,
                    agentName: d.profiles?.name || 'Agent'
                }));
                setIssues(mapped);
            }
        } catch (err: any) {
            setError(err.message || 'Une erreur inconnue est survenue');
            console.error('Error loading compliance issues:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIssues();
    }, []);

    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            const name = issue.contactName || '';
            const desc = issue.description || '';
            const matchesSearch = 
                name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                desc.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [issues, searchTerm, statusFilter]);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'nouveau': return 'Nouveau';
            case 'en_cours': return 'En cours';
            case 'resolu': return 'Résolu';
            case 'besoin_admin': return 'Action Admin';
            default: return status;
        }
    };

    return (
        <div className="compliance-dashboard">
            {showStats && (
                <div className="dash-hero" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                    <div className="hero-orb hero-orb-1"></div>
                    <div className="hero-orb hero-orb-2"></div>
                    <div className="dash-header d-flex-between" style={{ position: 'relative', zIndex: 1, marginBottom: '2rem' }}>
                        <div>
                            <h1 className="d-flex align-center gap-sm" style={{ color: 'white' }}>
                                <ShieldAlert size={32} />
                                Litige & Conformité
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>Gestion des dossiers clients sous surveillance et résolution des litiges</p>
                        </div>
                    </div>

                    <div className="stats-grid hero-stats" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="stat-card-v2 grad-blue">
                            <div className="stat-icon-wrap"><ShieldAlert size={22} /></div>
                            <div className="stat-body">
                                <span className="stat-label-v2">Litiges Actifs</span>
                                <span className="stat-value-v2">{stats[0].value}</span>
                                <span className="stat-change pos">Dossiers en cours</span>
                            </div>
                        </div>
                        <div className="stat-card-v2 grad-orange">
                            <div className="stat-icon-wrap"><AlertTriangle size={22} /></div>
                            <div className="stat-body">
                                <span className="stat-label-v2">Priorité Haute</span>
                                <span className="stat-value-v2">{stats[1].value}</span>
                                <span className="stat-change neg">Action urgente requise</span>
                            </div>
                        </div>
                        <div className="stat-card-v2 grad-green">
                            <div className="stat-icon-wrap"><ShieldCheck size={22} /></div>
                            <div className="stat-body">
                                <span className="stat-label-v2">Résolus (ce mois)</span>
                                <span className="stat-value-v2">{stats[2].value}</span>
                                <span className="stat-change pos">Objectif Conformité</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!showStats && (
                <div className="page-header mb-8">
                    <h1 className="d-flex align-center gap-sm">
                        <ShieldAlert className="text-primary" size={28} />
                        Litiges & Conformité
                    </h1>
                    <p className="text-muted">Liste des dossiers signalés pour vérification</p>
                </div>
            )}

            <div className="filters-bar p-2 rounded-2xl flex gap-3 mb-8">
                <div className="search-input flex-1 flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <Search size={18} className="text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Rechercher un client ou un problème..."
                        className="bg-transparent border-none outline-none p-3 w-full text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
                    <Filter size={18} className="text-gray-400 mr-2" />
                    <select 
                        className="bg-transparent border-none outline-none text-sm py-3 font-medium cursor-pointer"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="nouveau">Nouveaux</option>
                        <option value="en_cours">En cours</option>
                        <option value="besoin_admin">Besoin Admin</option>
                        <option value="resolu">Résolus</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center text-muted">Chargement des litiges...</div>
            ) : filteredIssues.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredIssues.map(issue => (
                        <div 
                            key={issue.id} 
                            className={`issue-card priority-${issue.priority}`}
                            onClick={() => setSelectedIssue(issue)}
                        >
                            <div className="issue-priority-strip" />
                            <div className="d-flex-between mb-2">
                                <span className={`status-pill status-${issue.status}`}>
                                    {getStatusLabel(issue.status)}
                                </span>
                                <span className="text-[10px] text-muted font-bold uppercase">
                                    {new Date(issue.createdAt).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                            <h3 className="issue-title">{issue.contactName || `Client #${issue.contactId || 'inconnu'}`}</h3>
                            <p className="issue-description">{issue.description}</p>
                            
                            <div className="issue-meta">
                                <span><User size={14} /> Signalé par {issue.agentName}</span>
                            </div>

                            <div className="d-flex-between mt-4 pt-4 border-t border-gray-50">
                                <button className="btn-ghost btn-xs text-primary font-bold d-flex align-center gap-xs">
                                    <Eye size={14} /> Voir le dossier
                                </button>
                                <ChevronRight size={18} className="text-gray-300" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card-premium p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                        <ShieldCheck size={64} className="text-success" />
                        <div>
                            <h3 className="text-xl font-bold">Aucun litige actif</h3>
                            <p>Tous les dossiers sont conformes ou les litiges ont été résolus.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Détails du Litige */}
            {selectedIssue && (
                <Modal 
                    isOpen={!!selectedIssue} 
                    onClose={() => setSelectedIssue(null)} 
                    title={`Détails du Litige : ${selectedIssue.contactName}`}
                    size="lg"
                >
                    <ComplianceIssueDetail 
                        issue={selectedIssue} 
                        onClose={() => {
                            setSelectedIssue(null);
                            loadIssues();
                        }} 
                    />
                </Modal>
            )}

            {error && (
                <div className="mt-4 p-4 bg-danger/10 text-danger rounded-xl border border-danger/20 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Erreur : {error}
                </div>
            )}
        </div>
    );
};

export default ComplianceDashboard;
