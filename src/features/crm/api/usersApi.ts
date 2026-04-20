import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import type { UserRole, UserService } from '@/app/providers/AuthProvider';

export type AgentData = {
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    service?: UserService | null;
    parent_id?: string | null;
    group_name?: string;
    phone?: string;
};

export const manageAgentAccount = async (action: 'create' | 'update' | 'delete', userData: AgentData) => {
    try {
        const invokePromise = supabase.functions.invoke('manage-users', {
            body: { action, userData }
        });

        // Timeout de 15 secondes pour éviter le blocage infini
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout : Le serveur met trop de temps à répondre. Tentative de mise à jour directe...")), 25000)
        );

        const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

            if (error) {
                let errorMessage = error.message;
                
                // Si c'est une erreur HTTP de la fonction, on essaie de voir s'il y a un message JSON
                if (error instanceof Error && 'context' in error) {
                    try {
                        const ctx = (error as any).context;
                        if (ctx && typeof ctx.json === 'function') {
                            const body = await ctx.json();
                            if (body && body.error) errorMessage = body.error;
                        }
                    } catch (e) {
                        // Ignorer l'erreur d'analyse
                    }
                }
                
                console.error(`Error details:`, error);
                throw new Error(errorMessage);
            }
    
            return data;
        } catch (err: any) {
            console.error(`Exception in ${action} agent:`, err);
            throw new Error(err.message || "Une erreur inconnue est survenue");
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
    // Créer un client temporaire qui ne stocke PAS la session
    const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    );

    let userId: string;

    // 1. Tentative de création
    const { data, error: authError } = await tempClient.auth.signUp({
        email: userData.email,
        password: userData.password || 'TemporaryPassword123!',
        options: { data: { name: userData.name } }
    });

    if (authError) {
        // Si l'utilisateur existe déjà, on ne peut pas récupérer l'ID avec la clé anonyme
        // Mais dans ce cas, le profil existe peut-être déjà ou va être écrasé par l'upsert si on avait l'ID.
        // Malheureusement, sans Service Role Key côté client (trop risqué), on doit s'arrêter là si le signUp échoue.
        // SAUF si l'authError est "User already registered", on prévient l'utilisateur.
        throw authError;
    } else if (data.user) {
        userId = data.user.id;
    } else {
        throw new Error("Utilisateur non créé");
    }

    // 2. Créer ou Mettre à jour le profil (UPSERT automatique)
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
            id: userId,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            service: userData.service,
            parent_id: userData.parent_id,
            group_name: userData.group_name,
            phone: userData.phone
        }], { onConflict: 'id' });

    if (profileError) throw profileError;

    return data.user;
};

export const fetchPotentialManagers = async (role: UserRole) => {
    let targetRoles: UserRole[] = [];
    
    if (role === 'commercial') {
        targetRoles = ['resp_commercial'];
    } else if (role === 'resp_commercial') {
        targetRoles = ['dir_commercial'];
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

export const fallbackUpdateProfile = async (userData: AgentData) => {
    if (!userData.id) throw new Error("ID manquant pour la mise à jour");

    const { error } = await supabase
        .from('profiles')
        .update({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            service: userData.service,
            parent_id: userData.parent_id,
            group_name: userData.group_name
        })
        .eq('id', userData.id);

    if (error) throw error;
    return { success: true };
};
