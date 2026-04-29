import { supabase } from '@/lib/supabaseClient';
import type { CrmContact, Interaction, Visit, FollowUp } from '@/stores/contactStore';

// -- Contacts API --
export const fetchContacts = async (): Promise<CrmContact[]> => {
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Error fetching contacts:', error); return []; }
    
    // Map Postgres lowercase column names to our frontend camelCase types
    return data.map(d => ({
        id: d.id,
        name: d.name,
        company: d.company || '',
        email: d.email || '',
        phone: d.phone || '',
        status: d.status,
        address: d.address || '',
        country: d.country || '',
        source: d.source || '',
        service: d.service,
        propertyId: d.propertyid,
        propertyTitle: d.propertytitle,
        lastAction: d.lastaction,
        budget: d.budget || '',
        notes: d.notes || '',
        assignedAgent: d.assignedagent || '',
        createdAt: d.created_at,
        budgetConfirmed: !!d.budget_confirmed,
        isReactive: !!d.is_reactive,
        convertedAt: d.converted_at
    }));
}

export const createContact = async (contact: Omit<CrmContact, 'id'>): Promise<CrmContact | null> => {
    // Map camelCase to actual Postgres lowercase column names
    const dbContact = {
        name: contact.name,
        company: contact.company,
        email: contact.email,
        phone: contact.phone,
        status: contact.status,
        address: contact.address,
        country: contact.country,
        source: contact.source,
        service: contact.service,
        propertyid: contact.propertyId,
        propertytitle: contact.propertyTitle,
        lastaction: contact.lastAction,
        budget: contact.budget,
        notes: contact.notes,
        assignedagent: contact.assignedAgent,
        budget_confirmed: contact.budgetConfirmed,
        is_reactive: contact.isReactive,
        converted_at: contact.convertedAt
    };
    
    console.log('[createContact] Sending to Supabase:', dbContact);
    const { data, error } = await supabase.from('contacts').insert([dbContact]).select().single();
    if (error) { 
        console.error('[createContact] Error creating contact:', error); 
        return null; 
    }
    
    // Notification: Nouveau prospect créé
    await supabase.from('notifications').insert([{
        type: 'prospect',
        title: 'Nouveau prospect',
        message: `${data.name} a été ajouté au CRM par ${data.created_by || 'un utilisateur'}.`,
        service: data.service === 'gestion' ? 'gestion_immobiliere' : data.service,
        created_by_name: data.created_by
    }]);

    console.log('[createContact] Supabase returned:', data);
    
    // Map back to CrmContact - handle actual Postgres column names
    return {
        id: data.id,
        name: data.name,
        company: data.company || '',
        email: data.email || '',
        phone: data.phone || '',
        status: data.status,
        address: data.address || '',
        country: data.country || '',
        source: data.source || '',
        service: data.service,
        propertyId: data.propertyid || data.property_id,
        propertyTitle: data.propertytitle || data.property_title,
        lastAction: data.lastaction || data.last_action || '',
        budget: data.budget || '',
        notes: data.notes || '',
        assignedAgent: data.assignedagent || data.assigned_agent || '',
        createdBy: data.created_by || '',
        createdAt: data.created_at,
        budgetConfirmed: !!data.budget_confirmed,
        isReactive: !!data.is_reactive,
        convertedAt: data.converted_at
    };
};

