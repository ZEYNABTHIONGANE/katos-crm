import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useContactStore } from '@/stores/contactStore';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar,
    BarChart, Bar
} from 'recharts';
import { Users, User, ArrowUpRight, ArrowDownRight, Star, LayoutDashboard, TrendingUp, Plus, Phone, Mail, Clock, Home } from 'lucide-react';
import { fetchCommercials } from '../api/contactApi';
import { useEffect } from 'react';

const SERVICE_LABELS: Record<string, string> = {
    foncier: 'Foncier',
    construction: 'Construction',
    gestion_immobiliere: 'Gestion Immo',
};

const getStatusBadge = (status: string) => {
    const s = status || 'Prospect';
    switch (s) {
        case 'Prospect': return <span className="badge badge-warning">Prospect</span>;
        case 'Qualification': 
        case 'En Qualification': return <span className="badge badge-info">Qualification</span>;
        case 'RDV': return <span className="badge badge-primary">RDV</span>;
        case 'Négociation': return <span className="badge badge-info">Négociation</span>;
        case 'Contrat': return <span className="badge badge-success">Contrat</span>;
        case 'Paiement': return <span className="badge badge-success">Paiement</span>;
        case 'Livraison Client': return <span className="badge badge-success">Livré</span>;
        default: return <span className="badge badge-secondary">{s}</span>;
    }
};

