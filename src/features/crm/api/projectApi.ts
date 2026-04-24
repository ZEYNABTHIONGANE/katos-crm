import { supabase } from '../../../lib/supabaseClient';
import type { ConstructionProject } from '../types/land';
import type { CrmDocument } from '../types/documents';

/**
 * Projects API
 */
export const fetchProjects = async (): Promise<ConstructionProject[]> => {
    const { data, error } = await supabase
        .from('construction_projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        return [];
    }

    return (data || []).map(p => ({
        ...p,
        contactId: p.contact_id,
        villaModelId: p.villa_model_id,
        technicianName: p.technician_name,
        teamPlanning: p.team_planning,
        deliveryDate: p.delivery_date,
        technicalIssues: p.technical_issues || [],
        photos: p.photos || [],
    }));
};

export const createProject = async (project: Omit<ConstructionProject, 'id'>): Promise<ConstructionProject | null> => {
    const { data, error } = await supabase
        .from('construction_projects')
        .insert([{
            contact_id: project.contactId,
            villa_model_id: project.villaModelId === 'custom' ? null : project.villaModelId,
            progress: project.progress,
            technician_name: project.technicianName,
            team_planning: project.teamPlanning,
            delivery_date: project.deliveryDate,
            photos: project.photos,
            technical_issues: project.technicalIssues,
            status: project.status
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating project:', error);
        return null;
    }

    // Notification: Nouveau projet de construction
    await supabase.from('notifications').insert([{
        type: 'client',
        title: 'Nouveau projet de construction',
        message: `Un nouveau projet a été lancé. Responsable : ${data.technician_name || 'Non assigné'}.`,
        service: 'construction'
    }]);

    return {
        ...data,
        contactId: data.contact_id,
        villaModelId: data.villa_model_id,
        technicianName: data.technician_name,
        team_planning: data.team_planning,
        deliveryDate: data.delivery_date,
        technicalIssues: data.technical_issues || [],
        photos: data.photos || [],
    };
};

export const updateProjectApi = async (id: string, updates: Partial<ConstructionProject>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.technicianName !== undefined) dbUpdates.technician_name = updates.technicianName;
    if (updates.teamPlanning !== undefined) dbUpdates.team_planning = updates.teamPlanning;
    if (updates.deliveryDate !== undefined) dbUpdates.delivery_date = updates.deliveryDate;
    if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
    if (updates.technicalIssues !== undefined) dbUpdates.technical_issues = updates.technicalIssues;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from('construction_projects')
        .update(dbUpdates)
        .eq('id', id);

    if (error) {
        console.error('Error updating project:', error);
        return false;
    }
    return true;
};

export const deleteProjectApi = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('construction_projects')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting project:', error);
        return false;
    }
    return true;
};

/**
 * Documents API
 */
export const fetchDocuments = async (): Promise<CrmDocument[]> => {
    const { data, error } = await supabase
        .from('crm_documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching documents:', error);
        return [];
    }

    return (data || []).map(d => ({
        ...d,
        contactId: d.contact_id,
        projectId: d.project_id,
        propertyId: d.metadata?.propertyId,
        propertyType: d.metadata?.propertyType,
        name: d.name,
        type: d.type,
        url: d.file_url,
        version: d.version,
        versions: d.metadata?.versions || [],
        createdAt: d.created_at,
        updatedAt: d.updated_at
    }));
};

export const createDocumentApi = async (doc: Omit<CrmDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'versions'>): Promise<CrmDocument | null> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('crm_documents')
        .insert([{
            contact_id: doc.contactId,
            project_id: doc.projectId,
            name: doc.name,
            type: doc.type,
            file_url: doc.url,
            version: 1,
            metadata: { 
                versions: [{ version: 1, url: doc.url, createdAt: now }],
                propertyId: doc.propertyId,
                propertyType: doc.propertyType
            }
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating document:', error);
        return null;
    }

    // Notification: Nouveau document
    await supabase.from('notifications').insert([{
        type: 'info',
        title: 'Nouveau document ajouté',
        message: `Le document "${data.name}" a été mis en ligne.`,
        service: 'construction' // Ou à déduire du projet/contact
    }]);

    return {
        ...data,
        contactId: data.contact_id,
        projectId: data.project_id,
        propertyId: data.metadata?.propertyId,
        propertyType: data.metadata?.propertyType,
        name: data.name,
        type: data.type,
        url: data.file_url,
        version: data.version,
        versions: data.metadata?.versions || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

export const deleteDocumentApi = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('crm_documents')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting document:', error);
        return false;
    }
    return true;
};
