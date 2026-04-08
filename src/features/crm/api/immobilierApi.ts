import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImmobilierBien } from '../types/land';
import { supabase } from '../../../lib/supabaseClient';

export const immobilierApi = {
    async getBiens(): Promise<ImmobilierBien[]> {
        const { data, error } = await supabase
            .from('immobilier_biens')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching immobilier biens:', error);
            throw error;
        }
        return (data || []).map(d => ({
            ...d,
            assignedAgent: d.assigned_agent
        })) as ImmobilierBien[];
    },

    async createBien(bien: Partial<ImmobilierBien>): Promise<ImmobilierBien> {
        const { assignedAgent, ...bienData } = bien;

        const { data, error } = await supabase
            .from('immobilier_biens')
            .insert([{
                ...bienData,
                assigned_agent: assignedAgent,
                owner_name: bien.owner_name
            }])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating immobilier bien:', error);
            throw error;
        }
        
        const d = data;
        return {
            ...d,
            assignedAgent: d.assigned_agent
        } as ImmobilierBien;
    },

    async updateBien(id: string, updates: Partial<ImmobilierBien>): Promise<ImmobilierBien> {
        const { assignedAgent, ...bienUpdates } = updates;
        

        const { data, error } = await supabase
            .from('immobilier_biens')
            .update({
                ...bienUpdates,
                assigned_agent: assignedAgent,
                owner_name: updates.owner_name
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating immobilier bien:', error);
            throw error;
        }

        // Notification: Bien Loué ou Vendu
        if (bienUpdates.status === 'loue' || bienUpdates.status === 'vendu') {
            const isRental = bienUpdates.status === 'loue';
            await supabase.from('notifications').insert([{
                type: isRental ? 'info' : 'client',
                title: isRental ? 'Bien Loué' : 'Bien Vendu',
                message: `Le bien "${data.title}" est désormais ${isRental ? 'loué' : 'vendu'}.`,
                service: 'gestion_immobiliere'
            }]);
        }
        
        const d = data;
        return {
            ...d,
            assignedAgent: d.assigned_agent
        } as ImmobilierBien;
    },

    async deleteBien(id: string): Promise<void> {
        const { error } = await supabase
            .from('immobilier_biens')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting immobilier bien:', error);
            throw error;
        }
    }
};

export const useImmobilierBiens = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['immobilier-biens'],
        queryFn: () => immobilierApi.getBiens(),
        ...options
    });
};

export const useCreateImmobilierBien = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (bien: Partial<ImmobilierBien>) => immobilierApi.createBien(bien),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['immobilier-biens'] });
        },
    });
};

export const useUpdateImmobilierBien = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<ImmobilierBien> }) =>
            immobilierApi.updateBien(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['immobilier-biens'] });
        },
    });
};

export const useDeleteImmobilierBien = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => immobilierApi.deleteBien(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['immobilier-biens'] });
        },
    });
};
