import { Users, TrendingUp, Target, Award, Star, Mail, Phone, ChevronRight } from 'lucide-react';
import './Agents.css';

const agentsData = [
    {
        id: 'u2',
        name: 'Omar Diallo',
        role: 'Manager Commercial',
        email: 'omar@katos.sn',
        phone: '+221 77 555 11 22',
        avatar: 'OD',
        stats: {
            prospects: 45,
            ventes: 12,
            relances: 156,
            conversion: '26.6%',
            ca: '384M FCFA'
        },
        performance: 92,
        color: '#2B2E83'
    },
    {
        id: 'u3',
        name: 'Abdou Sarr',
        role: 'Commercial Senior',
        email: 'abdou@katos.sn',
        phone: '+221 76 987 65 43',
        avatar: 'AS',
        stats: {
            prospects: 38,
            ventes: 8,
            relances: 124,
            conversion: '21.0%',
            ca: '256M FCFA'
        },
        performance: 85,
        color: '#E96C2E'
    },
    {
        id: 'u4',
        name: 'Fatou Ndiaye',
        role: 'Commerciale Junior',
        email: 'fatou@katos.sn',
        phone: '+221 78 444 99 88',
        avatar: 'FN',
        stats: {
            prospects: 22,
            ventes: 3,
            relances: 65,
            conversion: '13.6%',
            ca: '98M FCFA'
        },
        performance: 74,
        color: '#10B981'
    }
];

const Agents = () => {
    return (
        <div className="agents-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Gestion des Agents</h1>
                    <p className="subtitle">Suivi des performances et activités de l'équipe commerciale</p>
                </div>
            </div>

            {/* Stats Globales */}
            <div className="agents-overview-grid">
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(43,46,131,0.1)', color: '#2B2E83' }}>
                        <Users size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Total Agents</span>
                        <span className="ov-value">3</span>
                    </div>
                </div>
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(233,108,46,0.1)', color: '#E96C2E' }}>
                        <Target size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Objectif Global</span>
                        <span className="ov-value">84%</span>
                    </div>
                </div>
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Croissance Mensuelle</span>
                        <span className="ov-value">+12.4%</span>
                    </div>
                </div>
                <div className="overview-card card-premium">
                    <div className="ov-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                        <Award size={24} />
                    </div>
                    <div className="ov-info">
                        <span className="ov-label">Meilleur Agent</span>
                        <span className="ov-value">Omar D.</span>
                    </div>
                </div>
            </div>

            {/* Liste des Agents */}
            <div className="agents-grid">
                {agentsData.map(agent => (
                    <div key={agent.id} className="agent-card card-premium">
                        <div className="agent-card-header">
                            <div className="agent-main-info">
                                <div className="agent-profile-img" style={{ background: agent.color }}>
                                    {agent.avatar}
                                </div>
                                <div>
                                    <h3>{agent.name}</h3>
                                    <p className="agent-role-tag">{agent.role}</p>
                                </div>
                            </div>
                            <div className="perf-badge">
                                <Star size={14} fill="currentColor" />
                                {agent.performance}%
                            </div>
                        </div>

                        <div className="agent-contact-info">
                            <span><Mail size={14} /> {agent.email}</span>
                            <span><Phone size={14} /> {agent.phone}</span>
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
                                <span className="as-val">{agent.stats.conversion}</span>
                                <span className="as-lbl">Conv.</span>
                            </div>
                        </div>

                        <div className="ca-section">
                            <div className="ca-label">Chiffre d'Affaires</div>
                            <div className="ca-value" style={{ color: agent.color }}>{agent.stats.ca}</div>
                        </div>

                        <div className="perf-bar-container">
                            <div className="perf-bar-label">
                                <span>Performance</span>
                                <span>{agent.performance}%</span>
                            </div>
                            <div className="perf-bar-bg">
                                <div
                                    className="perf-bar-fill"
                                    style={{ width: `${agent.performance}%`, background: agent.color }}
                                ></div>
                            </div>
                        </div>

                        <button className="btn-outline btn-full mt-10">
                            Voir le détail <ChevronRight size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Agents;
