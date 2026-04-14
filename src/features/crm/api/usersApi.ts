import { supabase } from '@/lib/supabaseClient';
import type { UserRole, UserService } from '@/app/providers/AuthProvider';

export type AgentData = {
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    service: UserService | null;
    parent_id?: string | null;
    group_name?: string;
    phone?: string;
};

export const manageAgentAccount = async (action: 'create' | 'update' | 'delete', userData: AgentData) => {
    try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
            body: { action, userData }
        });

        if (error) {
            console.error(`Error in ${action} agent:`, error);
            throw error;
        }

        return data;
    } catch (err: any) {
        console.error(`Exception in ${action} agent:`, err);
        throw err;
    }
};

export const deleteAgentAccount = async (id: string) => {
    return manageAgentAccount('delete', { id } as any);
};

/**
 * Version de secours si la Edge Function n'est pas déployée
 * Ne permet que la création via signUp (avec auto-déconnexion possible si mal configuré)
 */
export const fallbackCreateAgent = async (userData: AgentData) => {
    if (!userData.password) throw new Error("Le mot de passe est requis pour la création.");

    const { data, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                name: userData.name,
            }
        }
    });

    if (authError) throw authError;
    if (!data.user) throw new Error("Utilisateur non créé");

    // Créer le profil manuellement
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: data.user.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            service: userData.service,
            parent_id: userData.parent_id,
            group_name: userData.group_name,
            phone: userData.phone
        }]);

    if (profileError) throw profileError;

    return data.user;
};

export const fetchPotentialManagers = async (role: UserRole) => {
    let targetRoles: UserRole[] = [];
    
    if (role === 'commercial') {
        targetRoles = ['manager', 'resp_commercial'];
    } else if (role === 'manager') {
        targetRoles = ['resp_commercial', 'dir_commercial'];
    } else if (role === 'resp_commercial') {
        targetRoles = ['dir_commercial', 'superviseur'];
    }

    if (targetRoles.length === 0) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('role', targetRoles);

    if (error) {
        console.error('Error fetching potential managers:', error);
        return [];
    }

    return data;
};