export const bulkCreateContacts = async (contacts: Omit<CrmContact, 'id'>[]): Promise<CrmContact[]> => {
    const dbContacts = contacts.map(contact => ({
        name: contact.name,
        company: contact.company || '',
        email: contact.email || '',
        phone: contact.phone || '',
        status: contact.status || 'Prospect',
        address: contact.address || '',
        country: contact.country || '',
        source: contact.source || 'Importation',
        service: contact.service,
        propertyid: contact.propertyId,
        propertytitle: contact.propertyTitle,
        lastaction: contact.lastAction,
        budget: contact.budget,
        notes: contact.notes,
        assignedagent: contact.assignedAgent,
        budget_confirmed: contact.budgetConfirmed || false,
        is_reactive: contact.isReactive || false,
        converted_at: contact.convertedAt
    }));

    console.log('[bulkCreateContacts] Sending batch to Supabase:', dbContacts.length, 'rows');
    const { data, error } = await supabase.from('contacts').insert(dbContacts).select();
    
    if (error) {
        console.error('[bulkCreateContacts] FULL ERROR OBJECT:', error);
        console.error('[bulkCreateContacts] ERROR MESSAGE:', error.message);
        console.error('[bulkCreateContacts] ERROR DETAILS:', error.details);
        console.error('[bulkCreateContacts] ERROR HINT:', error.hint);
        return [];
    }

    // Notification: Importation réussie
    if (data && data.length > 0) {
        await supabase.from('notifications').insert([{
            type: 'info',
            title: 'Importation réussie',
            message: `${data.length} nouveaux prospects ont été importés.`,
            created_by_name: data[0].created_by
        }]);
    }

    return (data || []).map(d => ({
        id: d.id,
        name: d.name,
        company: d.company || '',
        email: d.email || '',
        phone: d.phone || '',
        status: d.status,
        address: d.address || '',
        country: d.country || '',
        source: d.source || '',
        service: d.service,
        propertyId: d.propertyid || d.property_id,
        propertyTitle: d.propertytitle || d.property_title,
        lastAction: d.lastaction || d.last_action || '',
        budget: d.budget || '',
        notes: d.notes || '',
        assignedAgent: d.assignedagent || d.assigned_agent || '',
        createdBy: d.created_by || '',
        createdAt: d.created_at,
        budgetConfirmed: !!d.budget_confirmed,
        isReactive: !!d.is_reactive,
        convertedAt: d.converted_at
    }));
};

export const updateContactApi = async (id: number, updates: Partial<CrmContact>): Promise<boolean> => {
    // Convert camelCase to actual Postgres lowercase column names
    const fieldMap: Record<string, string> = {
        assignedAgent: 'assignedagent',
        propertyId: 'propertyid',
        propertyTitle: 'propertytitle',
        lastAction: 'lastaction',
        budgetConfirmed: 'budget_confirmed',
        isReactive: 'is_reactive',
        convertedAt: 'converted_at',
        refusalReason: 'refusal_reason'
    };
    
    // 1. Build a CLEAN snake_case object
    const finalDbUpdates: Record<string, any> = {};
    const writableColumns = [
        'name', 'company', 'email', 'phone', 'status', 'address', 'country', 
        'source', 'service', 'budget', 'notes', 
        'assignedagent', 'propertyid', 'propertytitle', 'lastaction', 
        'budget_confirmed', 'is_reactive', 'converted_at', 'refusal_reason'
    ];

    for (const [key, value] of Object.entries(updates)) {
        if (['id', 'createdAt', 'createdAtRelative', 'id_prospect'].includes(key)) continue;
        const mappedCol = fieldMap[key] || key;
        if (writableColumns.includes(mappedCol)) {
            finalDbUpdates[mappedCol] = value;
        }
    }
    
    console.log('[updateContactApi] Payload:', finalDbUpdates);
    
    const { data: updatedData, error } = await supabase
        .from('contacts')
        .update(finalDbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[updateContactApi] Supabase Error:', error.message, error.details);
        return false;
    }

    // Notification: Vente ou Location réussie
    if (finalDbUpdates.status === 'Contrat' || finalDbUpdates.status === 'Client') {
        let type: 'client' | 'info' = 'info';
        let title = 'Nouveau Contrat';
        let message = `Un nouveau contrat a été signé avec ${updatedData.name}.`;

        if (updatedData.service === 'foncier') {
            type = 'client';
            title = 'Vente de terrain';
            message = `Félicitations ! Une vente de terrain a été enregistrée pour ${updatedData.name}.`;
        } else if (updatedData.service === 'gestion' || updatedData.service === 'gestion_immobiliere') {
            title = 'Nouveau client location';
            message = `Un nouveau contrat de location a été signé avec ${updatedData.name}.`;
        } else if (updatedData.service === 'construction') {
            type = 'client';
            title = 'Nouveau contrat de construction';
            message = `Un nouveau projet de construction a été validé pour ${updatedData.name}.`;
        }

        await supabase.from('notifications').insert([{
            type,
            title,
            message,
            service: updatedData.service === 'gestion' ? 'gestion_immobiliere' : updatedData.service,
            created_by_name: 'Système'
        }]);
    }

    // Notification: Assignation (si l'agent a changé)
    if (finalDbUpdates.assignedagent) {
        // On récupère l'ID de l'agent pour le notifier
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('name', finalDbUpdates.assignedagent)
            .single();

        if (profile && finalDbUpdates.assignedagent !== updates.lastModifiedBy) {
            await supabase.from('notifications').insert([{
                type: 'prospect',
                title: 'Nouveau prospect assigné',
                message: `Le prospect ${finalDbUpdates.name || 'un prospect'} vous a été assigné.`,
                assigned_to: profile.id,
                service: finalDbUpdates.service
            }]);
        }
    }

    console.log('[updateContactApi] Success! Updated data:', updatedData);
    return true;
};

