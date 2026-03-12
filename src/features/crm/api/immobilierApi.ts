import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImmobilierBien } from '../types/land';

const MOCK_BIENS: ImmobilierBien[] = [
    {
        id: 'immo1',
        title: 'Appartement 3 pièces - Plateau',
        description: 'Bel appartement rénové au cœur du Plateau, vue sur mer.',
        bien_type: 'location',
        surface: 90,
        price: 350000,
        status: 'disponible',
        location: 'Dakar Plateau',
        assignedAgent: 'Omar Diallo',
        created_at: new Date().toISOString(),
    },
    {
        id: 'immo2',
        title: 'Villa 5 chambres - Almadies',
        description: 'Grande villa avec piscine, idéale pour famille ou entreprise.',
        bien_type: 'achat',
        surface: 400,
        price: 150000000,
        status: 'disponible',
        location: 'Almadies, Dakar',
        assignedAgent: 'Abdou Sarr',
        created_at: new Date().toISOString(),
    },
    {
        id: 'immo3',
        title: 'Bureau 120m² - Point E',
        description: 'Espace bureau lumineux au rez-de-chaussée avec parking.',
        bien_type: 'location',
        surface: 120,
        price: 600000,
        status: 'disponible',
        location: 'Point E, Dakar',
        assignedAgent: 'Omar Diallo',
        created_at: new Date().toISOString(),
    },
    {
        id: 'immo4',
        title: 'Appartement 2 pièces - Mermoz',
        description: 'Studio moderne meublé dans résidence sécurisée.',
        bien_type: 'location',
        surface: 55,
        price: 200000,
        status: 'disponible',
        location: 'Mermoz, Dakar',
        assignedAgent: 'Katos Admin',
        created_at: new Date().toISOString(),
    },
    {
        id: 'immo5',
        title: 'Villa duplex - Ngor',
        description: 'Duplex de luxe avec terrasse et accès plage.',
        bien_type: 'achat',
        surface: 320,
        price: 95000000,
        status: 'disponible',
        location: 'Ngor, Dakar',
        assignedAgent: 'Omar Diallo',
        created_at: new Date().toISOString(),
    },
];

export const immobilierApi = {
    async getBiens(): Promise<ImmobilierBien[]> {
        return MOCK_BIENS;
    },
    async createBien(bien: Partial<ImmobilierBien>): Promise<ImmobilierBien> {
        const newBien = {
            ...bien,
            id: 'immo' + Date.now(),
            created_at: new Date().toISOString(),
        } as ImmobilierBien;
        MOCK_BIENS.push(newBien);
        return newBien;
    },
    async updateBien(id: string, updates: Partial<ImmobilierBien>): Promise<ImmobilierBien> {
        const index = MOCK_BIENS.findIndex(b => b.id === id);
        if (index === -1) throw new Error('Bien not found');
        MOCK_BIENS[index] = { ...MOCK_BIENS[index], ...updates };
        return MOCK_BIENS[index];
    },
    async deleteBien(id: string): Promise<void> {
        const index = MOCK_BIENS.findIndex(b => b.id === id);
        if (index !== -1) MOCK_BIENS.splice(index, 1);
    }
};

export const useImmobilierBiens = () => {
    return useQuery({
        queryKey: ['immobilier-biens'],
        queryFn: () => immobilierApi.getBiens(),
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
