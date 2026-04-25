
/**
 * Utility to determine which agents are under the supervision of a given user.
 * 
 * Rules:
 * - Admin/Dir Commercial/Superviseur: null (sees everything)
 * - Responsable Commercial (RC): Themselves + all Commercials where parent_id == RC_id
 * - Commercial: Only themselves
 */

export interface UserProfile {
    id: string;
    name: string;
    role?: string;
    parent_id?: string | null;
}

export const getSupervisedAgentNames = (
    currentUser: UserProfile | null, 
    allAgents: UserProfile[]
): string[] | null => {
    if (!currentUser) return [];

    const role = currentUser.role || '';

    // 1. Full access roles
    if (['admin', 'dir_commercial', 'superviseur', 'conformite'].includes(role)) {
        return null; // Signals total visibility
    }

    // Recursive helper to get all descendant names
    const getAllDescendantNames = (parentId: string): string[] => {
        const directChildren = allAgents.filter(a => a.parent_id === parentId);
        let names = directChildren.map(a => a.name || 'Utilisateur inconnu');
        
        directChildren.forEach(child => {
            if (child.id) {
                names = [...names, ...getAllDescendantNames(child.id)];
            }
        });
        
        return names;
    };

    // 2. Responsable Commercial (RC) / Manager
    if (role === 'resp_commercial' || role === 'manager') {
        const descendantNames = getAllDescendantNames(currentUser.id);
        return [currentUser.name || 'Utilisateur', ...descendantNames];
    }

    // 3. Default / Commercial / Assistante
    return [currentUser.name || 'Utilisateur'];
};
