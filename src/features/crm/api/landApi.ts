import { supabase } from '../../../lib/supabaseClient';
import type { Land, LandFilters } from '../types/land';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const landApi = {
    async getLands(filters?: LandFilters): Promise<Land[]> {
        let query = supabase
            .from('lands')
            .select(`
                *,
                lots(*)
            `);

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.minPrice) query = query.gte('price', filters.minPrice);
        if (filters?.maxPrice) query = query.lte('price', filters.maxPrice);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching lands:', error);
            throw error;
        }

        return (data || []).map(d => ({
            ...d,
            assignedAgent: d.assigned_agent
        })) as Land[];
    },

    async getLandById(id: string): Promise<Land> {
        const { data, error } = await supabase
            .from('lands')
            .select(`
                *,
                lots(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching land by id:', error);
            throw error;
        }
        
        const d = data;
        return {
            ...d,
            assignedAgent: d.assigned_agent
        } as Land;
    },

    async createLand(land: Partial<Land>): Promise<Land> {
        const { lots, documents, assignedAgent, ...landData } = land;

        const { data, error } = await supabase
            .from('lands')
            .insert([landData])
            .select()
            .single();

        if (error) {
            console.error('Error creating land:', error);
            throw error;
        }
        const newLand = {
            ...data,
            assignedAgent: data.assigned_agent
        } as Land;

        // Insert related lots if any
        if (lots && lots.length > 0) {
            const { error: lotError } = await supabase.from('lots').insert(
                lots.map(lot => ({ ...lot, land_id: newLand.id }))
            );
            if (lotError) console.error('Error creating lots:', lotError);
        }

        return newLand;
    },

    async updateLand(id: string, updates: Partial<Land>): Promise<Land> {
        const { lots, documents, assignedAgent, ...landUpdates } = updates;

        const { data, error } = await supabase
            .from('lands')
            .update(landUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating land:', error);
            throw error;
        }

        // Notification: Vente de terrain (si le statut passe à 'vendu')
        if (landUpdates.status === 'vendu') {
            await supabase.from('notifications').insert([{
                type: 'client',
                title: 'Terrain Vendu !',
                message: `Le terrain "${data.title}" est désormais vendu.`,
                service: 'foncier'
            }]);
        }

        // Sync lots (simple replace strategy)
        if (lots) {
            await supabase.from('lots').delete().eq('land_id', id);
            if (lots.length > 0) {
                const { error: lotError } = await supabase.from('lots').insert(
                    lots.map(lot => {
                        const { id: _, ...lotData } = lot as any;
                        return { ...lotData, land_id: id };
                    })
                );
                if (lotError) console.error('Error updating lots:', lotError);
            }
        }

        const d = data;
        return {
            ...d,
            assignedAgent: d.assigned_agent
        } as Land;
    },

    async deleteLand(id: string): Promise<void> {
        const { error } = await supabase
            .from('lands')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting land:', error);
            throw error;
        }
    }
};

export const useLands = (filters?: LandFilters, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['lands', filters],
        queryFn: () => landApi.getLands(filters),
        ...options
    });
};

export const useLand = (id: string) => {
    return useQuery({
        queryKey: ['land', id],
        queryFn: () => landApi.getLandById(id),
        enabled: !!id
    });
};

export const useCreateLand = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (land: Partial<Land>) => landApi.createLand(land),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lands'] });
        }
    });
};

export const useUpdateLand = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Land> }) =>
            landApi.updateLand(id, updates),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['lands'] });
            queryClient.invalidateQueries({ queryKey: ['land', data.id] });
        }
    });
};

export const useDeleteLand = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => landApi.deleteLand(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lands'] });
        }
    });
};