const Dashboard = () => {
    const { user } = useAuth();
    const { contacts, interactions, visits } = useContactStore();
    const navigate = useNavigate();

    const [agentFilter, setAgentFilter] = useState('all');
    const [commercials, setCommercials] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            const data = await fetchCommercials();
            setCommercials(data);
        };
        load();
    }, []);

    const agents = useMemo(() => {
        const set = new Set<string>();
        contacts.forEach(c => { if (c.assignedAgent) set.add(c.assignedAgent); });
        return Array.from(set).sort();
    }, [contacts]);

    // ─── Calcul des Données Dynamiques ───
    const statsData = useMemo(() => {
        // Filtrage initial selon le rôle
        let filteredContacts = contacts;
        
        if (user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') {
            filteredContacts = contacts;
        } else if (user?.role === 'resp_commercial') {
            // Un responsable commercial voit les prospects de ses managers et de leurs agents
            const supervisedManagers = commercials.filter(comm => comm.parent_id === user.id);
            const supervisedManagerIds = supervisedManagers.map(m => m.id);
            const supervisedAgents = commercials.filter(comm => 
                comm.parent_id === user.id || 
                (comm.parent_id && supervisedManagerIds.includes(comm.parent_id))
            );
            const supervisedNames = supervisedAgents.map(a => a.name);
            filteredContacts = contacts.filter(c => supervisedNames.includes(c.assignedAgent || ''));
        } else if (user?.role === 'manager') {
            // Un manager voit les prospects des agents de son groupe
            const groupAgents = commercials.filter(comm => comm.parent_id === user.id);
            const groupAgentNames = [user.name, ...groupAgents.map(a => a.name)];
            filteredContacts = contacts.filter(c => groupAgentNames.includes(c.assignedAgent || ''));
        } else if (user?.role === 'commercial') {
            filteredContacts = contacts.filter(c => 
                (c.assignedAgent || '').toLowerCase() === (user?.name || '').toLowerCase()
            );
        } else if (user?.role === 'assistante') {
            filteredContacts = contacts.filter(c => c.createdBy === user?.name || !c.assignedAgent);
        }

        // Apply Smart Filters (Agent & Date)
        if (agentFilter !== 'all') {
            filteredContacts = filteredContacts.filter(c => c.assignedAgent === agentFilter);
        }

        // Définition des groupes de statuts
        const SALE_STATUSES = [
            'Client', 'Projet Livré', 'Contrat', 'Paiement', 
            'Transfert de dossier technique', 'Transfert dossier tech', 
            'Suivi Chantier', 'Livraison Client', 'Fidélisation', 'Réservation'
        ];
        
        const PROSPECT_STATUSES = [
            'Prospect', 'Qualification', 'En Qualification', 
            'RDV', 'RDV / Visite Terrain', 'Proposition Commerciale', 
            'Négociation', 'Réservation'
        ];

        const prospects = filteredContacts.filter(c => PROSPECT_STATUSES.includes(c.status));
        const clients = filteredContacts.filter(c => SALE_STATUSES.includes(c.status));
        const salesCount = clients.length;


        // Répartition par Groupes de Statut
        const distribution = [
            { name: 'Prospects', value: filteredContacts.filter(c => ['Prospect', 'Qualification', 'En Qualification'].includes(c.status)).length, fill: '#E96C2E' },
            { name: 'Négo/Résa', value: filteredContacts.filter(c => ['Proposition Commerciale', 'Négociation', 'Réservation'].includes(c.status)).length, fill: '#F59E0B' },
            { name: 'RDV/Visites', value: filteredContacts.filter(c => ['RDV', 'RDV / Visite Terrain'].includes(c.status)).length, fill: '#8b5cf6' },
            { name: 'Contrats/Paie', value: filteredContacts.filter(c => ['Contrat', 'Paiement'].includes(c.status)).length, fill: '#2B2E83' },
            { name: 'Clients & Liv.', value: filteredContacts.filter(c => ['Suivi Chantier', 'Livraison Client', 'Projet Livré', 'Fidélisation', 'Transfert de dossier technique', 'Transfert dossier tech'].includes(c.status)).length, fill: '#10B981' },
        ];

        // Top Agents (Ventes totales par agent)
        const agentMap: Record<string, { name: string, deals: number, prospects: number }> = {};
        filteredContacts.forEach(c => {
            const agent = c.assignedAgent || 'Non assigné';
            if (!agentMap[agent]) agentMap[agent] = { name: agent, deals: 0, prospects: 0 };
            if (SALE_STATUSES.includes(c.status)) {
                agentMap[agent].deals++;
            } else {
                agentMap[agent].prospects++;
            }
        });

        const topAgents = Object.values(agentMap)
            .filter(a => a.name !== 'Non assigné')
            .sort((a, b) => b.deals - a.deals)
            .slice(0, 5);

        // Performance par Service (Ventes totales par service)
        const serviceMap: Record<string, { name: string, deals: number }> = {
            foncier: { name: 'Foncier', deals: 0 },
            construction: { name: 'Construction', deals: 0 },
            gestion_immobiliere: { name: 'Gestion Immo', deals: 0 }
        };

        contacts.forEach(c => {
            if (c.service && (SALE_STATUSES.includes(c.status))) {
                serviceMap[c.service].deals++;
            }
        });

        const servicePerformance = Object.values(serviceMap).sort((a, b) => b.deals - a.deals);

        return {
            prospectsCount: prospects.length,
            clientsCount: clients.length,
            salesCount,
            distribution,
            topAgents,
            servicePerformance,
            assistanteTotalAssigned: contacts.filter(c => {
                const isCreator = c.createdBy ? c.createdBy === user?.name : !c.assignedAgent;
                return isCreator && c.assignedAgent;
            }).length,
            assistanteToContinue: contacts.filter(c => {
                const isCreator = c.createdBy ? c.createdBy === user?.name : !c.assignedAgent;
                return isCreator && !c.assignedAgent;
            }).length,
            assistanteProspectsList: contacts.filter(c => {
                const isCreator = c.createdBy ? c.createdBy === user?.name : !c.assignedAgent;
                return isCreator;
            }),
            leadsBySource: Object.entries(filteredContacts.reduce((acc, c) => {
                const src = c.source;
                if (!src || src === 'Autre') return acc; // Exclure "Autre" selon demande direction
                acc[src] = (acc[src] || 0) + 1;
                return acc;
            }, {} as Record<string, number>))
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),

            productPerformance: (() => {
                const rawData = Object.entries(clients.reduce((acc, c) => {
                    let product = 'Autre';
                    const titleRaw = c.propertyTitle || '';
                    const title = titleRaw.toUpperCase();
                    
                    if (title.includes('F3')) product = 'Villa F3';
                    else if (title.includes('F4')) product = 'Villa F4';
                    else if (title.includes('F6')) product = 'Villa F6';
                    else if (titleRaw) product = titleRaw.length > 20 ? titleRaw.substring(0, 18) + '..' : titleRaw;
                    else if (c.service === 'foncier') product = 'Foncier';
                    else if (c.service === 'construction') product = 'Construction';
                    else if (c.service === 'gestion_immobiliere') product = 'Gestion Immo';
                    
                    if (!acc[product]) acc[product] = { name: product, units: 0, revenueShare: 0 };
                    acc[product].units += 1;
                    const num = parseInt((c.budget || '0').replace(/[^0-9]/g, '')) || 0;
                    acc[product].revenueShare += num;
                    return acc;
                }, {} as Record<string, { name: string, units: number, revenueShare: number }>))
                .map(([name, data]) => ({ 
                    name, 
                    value: data.units, 
                    shareValue: data.revenueShare 
                }))
                .sort((a, b) => b.shareValue - a.shareValue);

                if (rawData.length <= 8) return rawData;

                const top8 = rawData.slice(0, 7);
                const others = rawData.slice(7);
                const othersCount = others.reduce((sum, item) => sum + item.value, 0);
                const othersValue = others.reduce((sum, item) => sum + item.shareValue, 0);

                return [
                    ...top8,
                    { name: 'Autres produits', value: othersCount, shareValue: othersValue }
                ];
            })(),

            agentPerformance: Object.values(agentMap)
                .filter(a => a.name !== 'Non assigné')
                .map(agent => {
                    const agentNameLower = (agent.name || '').toLowerCase();
                    const agentInteractions = interactions.filter(i => (i.agent || '').toLowerCase() === agentNameLower && (i.type === 'rdv' || i.type === 'visite_terrain'));
                    const agentVisits = visits.filter(v => (v.agent || '').toLowerCase() === agentNameLower && v.statut === 'completed');
                    const totalTouchpoints = agentInteractions.length + agentVisits.length;
                    const conversionRate = totalTouchpoints > 0 ? Math.round((agent.deals / totalTouchpoints) * 100) : 0;
                    return { ...agent, touchpoints: totalTouchpoints, conversionRate };
                })
                .sort((a, b) => b.deals - a.deals),
                
            avgProcessingTime: Math.round(clients.reduce((acc, c) => {
                const created = new Date(c.createdAt || '').getTime();
                const converted = c.convertedAt ? new Date(c.convertedAt).getTime() : new Date().getTime();
                const days = (converted - created) / (1000 * 60 * 60 * 24);
                return acc + days;
            }, 0) / (clients.length || 1)),

            recordProcessingTime: clients.length > 0 ? (() => {
                let min = Infinity;
                let holder = '—';
                clients.forEach(c => {
                    const created = new Date(c.createdAt || '').getTime();
                    const converted = c.convertedAt ? new Date(c.convertedAt).getTime() : new Date().getTime();
                    const diff = (converted - created) / (1000 * 60 * 60 * 24);
                    if (diff < min) {
                        min = diff;
                        holder = c.assignedAgent || '—';
                    }
                });
                return { days: Math.round(min), holder };
            })() : { days: 0, holder: '—' },

            conversionEfficiency: clients.length > 0 ? Math.round((clients.length / (filteredContacts.length || 1)) * 100) : 0,

            // Evolution d'activité dynamique sur les 6 derniers mois
            evolutionData: (() => {
                const months: Record<string, { name: string, ventes: number, prospects: number, sortKey: string }> = {};
                const now = new Date();
                
                // Initialiser les 6 derniers mois
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const key = `${year}-${month}`; // YYYY-MM robust
                    const name = d.toLocaleDateString('fr-FR', { month: 'short' });
                    months[key] = { name: name.charAt(0).toUpperCase() + name.slice(1).replace('.', ''), ventes: 0, prospects: 0, sortKey: key };
                }

                filteredContacts.forEach(c => {
                    // Group prospects by their creation date
                    const createdKey = c.createdAt ? c.createdAt.substring(0, 7) : null;
                    if (createdKey && months[createdKey]) {
                        if (!SALE_STATUSES.includes(c.status)) {
                            months[createdKey].prospects++;
                        }
                    }

                    // Group sales by their conversion date (or creation if legacy)
                    if (SALE_STATUSES.includes(c.status)) {
                        const convertedKey = (c.convertedAt || c.createdAt || '').substring(0, 7);
                        if (convertedKey && months[convertedKey]) {
                            months[convertedKey].ventes++;
                        }
                    }
                });

                return Object.values(months).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
            })(),
        };
    }, [contacts, interactions, visits, user]);

    const getKPIs = () => {
        const base = [
            { label: 'Prospects actifs', value: statsData.prospectsCount, change: '+5%', positive: true, icon: <Users size={22} />, gradient: 'grad-orange' },
            { label: 'Clients / Dossiers', value: statsData.clientsCount, change: '+2%', positive: true, icon: <Star size={22} />, gradient: 'grad-blue' },
        ];

        if (user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') {
            return [
                ...base,
                { label: 'Ventes Globales', value: statsData.salesCount, change: '+10%', positive: true, icon: <LayoutDashboard size={22} />, gradient: 'grad-purple' },
                { 
                    label: "Délai (Record)", 
                    value: (
                        <>
                            {statsData.avgProcessingTime}
                            <span style={{ fontSize: '0.65em', opacity: 0.85, fontWeight: 600 }}>j</span>
                            <span style={{ fontSize: '0.5em', opacity: 0.7, fontWeight: 500, marginLeft: '6px' }}>
                                (Rec: {statsData.recordProcessingTime.days}j)
                            </span>
                        </>
                    ), 
                    change: `Par: ${statsData.recordProcessingTime.holder}`, 
                    positive: true, 
                    hideArrow: true,
                    icon: <Clock size={22} />, 
                    gradient: 'grad-blue' 
                },
            ];
        }

        return [
            ...base,
            { label: 'Mes Ventes', value: statsData.salesCount, change: 'Objectif 10', positive: statsData.salesCount >= 10, hideArrow: true, icon: <LayoutDashboard size={22} />, gradient: 'grad-green' },
            { 
                label: "Performance", 
                value: (
                    <>
                        {Math.round((statsData.salesCount / 10) * 100)}
                        <span style={{ fontSize: '0.65em', opacity: 0.85, fontWeight: 600 }}>%</span>
                    </>
                ), 
                change: 'Score', 
                positive: true, 
                hideArrow: true, 
                icon: <TrendingUp size={22} />, 
                gradient: 'grad-purple' 
            },
        ];
    };

    if (user?.role === 'assistante') {
        return (
            <div className="dashboard">
                <div className="dash-hero">
                    <div className="dash-header flex justify-between items-center">
                        <div>
                            <h1>Tableau de bord</h1>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/prospects')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Plus size={18} />
                            Ajouter nouveau prospect
                        </button>
                    </div>

                    <div className="stats-grid hero-stats mt-6">
                        {/* Non Clickable */}
                        <div className="stat-card-v2 grad-blue">
                            <div className="stat-icon-wrap"><Users size={22} /></div>
                            <div className="stat-body">
                                <span className="stat-label-v2">Total prospects assignés</span>
                                <span className="stat-value-v2">{statsData.assistanteTotalAssigned}</span>
                            </div>
                        </div>

                        {/* Clickable */}
                        <div
                            className="stat-card-v2 grad-orange"
                            onClick={() => navigate('/prospects')}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } } as React.CSSProperties}
                        >
                            <div className="stat-icon-wrap"><Star size={22} /></div>
                            <div className="stat-body">
                                <span className="stat-label-v2">Liste à continuer</span>
                                <span className="stat-value-v2">{statsData.assistanteToContinue}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="contacts-table-container card-premium" style={{ marginTop: '2.5rem' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Liste de tous vos prospects ajoutés</h3>
                        <span className="badge-light">{statsData.assistanteProspectsList.length} prospect(s)</span>
                    </div>
                    <table className="contacts-table">
                        <thead>
                            <tr>
                                <th>Contact / Entreprise</th>
                                <th>Coordonnées</th>
                                <th>Service</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statsData.assistanteProspectsList.length > 0 ? statsData.assistanteProspectsList.map((contact) => (
                                <tr
                                    key={contact.id}
                                    className="contact-row clickable"
                                    onClick={() => navigate(`/prospects/${contact.id}`)}
                                >
                                    <td>
                                        <div className="user-profile-cell">
                                            <div className="avatar-initial">{contact.name.charAt(0)}</div>
                                            <div>
                                                <div className="font-medium text-main">{contact.name}</div>
                                                <div className="text-sm text-muted">{contact.company || '—'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="contact-links">
                                            <span className="icon-link"><Phone size={14} /> {contact.phone || '—'}</span>
                                            {contact.email && <span className="icon-link"><Mail size={14} /> {contact.email}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        {contact.service ? (
                                            <div>
                                                <div className="text-sm font-medium">{SERVICE_LABELS[contact.service]}</div>
                                                {contact.propertyTitle && (
                                                    <div className="text-sm text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.propertyTitle}</div>
                                                )}
                                            </div>
                                        ) : <span className="text-sm text-muted">—</span>}
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span className="text-sm font-medium">{contact.name}</span>
                                            <span className="text-xs text-muted">Créé le {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(contact.status)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="empty-state">Aucun prospect enregistré pour le moment.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dash-hero">
                <div className="hero-orb hero-orb-1"></div>
                <div className="hero-orb hero-orb-2"></div>
                <div className="hero-orb hero-orb-3"></div>
                <div className="dash-header">
                    <div>
                        <h1>Tableau de bord</h1>
                    </div>
                    <div className="dash-controls">
                        {['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager'].includes(user?.role || '') && (
                            <div className="dash-filter-group">
                                <div className="filter-item">
                                    <User size={14} />
                                    <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
                                        <option value="all">Tous les agents</option>
                                        {agents.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                {agentFilter !== 'all' && (
                                    <button className="clear-filters-btn" onClick={() => setAgentFilter('all')}>
                                        Réinitialiser
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="dash-date">
                            <span className="date-badge">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                    </div>
                </div>

                <div className="stats-grid hero-stats">
                    {getKPIs().map((s, i) => (
                        <div key={i} className={`stat-card-v2 ${s.gradient}`}>
                            <div className="stat-icon-wrap">{s.icon}</div>
                            <div className="stat-body">
                                <span className="stat-label-v2">{s.label}</span>
                                <span className="stat-value-v2">{s.value}</span>
                                <span className={`stat-change ${s.positive ? 'pos' : 'neg'}`}>
                                    {/* @ts-ignore */}
                                    {!s.hideArrow && (s.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
                                    {s.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="combo-block card-premium mt-6">
                <div className="combo-left">
                    <div className="combo-section-header">
                        <div>
                            <h3>Évolution d'activité</h3>
                            <p className="chart-subtitle">Analyse comparative des 6 derniers mois (Données réelles)</p>
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={statsData.evolutionData}>
                                <defs>
                                    <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2B2E83" stopOpacity={0.3} /><stop offset="95%" stopColor="#2B2E83" stopOpacity={0} /></linearGradient>
                                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E96C2E" stopOpacity={0.3} /><stop offset="95%" stopColor="#E96C2E" stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <RechartsTooltip />
                                <Area type="monotone" dataKey="ventes" stroke="#2B2E83" fill="url(#gV)" strokeWidth={3} name="Ventes" />
                                <Area type="monotone" dataKey="prospects" stroke="#E96C2E" fill="url(#gP)" strokeWidth={3} name="Prospects" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="combo-divider"></div>

                <div className="combo-right">
                    <div className="combo-section-header">
                        <h3>Répartition par Statut</h3>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statsData.distribution} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value" labelLine={false}>
                                    {statsData.distribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="charts-row mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                {/* Performance Détaillée des Commerciaux (Transformation) */}
                {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') && (
                    <div className="chart-card card-premium">
                        <div className="chart-header">
                            <h3>Performance & Transformation</h3>
                            <p className="chart-subtitle">Ventes vs (RDV + Visites)</p>
                        </div>
                        <div className="agents-list">
                            {statsData.agentPerformance.map((agent, i) => (
                                <div key={i} className="agent-row">
                                    <div className="agent-rank">{i + 1}</div>
                                    <div className="agent-info">
                                        <span className="agent-name-sm">{agent.name}</span>
                                        <span className="agent-stats">
                                            {agent.deals} ventes · {agent.touchpoints} RDV/Visites
                                        </span>
                                    </div>
                                    <div className={`lead-score-badge ${agent.conversionRate >= 20 ? 'score-hot' : 'score-cold'}`} style={{ borderRadius: '12px', padding: '4px 12px' }}>
                                        {agent.conversionRate}% Conv.
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Performance par Produit (Volume & Classement) */}
                {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') && (
                    <div className="chart-card card-premium">
                        <div className="chart-header">
                            <div>
                                <h3>Performance par Produit</h3>
                            </div>
                            <Home size={18} className="text-primary" />
                        </div>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData.productPerformance} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#eee" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fontSize: 12}} />
                                    <RechartsTooltip 
                                        formatter={(value: any) => [`${value} Unités vendues`, 'Volume']} 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" fill="#2B2E83" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 10, fill: '#666' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Origine des Leads */}
                {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') && (
                    <div className="chart-card card-premium">
                        <div className="chart-header">
                            <h3>Canaux d'Acquisition</h3>
                        </div>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={statsData.leadsBySource} 
                                        cx="50%" cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={80} 
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statsData.leadsBySource.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={['#2B2E83', '#E96C2E', '#10B981', '#F59E0B', '#6366F1'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            <div className="charts-row mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                {/* Classement des Commerciaux (Vue simplifiée pour tous) */}
                {(user?.role !== 'commercial' && statsData.topAgents.length > 0) && (
                    <div className="chart-card card-premium">
                        <div className="chart-header">
                            <h3>Classement des Commerciaux</h3>
                        </div>
                        <div className="agents-list">
                            {statsData.topAgents.map((agent, i) => (
                                <div key={i} className="agent-row">
                                    <div className="agent-rank">{i + 1}</div>
                                    <div className="agent-avatar-sm">{agent.name.charAt(0)}</div>
                                    <div className="agent-info">
                                        <span className="agent-name-sm">{agent.name}</span>
                                        <span className="agent-stats">{agent.deals} ventes · {agent.prospects} prospects</span>
                                    </div>
                                    <div className={`trend-badge ${agent.deals > 2 ? 'pos' : ''}`}>
                                        <TrendingUp size={12} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Performance Managers / Services (DC / Admin) */}
                {(user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') && (
                    <div className="chart-card card-premium">
                        <div className="chart-header">
                            <h3>Performance des Managers</h3>
                        </div>
                        <div className="agents-list">
                            {statsData.servicePerformance.map((svc, i) => (
                                <div key={i} className="agent-row">
                                    <div className="agent-rank" style={{ background: 'var(--primary)', color: 'white' }}>{i + 1}</div>
                                    <div className="agent-info">
                                        <span className="agent-name-sm">Groupe {svc.name}</span>
                                        <span className="agent-stats">{svc.deals} ventes réalisées</span>
                                    </div>
                                    <div className="agent-rating" style={{ background: '#059669', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                        {svc.deals} ventes
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Indicateur de progression (tous roles) */}
                <div className="chart-card card-premium">
                    <div className="chart-header">
                        <h3>Objectif du Mois</h3>
                        <span className="badge-light">{Math.min(statsData.salesCount * 10, 100)}%</span>
                    </div>
                    <div className="chart-wrapper radial-wrap" style={{ minHeight: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                innerRadius="60%"
                                outerRadius="90%"
                                data={[{ value: Math.min(statsData.salesCount * 10, 100), fill: '#2B2E83' }]}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="radial-center-label">
                            <span className="radial-percent" style={{ color: 'var(--primary)' }}>
                                {statsData.salesCount}
                            </span>
                            <span className="radial-sub">Ventes / 10</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

// --- CSS Supplémentaire pour les Filtres ---
/* 
  Ces styles devraient idéalement être dans _crm.scss, 
  mais je les ajoute ici pour une application directe.
*/
const dashboardStyles = `
.dash-controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
}
.dash-filter-group {
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    padding: 0.5rem 1rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px solid rgba(255,255,255,0.2);
}
.filter-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-size: 0.85rem;
}
.filter-item select, .filter-item input {
    background: transparent;
    border: none;
    color: white;
    font-size: 0.85rem;
    outline: none;
    cursor: pointer;
}
.filter-item select option {
    color: #333;
}
.filter-item input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
}
.clear-filters-btn {
    background: rgba(233, 108, 46, 0.2);
    color: #E96C2E;
    border: 1px solid #E96C2E;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}
.clear-filters-btn:hover {
    background: #E96C2E;
    color: white;
}
`;

// Inject style (hack for quick implementation without editing scss files if not needed)
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = dashboardStyles;
    document.head.appendChild(style);
}
