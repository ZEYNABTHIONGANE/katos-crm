import { supabase } from '@/lib/supabaseClient';

export interface ComplianceIssue {
    id: string;
    contactId: number;
    signaledBy: string;
    description: string;
    status: 'nouveau' | 'en_cours' | 'resolu' | 'besoin_admin';
    priority: 'basse' | 'normale' | 'haute';
    createdAt: string;
    // Joined data
    contactName?: string;
    agentName?: string;
}

export interface ComplianceReport {
    id: string;
    issueId: string;
    agentId: string;
    content: string;
    isResolved: boolean;
    requiresAdmin: boolean;
    createdAt: string;
    agentName?: string;
}

export const fetchComplianceIssues = async (): Promise<{ data: any[] | null, error: string | null }> => {
    const { data, error } = await supabase
        .from('compliance_issues')
        .select(`
            *,
            contacts(name),
            profiles!signaled_by(name)
        `)
        .order('created_at', { ascending: false });

    return { data, error: error?.message || null };
};

export const signalComplianceIssue = async (issue: Omit<ComplianceIssue, 'id' | 'createdAt' | 'status'>) => {
    const { data, error } = await supabase
        .from('compliance_issues')
        .insert([{
            contact_id: issue.contactId,
            signaled_by: issue.signaledBy,
            description: issue.description,
            priority: issue.priority,
            status: 'nouveau'
        }])
        .select()
        .single();

    if (error) throw error;
    
    // Notification for compliance team
    await supabase.from('notifications').insert([{
        type: 'info',
        title: 'Nouveau litige signalé',
        message: `Un problème de conformité a été signalé pour le client ${issue.contactName || 'inconnu'}.`,
        service: 'conformite'
    }]);

    // Personal notification for the reporter
    await supabase.from('notifications').insert([{
        type: 'info',
        title: 'Signalement envoyé',
        message: `Votre signalement pour le client ${issue.contactName || 'inconnu'} a bien été transmis au service conformité.`,
        assigned_to: issue.signaledBy
    }]);

    return data;
};

export const updateIssueStatus = async (id: string, status: string) => {
    const { error } = await supabase
        .from('compliance_issues')
        .update({ status })
        .eq('id', id);

    if (error) throw error;
};

export const createComplianceReport = async (report: Omit<ComplianceReport, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
        .from('compliance_reports')
        .insert([{
            issue_id: report.issueId,
            agent_id: report.agentId,
            content: report.content,
            is_resolved: report.isResolved,
            requires_admin: report.requiresAdmin
        }])
        .select()
        .single();

    if (error) throw error;

    // If resolved, update the issue status
    if (report.isResolved) {
        await updateIssueStatus(report.issueId, 'resolu');
        
        // Notify the reporter
        const { data: issueData } = await supabase.from('compliance_issues').select('signaled_by, contact_id, contacts(name)').eq('id', report.issueId).single();
        if (issueData) {
            // Safe access to joined contact name
            const contacts = issueData.contacts as any;
            const contactName = Array.isArray(contacts) ? contacts[0]?.name : contacts?.name;
            
            await supabase.from('notifications').insert([{
                type: 'success',
                title: 'Litige Résolu',
                message: `Le problème sur le client ${contactName || 'inconnu'} a été résolu par la conformité.`,
                assigned_to: issueData.signaled_by
            }]);
        }
    } else if (report.requiresAdmin) {
        await updateIssueStatus(report.issueId, 'besoin_admin');
    } else {
        await updateIssueStatus(report.issueId, 'en_cours');
    }

    return data;
};

export const fetchIssueReports = async (issueId: string): Promise<ComplianceReport[]> => {
    const { data, error } = await supabase
        .from('compliance_reports')
        .select(`
            *,
            profiles(name)
        `)
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching reports:', error);
        return [];
    }

    return data.map(d => ({
        id: d.id,
        issueId: d.issue_id,
        agentId: d.agent_id,
        content: d.content,
        isResolved: d.is_resolved,
        requiresAdmin: d.requires_admin,
        createdAt: d.created_at,
        agentName: d.profiles?.name
    }));
};

export const checkActiveDispute = async (contactId: number) => {
    const { data, error } = await supabase
        .from('compliance_issues')
        .select('id')
        .eq('contact_id', contactId)
        .neq('status', 'resolu')
        .limit(1);

    if (error) return false;
    return (data && data.length > 0);
};
