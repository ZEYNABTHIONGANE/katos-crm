import { useState, useMemo } from 'react';
import { useContactStore } from '@/stores/contactStore';
import { useAuth } from '@/app/providers/AuthProvider';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import { Users, TrendingUp, BarChart3, Calendar } from 'lucide-react';

const COLORS = ['#2B2E83', '#E96C2E', '#10B981', '#6366F1', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const MarketingDashboard = () => {
    const { contacts, commercials } = useContactStore();
    const { user } = useAuth();

    // Stats & Filters
    const [period, setPeriod] = useState<'tout' | 'ce-mois' | 'cette-semaine' | 'trimestre' | 'annee'>('ce-mois');

    // --- HIERARCHY FILTERING ---
    const supervisedNames = useMemo(() => getSupervisedAgentNames(user, commercials), [user, commercials]);
    const lowerSupervised = useMemo(() => supervisedNames ? supervisedNames.map(n => (n || '').trim().toLowerCase()) : null, [supervisedNames]);

    const isMine = (agentName: string) => {
        if (lowerSupervised === null) return true; // Admin/DirCom voit tout
        return lowerSupervised.includes((agentName || '').trim().toLowerCase());
    };

    // --- DATA CALCULATION ---
    const filteredContacts = useMemo(() => {
        const now = new Date();
        let startDate: Date | null = null;
        if (period === 'ce-mois') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (period === 'cette-semaine') {
            const day = now.getDay() || 7;
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day + 1);
            startDate.setHours(0, 0, 0, 0);
        }
        else if (period === 'trimestre') {
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
        }
        else if (period === 'annee') startDate = new Date(now.getFullYear(), 0, 1);

        return contacts.filter(c => {
            // Filtre par période (Création)
            if (startDate && c.createdAt && new Date(c.createdAt) < startDate) return false;
            // Filtre hiérarchique
            if (!isMine(c.assignedAgent || '')) return false;
            return true;
        });
    }, [contacts, period, lowerSupervised]);

    const stats = useMemo(() => {
        const sourcesCount: Record<string, number> = {};
        const agentCount: Record<string, number> = {};
        
        const now = new Date();
        let startDate: Date | null = null;
        if (period === 'ce-mois') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (period === 'cette-semaine') {
            const day = now.getDay() || 7;
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day + 1);
            startDate.setHours(0, 0, 0, 0);
        }
        else if (period === 'trimestre') {
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
        }
        else if (period === 'annee') startDate = new Date(now.getFullYear(), 0, 1);

        // Les ventes sont calculées sur TOUTE la base (si convertedAt est dans la période et appartient au groupe)
        const totalSales = contacts.filter(c => {
            if (!isMine(c.assignedAgent || '')) return false;
            if (!c.convertedAt) return false;
            if (startDate && new Date(c.convertedAt) < startDate) return false;
            return true;
        }).length;

        filteredContacts.forEach(c => {
            const source = c.source || 'Non renseignée';
            sourcesCount[source] = (sourcesCount[source] || 0) + 1;

            const agent = c.assignedAgent || 'À dispatcher';
            agentCount[agent] = (agentCount[agent] || 0) + 1;
        });

        const sourceData = Object.entries(sourcesCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const dispatchData = Object.entries(agentCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        return {
            totalProspects: filteredContacts.length,
            totalSales,
            conversionRate: filteredContacts.length > 0 ? Math.round((totalSales / filteredContacts.length) * 100) : 0,
            sourceData,
            dispatchData
        };
    }, [filteredContacts, contacts, period, lowerSupervised]);



    return (
        <div className="marketing-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
            <div className="page-header d-flex-between">
                <div>
                    <h1>Acquisition & Marketing</h1>
                    <p className="subtitle">Analysez vos canaux d'acquisition et vos statistiques globales</p>
                </div>
            </div>

            <div className="card-premium" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card)' }}>
                <Calendar size={18} className="text-muted" />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Période d'analyse :</span>
                <select className="form-select-sm" value={period} onChange={(e) => setPeriod(e.target.value as any)} style={{ width: '200px' }}>
                    <option value="tout">Global (Depuis toujours)</option>
                    <option value="cette-semaine">Cette semaine</option>
                    <option value="ce-mois">Ce mois-ci</option>
                    <option value="trimestre">Ce trimestre</option>
                    <option value="annee">Cette année</option>
                </select>
            </div>

            <div className="stats-grid">
                <div className="stat-card-v2 grad-blue">
                    <div className="stat-icon-wrap"><Users size={22} /></div>
                    <div className="stat-body">
                        <span className="stat-label-v2">Prospects Acquis</span>
                        <span className="stat-value-v2">{stats.totalProspects}</span>
                    </div>
                </div>
                <div className="stat-card-v2 grad-green">
                    <div className="stat-icon-wrap"><TrendingUp size={22} /></div>
                    <div className="stat-body">
                        <span className="stat-label-v2">Ventes Générées</span>
                        <span className="stat-value-v2">{stats.totalSales}</span>
                    </div>
                </div>
                <div className="stat-card-v2 grad-orange">
                    <div className="stat-icon-wrap"><BarChart3 size={22} /></div>
                    <div className="stat-body">
                        <span className="stat-label-v2">Taux de Conversion (Est.)</span>
                        <span className="stat-value-v2">{stats.conversionRate}%</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                <div className="card-premium p-4">
                    <h3 className="mb-10">Canaux d'Acquisition (Sources)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                        {stats.sourceData.length > 0 ? stats.sourceData.map((item, index) => {
                            const percent = stats.totalProspects > 0 ? Math.round((item.value / stats.totalProspects) * 100) : 0;
                            const color = COLORS[index % COLORS.length];
                            return (
                                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600 }}>
                                            {item.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>: {item.value} prospect(s)</span>
                                        </span>
                                        <span style={{ fontWeight: 700, color }}>{percent}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: `${color}25`, borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="empty-state">Aucune donnée pour cette période</div>
                        )}
                    </div>
                </div>

                <div className="card-premium p-4">
                    <h3 className="mb-10">Dispatching (Répartition par agent)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {stats.dispatchData.length > 0 ? stats.dispatchData.map((item) => (
                            <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontWeight: item.name === 'À dispatcher' ? 700 : 500, color: item.name === 'À dispatcher' ? 'var(--danger)' : 'var(--text-main)' }}>
                                    {item.name}
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.value} prospect(s)</span>
                            </div>
                        )) : (
                            <div className="empty-state">Aucune donnée</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MarketingDashboard;
