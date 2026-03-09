import { useState } from 'react';
import { Download, Printer, TrendingUp, Users, Target, Calendar, Filter } from 'lucide-react';

const Rapports = () => {
    const [period, setPeriod] = useState('ce-mois');

    const downloadCSV = () => {
        const data = [
            ['Date', 'Agent', 'Type', 'Prospect', 'Montant (FCFA)'],
            ['2026-03-06', 'Abdou Sarr', 'Vente', 'Awa Ndiaye', '45000000'],
            ['2026-03-05', 'Omar Diallo', 'Visite', 'Cheikh Fall', '0'],
            ['2026-03-04', 'Katos Admin', 'Contrat', 'Moussa Diop', '120000000'],
        ];
        const csvContent = data.map(e => e.join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `katos_rapport_${period}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="rapports-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Rapports & Statistiques</h1>
                    <p className="subtitle">Analyse globale de l'activité et exports de données</p>
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
                    </select>
                </div>
            </div>

            {/* Section 1 : KPIs Flash */}
            <div className="rapports-grid">
                <div className="rpt-card card-premium">
                    <Users size={20} className="rpt-icon" style={{ color: '#2B2E83' }} />
                    <div className="rpt-val">124</div>
                    <div className="rpt-lbl">Nouveaux Prospects</div>
                    <div className="rpt-trend pos">+15% vs mois dernier</div>
                </div>
                <div className="rpt-card card-premium">
                    <Target size={20} className="rpt-icon" style={{ color: '#E96C2E' }} />
                    <div className="rpt-val">18</div>
                    <div className="rpt-lbl">Ventes Clôturées</div>
                    <div className="rpt-trend pos">+5% vs mois dernier</div>
                </div>
                <div className="rpt-card card-premium">
                    <TrendingUp size={20} className="rpt-icon" style={{ color: '#10B981' }} />
                    <div className="rpt-val">542M</div>
                    <div className="rpt-lbl">CA Total (FCFA)</div>
                    <div className="rpt-trend pos">+22% vs mois dernier</div>
                </div>
                <div className="rpt-card card-premium">
                    <Calendar size={20} className="rpt-icon" style={{ color: '#6366F1' }} />
                    <div className="rpt-val">45</div>
                    <div className="rpt-lbl">Visites Réalisées</div>
                    <div className="rpt-trend neg">-2% vs mois dernier</div>
                </div>
            </div>

            {/* Section 2 : Tableaux récapitulatifs */}
            <div className="rapports-layout">
                <div className="rpt-section card-premium">
                    <div className="section-header">
                        <h3>Performance par Agent</h3>
                    </div>
                    <table className="rpt-table">
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Prospects</th>
                                <th>Ventes</th>
                                <th>Conversion</th>
                                <th>CA</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Omar Diallo</td>
                                <td>45</td>
                                <td>12</td>
                                <td><span className="badge-light">26%</span></td>
                                <td className="font-bold">384M</td>
                            </tr>
                            <tr>
                                <td>Abdou Sarr</td>
                                <td>38</td>
                                <td>8</td>
                                <td><span className="badge-light">21%</span></td>
                                <td className="font-bold">256M</td>
                            </tr>
                            <tr>
                                <td>Fatou Ndiaye</td>
                                <td>22</td>
                                <td>3</td>
                                <td><span className="badge-light">13%</span></td>
                                <td className="font-bold">98M</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="rpt-section card-premium">
                    <div className="section-header">
                        <h3>Origine des Prospects</h3>
                    </div>
                    <div className="origins-list">
                        {[
                            { label: 'Recommandation', val: 45, color: '#2B2E83' },
                            { label: 'Facebook/Instagram', val: 32, color: '#E96C2E' },
                            { label: 'Site Web Katos', val: 28, color: '#10B981' },
                            { label: 'Panneaux Terrain', val: 19, color: '#6366F1' },
                        ].map((o, i) => (
                            <div key={i} className="origin-row">
                                <div className="origin-info">
                                    <span>{o.label}</span>
                                    <span>{o.val}%</span>
                                </div>
                                <div className="origin-bar-bg">
                                    <div className="origin-bar-fill" style={{ width: `${o.val}%`, background: o.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rapports;