export const updateInteractionApi = async (id: string, updates: any): Promise<boolean> => {
    const dbUpdates: any = { ...updates };
    if (updates.contactId) {
        dbUpdates.contact_id = updates.contactId;
        delete dbUpdates.contactId;
    }
    const { error } = await supabase.from('interactions').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating interaction:', error); return false; }
    return true;
}

export const deleteInteractionApi = async (id: string) => {
    const { error } = await supabase.from('interactions').delete().eq('id', id);
    if (error) console.error('Error deleting interaction:', error);
};

export const deleteContactApi = async (id: number) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) console.error('Error deleting contact:', error);
};

export const moveContactStatusApi = async (id: number, newStatus: string, convertedAt?: string): Promise<boolean> => {
    const updates: any = { status: newStatus };
    if (convertedAt) updates.converted_at = convertedAt;
    
    const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
    if (error) { console.error('Error moving contact status:', error); return false; }

    // Notification: Vente ou Location réussie via changement de statut
    if (newStatus === 'Contrat' || newStatus === 'Client') {
        let type: 'client' | 'info' = 'info';
        let title = 'Nouveau Contrat';
        let message = `Un nouveau contrat a été signé avec ${data.name}.`;

        if (data.service === 'foncier') {
            type = 'client';
            title = 'Vente de terrain';
            message = `Félicitations ! Une vente de terrain a été enregistrée pour ${data.name}.`;
        } else if (data.service === 'gestion' || data.service === 'gestion_immobiliere') {
            title = 'Nouveau client location';
            message = `Un nouveau contrat de location a été signé avec ${data.name}.`;
        } else if (data.service === 'construction') {
            type = 'client';
            title = 'Nouveau contrat de construction';
            message = `Un nouveau projet de construction a été validé pour ${data.name}.`;
        }

        await supabase.from('notifications').insert([{
            type,
            title,
            message,
            service: data.service === 'gestion' ? 'gestion_immobiliere' : data.service,
            created_by_name: 'Système'
        }]);
    }

    return true;
}

// -- Interactions API --
export const fetchInteractions = async (contactId?: number): Promise<Interaction[]> => {
    let query = supabase.from('interactions').select('*');
    if (contactId) query = query.eq('contact_id', contactId);
    
    const { data, error } = await query.order('date', { ascending: false });
    if (error) { console.error('Error fetching interactions:', error); return []; }
    
    return data.map(d => ({
        id: d.id,
        contactId: d.contact_id,
        type: d.type,
        title: d.title,
        description: d.description || '',
        date: d.date,
        heure: d.heure,
        agent: d.agent,
        lieu: d.lieu || '',
        issue: d.issue || '',
        technician: d.technician || ''
    }));
}

