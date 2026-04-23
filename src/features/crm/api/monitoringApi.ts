import { supabase } from '@/lib/supabaseClient';

export interface AgentEvaluation {
    id: string;
    agent_name: string;
    manager_id: string;
    evaluation_date: string;
    evaluation_note: string;
    created_at: string;
}

export const fetchEvaluations = async (agentName?: string): Promise<AgentEvaluation[]> => {
    let query = supabase.from('agent_evaluations').select('*').order('evaluation_date', { ascending: false });
    if (agentName) {
        query = query.eq('agent_name', agentName);
    }
    const { data, error } = await query;
    if (error) {
        console.error('[monitoringApi] fetchEvaluations error:', error);
        return [];
    }
    return data || [];
};

export const saveEvaluation = async (evaluation: Omit<AgentEvaluation, 'id' | 'created_at'>): Promise<boolean> => {
    const { error } = await supabase.from('agent_evaluations').upsert([evaluation], {
        onConflict: 'agent_name,evaluation_date'
    });
    if (error) {
        console.error('[monitoringApi] saveEvaluation error:', error);
        return false;
    }
    return true;
};

export const deleteEvaluation = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('agent_evaluations').delete().eq('id', id);
    if (error) {
        console.error('[monitoringApi] deleteEvaluation error:', error);
        return false;
    }
    return true;
};
