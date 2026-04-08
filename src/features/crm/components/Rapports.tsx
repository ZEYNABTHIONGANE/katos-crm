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
                c.name,
                c.email,
                c.phone,
                c.status,
                c.source,
                c.assignedAgent,
                c.budget,
                c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
            ].join(';'))
        ];

        const csvContent = csvRows.join('\n');
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
                            {data.agentPerformance.length > 0 ? (
                                data.agentPerformance.map((agent, i) => (
                                    <tr key={i}>
                                        <td>{agent.agent}</td>
                                        <td>{agent.prospects}</td>
                                        <td>{agent.sales}</td>
                                        <td><span className="badge-light">{agent.conversion}</span></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center text-muted py-4">
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
        </div>
    );
};

export default Rapports;