export const createInteractionApi = async (interaction: Omit<Interaction, 'id'>): Promise<Interaction | null> => {
    console.log('[API] createInteractionApi START - Payload:', interaction);
    const dbInteraction = {
        contact_id: interaction.contactId,
        type: interaction.type,
        title: interaction.title,
        description: interaction.description,
        date: interaction.date,
        heure: interaction.heure,
        agent: interaction.agent,
        lieu: interaction.lieu,
        issue: interaction.issue,
        technician: interaction.technician
    };
    
    try {
        const { data, error } = await supabase.from('interactions').insert([dbInteraction]).select();
        
        if (error) {
            console.error('[API] createInteractionApi SQL ERROR:', error.message, error.details);
            return null;
        }

        if (!data || data.length === 0) {
            console.warn('[API] createInteractionApi - No data returned from insert');
            return null;
        }

        const saved = data[0];
        console.log('[API] createInteractionApi SUCCESS:', saved);
        
        // Notification hiérarchie si c'est un agent
        if (['rdv', 'visite_terrain', 'visite_chantier'].includes(saved.type)) {
            let typeLabel = 'Rendez-vous';
            if (saved.type === 'visite_terrain') typeLabel = 'Visite de terrain';
            else if (saved.type === 'visite_chantier') typeLabel = 'Visite de chantier';

            // Récupérer le nom du prospect pour un message plus clair
            const { data: contact } = await supabase
                .from('contacts')
                .select('name')
                .eq('id', saved.contact_id)
                .single();

            const prospectName = contact?.name || 'un prospect';
            const message = `L'agent ${saved.agent} a fixé un nouveau ${typeLabel} avec ${prospectName} pour le ${saved.date} à ${saved.heure}.`;
            
            await notifyHierarchy(saved.agent, `Nouveau RDV fixé : ${saved.title}`, message, 'immobilier');
        }

        return {
            id: saved.id,
            contactId: saved.contact_id,
            type: saved.type,
            title: saved.title,
            description: saved.description || '',
            date: saved.date,
            heure: saved.heure,
            agent: saved.agent,
            lieu: saved.lieu || '',
            issue: saved.issue || '',
            technician: saved.technician || ''
        };
    } catch (err) {
        console.error('[API] createInteractionApi CRASH:', err);
        return null;
    }
}

// -- Hierarchy Notifications Helper --
const notifyHierarchy = async (agentName: string, title: string, message: string, service?: string) => {
    try {
        // 1. Trouver le profil de l'agent
        const { data: agentProfile } = await supabase
            .from('profiles')
            .select('id, role, parent_id')
            .eq('name', agentName)
            .single();

        if (!agentProfile || agentProfile.role !== 'commercial') return;

        // 2. Identifier les destinataires (Directeur Commercial + Manager)
        const recipients = new Set<string>();

        // Ajouter le manager direct
        if (agentProfile.parent_id) {
            recipients.add(agentProfile.parent_id);
        }

        // Ajouter tous les Directeurs Commerciaux
        const { data: directors } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'dir_commercial');

        if (directors) {
            directors.forEach(d => recipients.add(d.id));
        }

        // 3. Envoyer les notifications
        if (recipients.size > 0) {
            const notifications = Array.from(recipients).map(uid => ({
                type: 'rdv' as const,
                title,
                message,
                assigned_to: uid,
                service: service === 'gestion' ? 'gestion_immobiliere' : (service || 'immobilier')
            }));

            await supabase.from('notifications').insert(notifications);
        }
    } catch (err) {
        console.error('[notifyHierarchy] Error:', err);
    }
};

// -- Visits API --
export const fetchVisits = async (contactId?: number): Promise<Visit[]> => {
    let query = supabase.from('visits').select('*');
    if (contactId) query = query.eq('contact_id', contactId);
    
    const { data, error } = await query.order('date', { ascending: false });
    if (error) { console.error('Error fetching visits:', error); return []; }
    
    return data.map(d => ({
        id: d.id,
        title: d.title,
        contactId: d.contact_id,
        date: d.date,
        heure: d.heure,
        lieu: d.lieu,
        type: d.type,
        statut: d.statut,
        agent: d.agent,
        technician: d.technician || '',
        notes: d.notes || ''
    }));
}

