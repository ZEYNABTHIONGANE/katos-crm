import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Villa } from '../types/land';
import { supabase } from '../../../lib/supabaseClient';

export const villaApi = {
    async getVillas(): Promise<Villa[]> {
        const { data, error } = await supabase
            .from('villas')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching villas:', error);
            throw error;
        }
        return (data || []).map(d => ({
            ...d,
            assignedAgent: d.assigned_agent
        })) as Villa[];
    },

    async createVilla(villa: Partial<Villa>): Promise<Villa> {
        // Clean and sanitize data
        const dbVilla: any = {
            title: (villa.title || '').trim(),
            description: (villa.description || '').trim(),
            type: (villa.type || '').trim(),
            surface: villa.surface ? Math.round(Number(villa.surface)) : 0,
            price: villa.price ? Math.round(Number(villa.price)) : 0,
            status: 'disponible',
            location: 'Sénégal',
            image_url: villa.image_url || null
        };

        const imageLength = dbVilla.image_url?.length || 0;
        console.log('[villaApi] Image size:', (imageLength / 1024).toFixed(2), 'KB');
        
        // Si l'image est trop lourde (> 1Mo), on prévient car ça risque de bloquer Supabase
        if (imageLength > 1000000) {
            console.warn('[villaApi] Image too large (> 1MB). Attempting anyway, but may hang.');
        }

        console.log('[villaApi] Sending to Supabase...');
        
        try {
            console.log('[villaApi] Inserting into villas table...');
            const { data, error: insertError } = await supabase
                .from('villas')
                .insert([dbVilla])
                .select()
                .single();
            
            if (insertError) {
                console.error('[villaApi] Supabase insert error:', insertError);
                throw insertError;
            }
            
            console.log('[villaApi] Insert success:', data?.id);
            return {
                ...(data || {}),
                assignedAgent: data?.assigned_agent
            } as Villa;

        } catch (err: any) {
            console.error('[villaApi] Fatal error in createVilla:', err);
            throw err;
        }
    },

    async updateVilla(id: string, updates: Partial<Villa>): Promise<Villa> {
        const { assignedAgent, id: _, ...restUpdates } = updates as any;
        const dbUpdates: any = { ...restUpdates };

        if (dbUpdates.surface !== undefined) {
            dbUpdates.surface = dbUpdates.surface ? Math.round(Number(dbUpdates.surface)) : 0;
        }
        if (dbUpdates.price !== undefined) {
            dbUpdates.price = dbUpdates.price ? Math.round(Number(dbUpdates.price)) : 0;
        }

        console.log('[villaApi] Updating villa:', id, dbUpdates);
        
        try {
            const { error } = await supabase
                .from('villas')
                .update(dbUpdates)
                .eq('id', id);
            
            if (error) {
                console.error('[villaApi] Supabase error updating villa:', error);
                throw error;
            }

            console.log('[villaApi] Villa updated successfully');
            
            return {
                id,
                ...dbUpdates
            } as any;
        } catch (err) {
            console.error('[villaApi] Unexpected error in updateVilla:', err);
            throw err;
        }
    },

    async deleteVilla(id: string): Promise<void> {
        const { error } = await supabase
            .from('villas')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting villa:', error);
            throw error;
        }
    }
};

export const useVillas = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['villas'],
        queryFn: () => villaApi.getVillas(),
        ...options
    });
};

export const useCreateVilla = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (villa: Partial<Villa>) => villaApi.createVilla(villa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['villas'] });
        },
    });
};

export const useUpdateVilla = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Villa> }) =>
            villaApi.updateVilla(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['villas'] });
        },
    });
};

export const useDeleteVilla = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => villaApi.deleteVilla(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['villas'] });
        },
    });
};
