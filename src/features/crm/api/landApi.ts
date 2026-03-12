import { supabase } from '@/lib/supabaseClient';
import type { Land, LandFilters } from '../types/land';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const MOCK_LANDS: Land[] = [
    {
        id: '1',
        title: 'Terrain 500m² - Diamniadio',
        description: 'Parcelle viabilisée en zone franche, idéale pour investissement.',
        price: 15000000,
        surface: 500,
        location: 'Diamniadio, Dakar',
        status: 'disponible',
        reference: 'REF-TR-001',
        legal_nature: 'Titre Foncier',
        owner_name: 'Katos',
        assignedAgent: 'Abdou Sarr',
        created_at: new Date().toISOString()
    }
];

export const landApi = {
    async getLands(filters?: LandFilters) {
        try {
            let query = supabase
                .from('properties')
                .select('*')
                .eq('type', 'terrain_katos');

            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.minPrice) query = query.gte('price', filters.minPrice);
            if (filters?.maxPrice) query = query.lte('price', filters.maxPrice);

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error || !data || data.length === 0) {
                return MOCK_LANDS;
            }

            return (data as any) as Land[];
        } catch (err) {
            return MOCK_LANDS;
        }
    },

    async getLandById(id: string) {
        const { data, error } = await supabase
            .from('properties')
            .select(`
                *,
                lots(*),
                documents(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            const mock = MOCK_LANDS.find(p => p.id === id);
            if (mock) return mock;
            throw error;
        }
        return data as Land;
    },

    async createLand(land: Partial<Land>) {
        const { lots, documents, ...landData } = land;

        const { data, error } = await supabase
            .from('properties')
            .insert([{ ...landData, type: 'terrain_katos', category: 'terrain' }])
            .select()
            .single();

        if (error) throw error;
        const newLand = data as Land;

        // Insert related lots if any
        if (lots && lots.length > 0) {
            await supabase.from('lots').insert(
                lots.map(lot => ({ ...lot, property_id: newLand.id }))
            );
        }

        // Insert related documents if any
        if (documents && documents.length > 0) {
            await supabase.from('documents').insert(
                documents.map(doc => ({ ...doc, property_id: newLand.id }))
            );
        }

        return newLand;
    },

    async updateLand(id: string, updates: Partial<Land>) {
        const { lots, documents, ...landUpdates } = updates;

        const { data, error } = await supabase
            .from('properties')
            .update(landUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Sync lots (simple replace strategy for now)
        if (lots) {
            await supabase.from('lots').delete().eq('property_id', id);
            if (lots.length > 0) {
                await supabase.from('lots').insert(
                    lots.map(lot => ({ ...lot, property_id: id }))
                );
            }
        }

        // Sync documents
        if (documents) {
            await supabase.from('documents').delete().eq('property_id', id);
            if (documents.length > 0) {
                await supabase.from('documents').insert(
                    documents.map(doc => ({ ...doc, property_id: id }))
                );
            }
        }

        return data as Land;
    }

};

export const useLands = (filters?: LandFilters) => {
    return useQuery({
        queryKey: ['lands', filters],
        queryFn: () => landApi.getLands(filters)
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
