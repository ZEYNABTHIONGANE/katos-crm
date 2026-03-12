import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Villa } from '../types/land';

const MOCK_VILLAS: Villa[] = [
    {
        id: 'v1',
        title: 'Villa Zahra F3',
        description: 'Modèle F3 élégant et fonctionnel pour petite famille.',
        type: 'Villa Zahra F3',
        surface: 120,
        price: 25000000,
        status: 'disponible',
        location: 'Sénégal',
        assignedAgent: 'Omar Diallo',
        created_at: new Date().toISOString(),
    },
    {
        id: 'v2',
        title: 'Villa Kenza F3',
        description: 'Design moderne F3 optimisé pour le confort.',
        type: 'Villa Kenza F3',
        surface: 125,
        price: 27000000,
        status: 'disponible',
        location: 'Sénégal',
        assignedAgent: 'Abdou Sarr',
        created_at: new Date().toISOString(),
    },
    {
        id: 'v3',
        title: 'Villa Fatima F4',
        description: 'Villa F4 spacieuse idéale pour famille moyenne.',
        type: 'Villa Fatima F4',
        surface: 180,
        price: 45000000,
        status: 'disponible',
        location: 'Sénégal',
        assignedAgent: 'Omar Diallo',
        created_at: new Date().toISOString(),
    },
    {
        id: 'v4',
        title: 'Villa Amina F6',
        description: 'Grande villa F6 grand standing.',
        type: 'Villa Amina F6',
        surface: 350,
        price: 85000000,
        status: 'disponible',
        location: 'Sénégal',
        assignedAgent: 'Katos Admin',
        created_at: new Date().toISOString(),
    },
    {
        id: 'v5',
        title: 'Villa Aicha F6',
        description: 'Le summum du luxe en modèle F6.',
        type: 'Villa Aicha F6',
        surface: 380,
        price: 95000000,
        status: 'disponible',
        location: 'Sénégal',
        assignedAgent: 'Abdou Sarr',
        created_at: new Date().toISOString(),
    }
];

export const villaApi = {
    async getVillas(): Promise<Villa[]> {
        return MOCK_VILLAS;
    },
    async createVilla(villa: Partial<Villa>): Promise<Villa> {
        const newVilla = {
            ...villa,
            id: 'v' + Date.now(),
            created_at: new Date().toISOString(),
        } as Villa;
        MOCK_VILLAS.push(newVilla);
        return newVilla;
    },
    async updateVilla(id: string, updates: Partial<Villa>): Promise<Villa> {
        const index = MOCK_VILLAS.findIndex(v => v.id === id);
        if (index === -1) throw new Error('Villa not found');
        MOCK_VILLAS[index] = { ...MOCK_VILLAS[index], ...updates };
        return MOCK_VILLAS[index];
    },
    async deleteVilla(id: string): Promise<void> {
        const index = MOCK_VILLAS.findIndex(v => v.id === id);
        if (index !== -1) MOCK_VILLAS.splice(index, 1);
    }
};

export const useVillas = () => {
    return useQuery({
        queryKey: ['villas'],
        queryFn: () => villaApi.getVillas(),
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
