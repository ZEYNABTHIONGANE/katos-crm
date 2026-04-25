import { useState, useEffect, useMemo } from 'react';
import { Download, Printer, Users, Target, Calendar, Filter } from 'lucide-react';
import { fetchContacts, fetchVisits, fetchCommercials } from '../api/contactApi';
import type { CrmContact, Visit } from '@/stores/contactStore';
import { SALE_STATUSES, PIPELINE_STATUSES } from '../utils/crmConstants';
import RapportSkeleton from './RapportSkeleton';

interface AgentPerf {
    agent: string;
    prospects: number;
    sales: number;
    conversion: string;
}

interface OriginData {
    label: string;
    count: number;
    val: number;
    color: string;
}

const COLORS = ['#2B2E83', '#E96C2E', '#10B981', '#6366F1', '#F59E0B', '#8B5CF6'];

const Rapports = () => {
    const [period, setPeriod] = useState('ce-mois');
    const [loading, setLoading] = useState(true);
    
    // Raw data state (fetched once)
    const [rawData, setRawData] = useState<{
        contacts: CrmContact[];
        visits: Visit[];
        agents: any[];
    }>({ contacts: [], visits: [], agents: [] });

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [contacts, visits, agents] = await Promise.all([
                    fetchContacts(),
                    fetchVisits(),
                    fetchCommercials()
                ]);
                setRawData({ contacts, visits, agents });
            } catch (error) {
                console.error('Error loading report data:', error);
            } finally {
                // Petit délai pour l'effet visuel du skeleton
                setTimeout(() => setLoading(false), 800);
            }
        };
        loadInitialData();
    }, []);

    // Instant filtering logic
    const stats = useMemo(() => {
        if (loading || !rawData.contacts.length) return null;

        try {
            const now = new Date();
            let startDate: Date | null = null;

            if (period === 'aujourdhui') {
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'cette-semaine') {
                startDate = new Date(now);
                const day = now.getDay() || 7; 
                startDate.setDate(now.getDate() - day + 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'ce-mois') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (period === 'trimestre') {
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
            } else if (period === 'annee') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }

            const filteredContacts = startDate 
                ? rawData.contacts.filter(c => c.createdAt && new Date(c.createdAt) >= startDate!)
                : rawData.contacts;
                
            const filteredVisits = startDate
                ? rawData.visits.filter(v => v.date && new Date(v.date) >= startDate!)
                : rawData.visits;

            // KPI calculations
            const newProspects = filteredContacts.length;
            const closedSales = filteredContacts.filter(c => SALE_STATUSES.includes(c.status)).length;
            const visitsCompleted = filteredVisits.filter(v => v.statut === 'completed').length;
            const conversionRate = newProspects > 0 ? Math.round((closedSales / newProspects) * 100) : 0;

            // Agent Performance
            const agentPerf: AgentPerf[] = rawData.agents
                .filter(agent => agent.role === 'commercial')
                .map(agent => {
                    const agentNameLower = (agent.name || '').trim().toLowerCase();
                    const agentContacts = filteredContacts.filter(c =>
                        (c.assignedAgent || '').trim().toLowerCase() === agentNameLower
                    );
                    
                    const activeProspectsCount = agentContacts.filter(c => PIPELINE_STATUSES.includes(c.status)).length;
                    const agentSales = agentContacts.filter(c => SALE_STATUSES.includes(c.status)).length;
                    const conversion = agentContacts.length > 0
                        ? Math.round((agentSales / agentContacts.length) * 100)
                        : 0;

                    return {
                        agent: agent.name || 'Utilisateur inconnu',
                        prospects: activeProspectsCount,
                        sales: agentSales,
                        conversion: `${conversion}%`
                    };
                })
                .filter(a => a.prospects > 0 || a.sales > 0)
                .sort((a, b) => b.sales - a.sales);

            // Origin Analysis
            const originsMap = new Map<string, number>();
            filteredContacts.forEach(c => {
                let source = c.source || 'Autre / Inconnu';
                if (['Facebook', 'Instagram', 'TikTok'].includes(source)) {
                    source = 'RÉSEAUX SOCIAUX';
                }
                originsMap.set(source, (originsMap.get(source) || 0) + 1);
            });

            const totalWithSource = Array.from(originsMap.values()).reduce((a, b) => a + b, 0);
            const originAnalysis: OriginData[] = Array.from(originsMap.entries()).map(([label, count], i) => ({
                label,
                count,
                val: totalWithSource > 0 ? Math.round((count / totalWithSource) * 100) : 0,
                color: COLORS[i % COLORS.length]
            })).sort((a, b) => b.val - a.val);

            return {
                newProspects,
                closedSales,
                visitsCompleted,
                conversionRate,
                agentPerformance: agentPerf,
                originAnalysis,
                filteredContacts
            };
        } catch (err) {
            console.error('[Rapports] Calculation error:', err);
            return null;
        }
    }, [period, rawData, loading]);

    const downloadCSV = () => {
        if (!stats) return;

        const headers = ['Nom', 'Email', 'Téléphone', 'Statut', 'Source', 'Agent Assigné', 'Budget', 'Date de création'];
        const csvRows = [
            headers.join(';'),
            ...stats.filteredContacts.map(c => [
                `"${(c.name || '').replace(/"/g, '""')}"`,
                `"${(c.email || '').replace(/"/g, '""')}"`,
                `"${(c.phone || '').replace(/"/g, '""')}"`,
                `"${(c.status || '').replace(/"/g, '""')}"`,
                `"${(c.source || '').replace(/"/g, '""')}"`,
                `"${(c.assignedAgent || '').replace(/"/g, '""')}"`,
                `"${(c.budget || '').replace(/"/g, '""')}"`,
                `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}"`
            ].join(';'))
        ];

        const csvContent = "\uFEFF" + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `katos_rapport_${period}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <RapportSkeleton />;
    if (!stats) return <div className="p-20 text-center text-muted">Aucune donnée disponible.</div>;

    return (
        <div className="rapports-page animate-in">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Analyses & Performance</h1>
                    <p className="subtitle">Visualisez la croissance de votre activité en temps réel</p>
                </div>
                <div className="header-actions">
                    <button className="btn-outline" onClick={() => window.print()}>
                        <Printer size={18} /> Imprimer
                    </button>
                    <button className="btn-primary" onClick={downloadCSV}>
                        <Download size={18} /> Exporter CSV
                    </button>
                </div>
            </div>

            {/* Filtres instantanés */}
            <div className="rapports-toolbar card-premium">
                <div className="filter-group">
                    <Filter size={16} className="text-primary" />
                    <span className="text-xs font-bold text-muted uppercase tracking-wider mr-2">Période :</span>
                    <select className="form-select-sm" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="ce-mois">Ce mois-ci</option>
                        <option value="trimestre">Trimestre en cours</option>
                        <option value="annee">Année en cours</option>
                        <option value="aujourdhui">Aujourd'hui</option>
                        <option value="cette-semaine">Cette semaine</option>
                        <option value="tout">Toute la base</option>
                    </select>
                </div>
            </div>

            {/* KPIs Cards */}
            <div className="rapports-grid">
                <div className="rpt-card card-premium">
                    <div className="rpt-icon-box" style={{ background: 'rgba(43, 46, 131, 0.1)', color: '#2B2E83' }}>
                        <Users size={20} />
                    </div>
                    <div className="rpt-val">{stats.newProspects}</div>
                    <div className="rpt-lbl">Nouveaux Prospects</div>
                </div>
                <div className="rpt-card card-premium">
                    <div className="rpt-icon-box" style={{ background: 'rgba(233, 108, 46, 0.1)', color: '#E96C2E' }}>
                        <Target size={20} />
                    </div>
                    <div className="rpt-val">{stats.closedSales}</div>
                    <div className="rpt-lbl">Ventes Clôturées</div>
                </div>
                <div className="rpt-card card-premium">
                    <div className="rpt-icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
                        <Calendar size={20} />
                    </div>
                    <div className="rpt-val">{stats.visitsCompleted}</div>
                    <div className="rpt-lbl">Visites Réalisées</div>
                </div>
                <div className="rpt-card card-premium highlight">
                    <div className="rpt-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                        <Target size={20} />
                    </div>
                    <div className="rpt-val">{stats.conversionRate}%</div>
                    <div className="rpt-lbl">Taux de Conversion</div>
                </div>
            </div>

            {/* Layout Tableaux */}
            <div className="rapports-layout">
                <div className="rpt-section card-premium">
                    <div className="section-header">
                        <h3>Performance par Agent</h3>
                        <span className="badge-light">{stats.agentPerformance.length} actifs</span>
                    </div>
                    <div className="table-responsive">
                        <table className="rpt-table">
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Prospects</th>
                                    <th>Ventes</th>
                                    <th>Conversion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.agentPerformance.map((agent, i) => {
                                    const convNum = parseInt(agent.conversion);
                                    const barColor = convNum >= 40 ? '#10b981' : convNum >= 20 ? '#f59e0b' : '#ef4444';
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <div className="d-flex align-center gap-3">
                                                    <div className="agent-avatar-sm">{agent.agent.charAt(0)}</div>
                                                    <span className="font-bold">{agent.agent}</span>
                                                </div>
                                            </td>
                                            <td className="font-bold text-slate-600">{agent.prospects}</td>
                                            <td>
                                                <span className={`status-pill ${agent.sales > 0 ? 'success' : 'neutral'}`}>
                                                    {agent.sales}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="conv-bar-container">
                                                    <div className="conv-bar-bg">
                                                        <div className="conv-bar-fill" style={{ width: agent.conversion, background: barColor }}></div>
                                                    </div>
                                                    <span className="conv-val" style={{ color: barColor }}>{agent.conversion}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rpt-section card-premium">
                    <div className="section-header">
                        <h3>Origine des Prospects</h3>
                    </div>
                    <div className="origins-list">
                        {stats.originAnalysis.map((o, i) => (
                            <div key={i} className="origin-row">
                                <div className="origin-info">
                                    <span className="origin-label">{o.label}</span>
                                    <span className="origin-count">{o.count} ({o.val}%)</span>
                                </div>
                                <div className="origin-bar-bg">
                                    <div className="origin-bar-fill" style={{ width: `${o.val}%`, background: o.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .rapports-page { padding: 2rem; }
                .animate-in { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .rpt-card {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    transition: all 0.3s ease;
                }
                .rpt-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
                .rpt-card.highlight { background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); border-color: #bbf7d0; }
                
                .rpt-icon-box {
                    width: 44px; height: 44px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 1rem;
                }
                .rpt-val { font-size: 1.75rem; font-weight: 800; color: #1e293b; line-height: 1; margin-bottom: 0.5rem; }
                .rpt-lbl { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

                .badge-light { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
                
                .agent-avatar-sm { 
                    width: 28px; height: 28px; border-radius: 50%; background: var(--primary); color: white;
                    display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;
                }
                
                .status-pill { padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
                .status-pill.success { background: #dcfce7; color: #166534; }
                .status-pill.neutral { background: #f1f5f9; color: #94a3b8; }

                .conv-bar-container { display: flex; align-items: center; gap: 0.75rem; min-width: 150px; }
                .conv-bar-bg { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
                .conv-bar-fill { height: 100%; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .conv-val { font-size: 0.75rem; font-weight: 800; min-width: 32px; }

                .origin-row { margin-bottom: 1.25rem; }
                .origin-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
                .origin-label { font-size: 0.85rem; font-weight: 700; color: #334155; }
                .origin-count { font-size: 0.75rem; font-weight: 600; color: #64748b; }
                .origin-bar-bg { width: 100%; height: 8px; background: #f8fafc; border-radius: 4px; overflow: hidden; }
                .origin-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }

                @media print {
                    .header-actions, .rapports-toolbar { display: none !important; }
                    .card-premium { border: 1px solid #eee !important; box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
};

export default Rapports;