export const createVisitApi = async (visit: Omit<Visit, 'id'>): Promise<Visit | null> => {
    console.log('[API] createVisitApi START - Payload:', visit);
    const dbVisit = {
        title: visit.title,
        contact_id: visit.contactId,
        date: visit.date,
        heure: visit.heure,
        lieu: visit.lieu,
        type: visit.type,
        statut: visit.statut,
        agent: visit.agent,
        technician: visit.technician,
        notes: visit.notes
    };
    
    try {
        const { data, error } = await supabase.from('visits').insert([dbVisit]).select();
        
        if (error) {
            console.error('[API] createVisitApi SQL ERROR:', error.message, error.details);
            return null;
        }

        if (!data || data.length === 0) {
            console.warn('[API] createVisitApi - No data returned');
            return null;
        }

        const saved = data[0];
        console.log('[API] createVisitApi SUCCESS:', saved);
        
        // 1. Notification à l'agent lui-même (existant)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('name', saved.agent)
            .single();

        let typeLabel = 'Visite';
        if (saved.type === 'terrain') typeLabel = 'Visite de terrain';
        else if (saved.type === 'chantier') typeLabel = 'Visite de chantier';
        else if (saved.type === 'bureau') typeLabel = 'RDV Bureau';

        // 1. Notification à l'agent lui-même : UNIQUEMENT SI ce n'est pas lui qui a créé l'action
        // (Pour l'instant on désactive l'auto-notification car l'agent sait ce qu'il vient de créer)
        /*
        await supabase.from('notifications').insert([{
            type: 'rdv',
            title: `Nouveau RDV : ${typeLabel}`,
            message: `"${saved.title}" prévu pour le ${saved.date} à ${saved.heure}.`,
            assigned_to: profile?.id,
            service: 'immobilier'
        }]);
        */

        // 2. Notification hiérarchie
        const { data: contact } = await supabase
            .from('contacts')
            .select('name')
            .eq('id', saved.contact_id)
            .single();

        const prospectName = contact?.name || 'un prospect';
        const hierMsg = `L'agent ${saved.agent} a fixé une nouvelle ${typeLabel} avec ${prospectName} pour le ${saved.date} à ${saved.heure}.`;
        
        await notifyHierarchy(saved.agent, `Nouvelle planification : ${saved.title}`, hierMsg, 'immobilier');

        return {
            id: saved.id,
            title: saved.title,
            contactId: saved.contact_id,
            date: saved.date,
            heure: saved.heure,
            lieu: saved.lieu,
            type: saved.type,
            statut: saved.statut,
            agent: saved.agent,
            technician: saved.technician || '',
            notes: saved.notes || ''
        };
    } catch (err) {
        console.error('[API] createVisitApi CRASH:', err);
        return null;
    }
}

export const updateVisitApi = async (id: number, updates: any): Promise<boolean> => {
    const dbUpdates: any = { ...updates };
    if (updates.contactId) {
        dbUpdates.contact_id = updates.contactId;
        delete dbUpdates.contactId;
    }
    const { error } = await supabase.from('visits').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating visit:', error); return false; }
    return true;
}

export const deleteVisitApi = async (id: number) => {
    const { error } = await supabase.from('visits').delete().eq('id', id);
    if (error) console.error('Error deleting visit:', error);
}

export const updateVisitStatusApi = async (id: number, statut: 'upcoming' | 'completed' | 'cancelled'): Promise<boolean> => {
    const { error } = await supabase.from('visits').update({ statut }).eq('id', id);
    if (error) { console.error('Error updating visit status:', error); return false; }
    return true;
}

// -- Follow Ups API --
export const fetchFollowUps = async (contactId?: number): Promise<FollowUp[]> => {
    let query = supabase.from('follow_ups').select('*');
    if (contactId) query = query.eq('contact_id', contactId);
    
    const { data, error } = await query.order('date_relance', { ascending: true });
    if (error) { console.error('Error fetching follow ups:', error); return []; }
    
    return data.map(d => ({
        id: d.id,
        contactId: d.contact_id,
        agent: d.agent,
        dateRelance: d.date_relance,
        heure: d.heure || '09:00',
        note: d.note || '',
        statut: d.statut,
        priorite: d.priorite,
        interactionId: d.interaction_id
    }));
}

