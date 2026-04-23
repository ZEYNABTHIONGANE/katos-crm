import { useState, useEffect } from 'react';
import { Download, Printer, Users, Target, Calendar, Filter, Loader2 } from 'lucide-react';
import { getRapportData, type RapportData } from '../api/rapportsService';

const Rapports = () => {
    const [period, setPeriod] = useState('ce-mois');
    const [data, setData] = useState<RapportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await getRapportData(period);
                setData(result);
            } catch (error) {
                console.error('Error loading report data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [period]);

    const downloadCSV = () => {
        if (!data) return;

        const headers = ['Nom', 'Email', 'Téléphone', 'Statut', 'Source', 'Agent Assigné', 'Budget', 'Date de création'];
        const csvRows = [
            headers.join(';'),
            ...data.rawContacts.map(c => [
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

    if (loading) {
        return (
            <div className="rapports-page d-flex-center" style={{ minHeight: '400px' }}>
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-primary mb-3" />
                    <p className="text-muted">Chargement des analyses...</p>
                </div>
            </div>
        );
    }

    if (!data) return <div>Erreur de chargement des données</div>;

    return (
        <div className="rapports-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Rapports & Statistiques</h1>
                    <p className="subtitle">Analyse globale de l'activité - Synchronisé avec Supabase</p>
                </div>
                <div className="header-actions">
                    <button className="btn-outline" onClick={() => window.print()}>
                        <Printer size={18} /> Imprimer PDF
                    </button>
                    <button className="btn-primary" onClick={downloadCSV}>
                        <Download size={18} /> Exporter CSV
                    </button>
                </div>
            </div>

            {/* Filtres de période */}
            <div className="rapports-toolbar card-premium">
                <div className="filter-group">
                    <Filter size={16} className="text-muted" />
                    <select className="form-select-sm" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="aujourdhui">Aujourd'hui</option>
                        <option value="cette-semaine">Cette semaine</option>
                        <option value="ce-mois">Ce mois-ci</option>
                        <option value="trimestre">Trimestre en cours</option>
                        <option value="annee">Année 2026</option>
                        <option value="tout">Toutes les données</option>
                    </select>
                </div>
            </div>

            {/* Section 1 : KPIs Flash */}
            <div className="rapports-grid">
                <div className="rpt-card card-premium">
                    <Users size={20} className="rpt-icon" style={{ color: '#2B2E83' }} />
                    <div className="rpt-val">{data.periodStats.newProspects}</div>
                    <div className="rpt-lbl">Nouveaux Prospects</div>
                    <div className="rpt-trend pos">{data.periodStats.trends.prospects}</div>
                </div>
                <div className="rpt-card card-premium">
                    <Target size={20} className="rpt-icon" style={{ color: '#E96C2E' }} />
                    <div className="rpt-val">{data.periodStats.closedSales}</div>
                    <div className="rpt-lbl">Ventes Clôturées</div>
                    <div className="rpt-trend pos">{data.periodStats.trends.sales}</div>
                </div>
                <div className="rpt-card card-premium">
                    <Calendar size={20} className="rpt-icon" style={{ color: '#6366F1' }} />
                    <div className="rpt-val">{data.periodStats.visitsCompleted}</div>
                    <div className="rpt-lbl">Visites Réalisées</div>
                    <div className="rpt-trend">{data.periodStats.trends.visits}</div>
                </div>
                <div className="rpt-card card-premium">
                    <Target size={20} className="rpt-icon" style={{ color: '#10B981' }} />
                    <div className="rpt-val">{data.periodStats.conversionRate}%</div>
                    <div className="rpt-lbl">Taux de Conversion</div>
                    <div className="rpt-trend">Soutenu</div>
                </div>
            </div>

            {/* Section 2 : Tableaux récapitulatifs */}
            <div className="rapports-layout">
                <div className="rpt-section card-premium">
                    <div className="section-header">
                        <h3>Performance par Agent</h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                            {data.agentPerformance.length} agent{data.agentPerformance.length > 1 ? 's' : ''} actif{data.agentPerformance.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="table-responsive">
                    <table className="rpt-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Agent</th>
                                <th>Prospects</th>
                                <th>Ventes</th>
                                <th>Taux de Conversion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.agentPerformance.length > 0 ? (
                                data.agentPerformance.map((agent, i) => {
                                    const convNum = parseInt(agent.conversion) || 0;
                                    const barColor = convNum >= 50 ? '#10b981' : convNum >= 25 ? '#f59e0b' : '#ef4444';
                                    return (
                                        <tr key={i}>
                                            <td style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>#{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        background: 'var(--primary)', color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
                                                    }}>
                                                        {(agent.agent || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{agent.agent}</span>
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{agent.prospects}</td>
                                            <td>
                                                <span style={{
                                                    background: agent.sales > 0 ? 'rgba(16,185,129,0.1)' : '#f8fafc',
                                                    color: agent.sales > 0 ? '#10b981' : '#94a3b8',
                                                    padding: '3px 10px', borderRadius: 20,
                                                    fontWeight: 700, fontSize: '0.85rem'
                                                }}>
                                                    {agent.sales}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 140 }}>
                                                    <div style={{ flex: 1, height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                        <div style={{ width: `${convNum}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: barColor, minWidth: 36 }}>{agent.conversion}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center text-muted py-4">
                                        Aucune donnée sur cette période
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>

                <div className="rpt-section card-premium">
                    <div className="section-header">
                        <h3>Origine des Prospects</h3>
                    </div>
                    <div className="origins-list">
                        {data.originAnalysis.length > 0 ? (
                            data.originAnalysis.map((o, i) => (
                                <div key={i} className="origin-row">
                                    <div className="origin-info">
                                        <span style={{ fontWeight: 600 }}>{o.label}</span>
                                        <span>{o.count} prospect{o.count > 1 ? 's' : ''} ({o.val}%)</span>
                                    </div>
                                    <div className="origin-bar-bg">
                                        <div className="origin-bar-fill" style={{ width: `${o.val}%`, background: o.color }}></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted py-4">
                                Aucune analyse d'origine disponible
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @media print {
                    .sidebar-container, .header-container, .rapports-toolbar, .header-actions, .btn-primary, .btn-outline {
                        display: none !important;
                    }
                    .layout-main {
                        margin-left: 0 !important;
                        padding: 0 !important;
                    }
                    .layout-content {
                        padding: 0 !important;
                    }
                    .rapports-page {
                        padding: 0 !important;
                    }
                    .card-premium {
                        box-shadow: none !important;
                        border: 1px solid #eee !important;
                        break-inside: avoid;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    h1 { font-size: 24pt !important; }
                    .rpt-card {
                        border: 1px solid #ddd !important;
                        flex: 1 !important;
                        min-width: 20% !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Rapports;
