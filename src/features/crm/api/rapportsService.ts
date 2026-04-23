import { fetchContacts, fetchVisits, fetchCommercials } from './contactApi';
import type { CrmContact } from '@/stores/contactStore';
import { SALE_STATUSES, PIPELINE_STATUSES } from '../utils/crmConstants';

export interface RapportData {
    periodStats: {
        newProspects: number;
        closedSales: number;
        visitsCompleted: number;
        conversionRate: number;
        trends: {
            prospects: string;
            sales: string;
            visits: string;
        };
    };
    agentPerformance: {
        agent: string;
        prospects: number;
        sales: number;
        conversion: string;
    }[];
    originAnalysis: {
        label: string;
        count: number;
        val: number;
        color: string;
    }[];
    rawContacts: CrmContact[];
}

const COLORS = ['#2B2E83', '#E96C2E', '#10B981', '#6366F1', '#F59E0B', '#8B5CF6'];

export const getRapportData = async (period: string): Promise<RapportData> => {
    // 1. Fetch all necessary data
    const [contacts, visits, agents] = await Promise.all([
        fetchContacts(),
        fetchVisits(),
        fetchCommercials()
    ]);

    // 2. Filter by period
    const now = new Date();
    let startDate: Date | null = null;

    if (period === 'aujourdhui') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    } else if (period === 'cette-semaine') {
        startDate = new Date(now);
        const day = now.getDay() || 7; // Monday is 1, Sunday is 7
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

    let filteredContacts = contacts;
    let filteredVisits = visits;

    if (startDate) {
        filteredContacts = contacts.filter(c => c.createdAt && new Date(c.createdAt) >= startDate!);
        filteredVisits = visits.filter(v => v.date && new Date(v.date) >= startDate!);
    } else if (period === 'tout') {
        // No filtering
    }

    // 3. Calculate stats
    const newProspects = filteredContacts.length;
    const closedSales = filteredContacts.filter(c => SALE_STATUSES.includes(c.status)).length;
    const visitsCompleted = filteredVisits.filter(v => v.statut === 'completed').length;
    const conversionRate = newProspects > 0 ? Math.round((closedSales / newProspects) * 100) : 0;

    // 4. Agent Performance
    // - Uniquement les agents avec rôle 'commercial'
    // - Comparaison insensible à la casse pour éviter les non-correspondances
    const agentPerf = agents
        .filter(agent => agent.role === 'commercial') // Exclure RC, admins, techniciens…
        .map(agent => {
            const agentNameLower = (agent.name || '').trim().toLowerCase();
            const agentContacts = filteredContacts.filter(c =>
                (c.assignedAgent || '').trim().toLowerCase() === agentNameLower
            );
            
            // On compte uniquement les prospects actifs (en pipeline) pour cohérence avec le Dashboard
            const activeProspectsCount = agentContacts.filter(c => PIPELINE_STATUSES.includes(c.status)).length;
            const agentSales = agentContacts.filter(c => SALE_STATUSES.includes(c.status)).length;
            
            // Le taux de conversion est calculé sur le volume total de contacts de l'agent
            const conversion = agentContacts.length > 0
                ? Math.round((agentSales / agentContacts.length) * 100)
                : 0;

            return {
                agent: agent.name,
                prospects: activeProspectsCount,
                sales: agentSales,
                conversion: `${conversion}%`
            };
        })
        .filter(a => a.prospects > 0 || a.sales > 0) // Uniquement agents actifs sur la période
        .sort((a, b) => b.sales - a.sales);

    // 5. Origin Analysis
    const originsMap = new Map<string, number>();
    filteredContacts.forEach(c => {
        let source = c.source || 'Source non renseignée';
        if (['Facebook', 'Instagram', 'TikTok'].includes(source)) {
            source = 'RESEAUX SOCIAUX';
        }
        originsMap.set(source, (originsMap.get(source) || 0) + 1);
    });

    const totalWithSource = Array.from(originsMap.values()).reduce((a, b) => a + b, 0);
    const originAnalysis = Array.from(originsMap.entries()).map(([label, count], i) => ({
        label,
        count,
        val: totalWithSource > 0 ? Math.round((count / totalWithSource) * 100) : 0,
        color: COLORS[i % COLORS.length]
    })).sort((a, b) => b.val - a.val);

    return {
        periodStats: {
            newProspects,
            closedSales,
            visitsCompleted,
            conversionRate,
            trends: {
                prospects: 'En direct',
                sales: 'Réel',
                visits: 'À jour'
            }
        },
        agentPerformance: agentPerf,
        originAnalysis,
        rawContacts: filteredContacts
    };
};