export const createFollowUpApi = async (followUp: Omit<FollowUp, 'id'>): Promise<FollowUp | null> => {
    const dbFollowUp = {
        contact_id: followUp.contactId,
        agent: followUp.agent,
        date_relance: followUp.dateRelance,
        heure: followUp.heure,
        note: followUp.note,
        statut: followUp.statut,
        priorite: followUp.priorite,
        interaction_id: followUp.interactionId
    };
    
    const { data, error } = await supabase.from('follow_ups').insert([dbFollowUp]).select().single();
    if (error) { console.error('Error creating follow up:', error); return null; }
    
    return {
        id: data.id,
        contactId: data.contact_id,
        agent: data.agent,
        dateRelance: data.date_relance,
        heure: data.heure || '09:00',
        note: data.note || '',
        statut: data.statut,
        priorite: data.priorite,
        interactionId: data.interaction_id
    };
}

export const updateFollowUpStatusApi = async (id: string, statut: 'upcoming' | 'completed' | 'cancelled'): Promise<boolean> => {
    const { error } = await supabase.from('follow_ups').update({ statut }).eq('id', id);
    if (error) { console.error('Error updating follow up status:', error); return false; }
    return true;
}

export const updateFollowUpApi = async (id: string, updates: any): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.dateRelance) dbUpdates.date_relance = updates.dateRelance;
    if (updates.heure) dbUpdates.heure = updates.heure;
    if (updates.note !== undefined) dbUpdates.note = updates.note;
    if (updates.statut) dbUpdates.statut = updates.statut;
    if (updates.priorite) dbUpdates.priorite = updates.priorite;
    if (updates.agent) dbUpdates.agent = updates.agent;

    const { error } = await supabase.from('follow_ups').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating follow up:', error); return false; }
    return true;
}

export const deleteFollowUpApi = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('follow_ups').delete().eq('id', id);
    if (error) { console.error('Error deleting follow up:', error); return false; }
    return true;
}

export const fetchCommercials = async (service?: string, roles?: string | string[]) => {
    let query = supabase
        .from('profiles')
        .select('id, name, service, email, phone, role, parent_id, group_name');
    
    if (roles) {
        if (Array.isArray(roles)) {
            query = query.in('role', roles);
        } else {
            query = query.eq('role', roles);
        }
    }
    
    if (service) {
        query = query.eq('service', service);
    }
    
    const { data, error } = await query;
    if (error) {
        console.error('Error fetching commercials:', error);
        return [];
    }
    return data;
};

export type ProfileRow = {
    name: string;
    email?: string;
    phone?: string;
    role: 'commercial' | 'manager' | 'resp_commercial' | 'dir_commercial' | 'superviseur' | 'admin' | 'assistante' | 'conformite' | 'technicien_terrain' | 'technicien_chantier';
    service?: string;
    parent_id?: string;
    group_name?: string;
};

export const bulkInsertProfiles = async (profiles: ProfileRow[]): Promise<number> => {
    // We generate a UUID for each profile that does not have an auth account
    const rows = profiles.map(p => ({
        id: crypto.randomUUID(),
        name: p.name,
        email: p.email || null,
        phone: p.phone || null,
        role: p.role,
        service: p.service || null,
        parent_id: p.parent_id || null,
        group_name: p.group_name || null,
    }));

    const { data, error } = await supabase
        .from('profiles')
        .insert(rows)
        .select();

    if (error) {
        console.error('[bulkInsertProfiles] Error:', error);
        return 0;
    }
    return data?.length ?? 0;
};

export const bulkCreateInteractions = async (interactions: any[]): Promise<any[]> => {
    const dbInteractions = interactions.map(i => ({
        contact_id: i.contactId,
        type: i.type,
        title: i.title,
        description: i.description,
        date: i.date,
        heure: i.heure,
        agent: i.agent,
        lieu: i.lieu,
        technician: i.technician
    }));

    const { data, error } = await supabase.from('interactions').insert(dbInteractions).select();
    if (error) {
        console.error('[bulkCreateInteractions] ERROR:', error);
        return [];
    }
    return data || [];
};
