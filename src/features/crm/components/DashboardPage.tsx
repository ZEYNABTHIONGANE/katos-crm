import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';
import { Users, Banknote, ArrowUpRight, ArrowDownRight, Star, LayoutDashboard } from 'lucide-react';

const salesData = [
    { name: 'Jan', ventes: 24, prospects: 18 },
    { name: 'Fév', ventes: 32, prospects: 22 },
    { name: 'Mar', ventes: 28, prospects: 30 },
    { name: 'Avr', ventes: 45, prospects: 27 },
    { name: 'Mai', ventes: 38, prospects: 35 },
    { name: 'Juin', ventes: 52, prospects: 42 },
    { name: 'Juil', ventes: 61, prospects: 50 },
];

const statusData = [
    { name: 'Nouveaux', value: 24, fill: '#E96C2E' },
    { name: 'En Qualif.', value: 18, fill: '#F59E0B' },
    { name: 'Clients', value: 45, fill: '#2B2E83' },
    { name: 'Livrés', value: 10, fill: '#10B981' },
];

const radialData = [
    { name: 'Objectif atteint', value: 72, fill: '#E96C2E' },
];

const topAgents = [
    { name: 'Abdou Sarr', visits: 12, deals: 5, rating: 4.8 },
    { name: 'Omar Diallo', visits: 9, deals: 4, rating: 4.6 },
    { name: 'Katos Admin', visits: 7, deals: 6, rating: 4.9 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="tooltip-label">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.fill || p.stroke }}>
                        {p.name} : <strong>{p.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const stats = [
        { label: 'Prospects du mois', value: '24', change: '+12%', positive: true, icon: <Users size={22} />, gradient: 'grad-orange' },
        { label: 'Clients Actifs', value: '158', change: '+5%', positive: true, icon: <Star size={22} />, gradient: 'grad-blue' },
        { label: 'Ventes de Terrains', value: '7', change: '+8%', positive: true, icon: <LayoutDashboard size={22} />, gradient: 'grad-purple', path: '/foncier' },
        { label: "Chiffre d'Affaires", value: '45M FCFA', change: '+18%', positive: true, icon: <Banknote size={22} />, gradient: 'grad-green' },
    ];


    return (
        <div className="dashboard">

            {/* ---- Bandeau décoratif hero ---- */}
            <div className="dash-hero">
                <div className="hero-orb hero-orb-1"></div>
                <div className="hero-orb hero-orb-2"></div>
                <div className="hero-orb hero-orb-3"></div>
                <div className="dash-header">
                    <div>
                        <h1>Tableau de bord</h1>
                        <p className="subtitle">Bonjour ! Voici un aperçu de votre activité commerciale.</p>
                    </div>
                    <div className="dash-date">
                        <span className="date-badge">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* Stat cards intégrées dans le hero */}
                <div className="stats-grid hero-stats">
                    {stats.map((s, i) => (
                        <div key={i} className={`stat-card-v2 ${s.gradient}`}>
                            <div className="stat-icon-wrap">{s.icon}</div>
                            <div className="stat-body">
                                <span className="stat-label-v2">{s.label}</span>
                                <span className="stat-value-v2">{s.value}</span>
                                <span className={`stat-change ${s.positive ? 'pos' : 'neg'}`}>
                                    {s.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {s.change} ce mois
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ---- Bloc unifié : Évolution Ventes + Pipeline ---- */}
            <div className="combo-block card-premium">

                {/* ─── Côté gauche : Évolution Ventes ─── */}
                <div className="combo-left">
                    <div className="combo-section-header">
                        <div>
                            <h3>Évolution des Ventes & Prospects</h3>
                            <p className="chart-subtitle">7 derniers mois — Katos CRM</p>
                        </div>
                        <div className="chart-legend-inline">
                            <span className="legend-dot" style={{ background: '#2B2E83' }}></span> Ventes (M)
                            <span className="legend-dot" style={{ background: '#E96C2E' }}></span> Prospects
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2B2E83" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2B2E83" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradPros" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#E96C2E" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#E96C2E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="ventes" stroke="#2B2E83" strokeWidth={3} fill="url(#gradRev)" name="Ventes (M)" dot={{ fill: '#2B2E83', r: 4 }} activeDot={{ r: 6 }} />
                                <Area type="monotone" dataKey="prospects" stroke="#E96C2E" strokeWidth={3} fill="url(#gradPros)" name="Prospects" dot={{ fill: '#E96C2E', r: 4 }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ─── Séparateur ─── */}
                <div className="combo-divider"></div>

                {/* ─── Côté droit : Pipeline ─── */}
                <div className="combo-right">
                    <div className="combo-section-header">
                        <div>
                            <h3>Pipeline Commercial</h3>
                            <p className="chart-subtitle">Répartition des dossiers</p>
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={65}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={10}
                                    formatter={(value) => <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Mini légende des chiffres */}
                    <div className="pipeline-mini-stats">
                        {statusData.map((d, i) => (
                            <div key={i} className="pms-item">
                                <span className="pms-dot" style={{ background: d.fill }}></span>
                                <span className="pms-label">{d.name}</span>
                                <span className="pms-value" style={{ color: d.fill }}>{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ---- Ligne du bas ---- */}
            <div className="charts-row">
                {/* Bar Chart mensuel */}
                <div className="chart-card chart-medium">
                    <div className="chart-header">
                        <div>
                            <h3>Visites par mois</h3>
                            <p className="chart-subtitle">Activité terrain de l'équipe</p>
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={20}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#E96C2E" />
                                        <stop offset="100%" stopColor="#f59e0b" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                <Bar dataKey="prospects" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Visites" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Objectif mensuel radial */}
                <div className="chart-card chart-xsmall">
                    <div className="chart-header">
                        <div>
                            <h3>Objectif Mensuel</h3>
                            <p className="chart-subtitle">Mars 2026</p>
                        </div>
                    </div>
                    <div className="chart-wrapper radial-wrap">
                        <ResponsiveContainer width="100%" height={180}>
                            <RadialBarChart
                                innerRadius="60%"
                                outerRadius="90%"
                                data={radialData}
                                startAngle={210}
                                endAngle={-30}
                            >
                                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="radial-center-label">
                            <span className="radial-percent">72%</span>
                            <span className="radial-sub">atteint</span>
                        </div>
                    </div>
                </div>

                {/* Top agents */}
                <div className="chart-card chart-medium">
                    <div className="chart-header">
                        <h3>Top Agents du mois</h3>
                    </div>
                    <div className="agents-list">
                        {topAgents.map((agent, i) => (
                            <div key={i} className="agent-row">
                                <div className="agent-rank">{i + 1}</div>
                                <div className="agent-avatar-sm">{agent.name.charAt(0)}</div>
                                <div className="agent-info">
                                    <span className="agent-name-sm">{agent.name}</span>
                                    <span className="agent-stats">{agent.visits} visites · {agent.deals} contrats</span>
                                </div>
                                <div className="agent-rating">
                                    <Star size={12} fill="#F59E0B" color="#F59E0B" />
                                    <span>{agent.rating}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div >
    );
};

export default Dashboard;
