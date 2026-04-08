export type LandStatus = 'disponible' | 'vendu' | 'reserve';

export interface Lot {
    id: string;
    land_id: string;
    lot_number: string;
    surface: number;
    price: number;
    status: LandStatus;
}

export interface LandDocument {
    id: string;
    land_id: string;
    name: string;
    file_url: string;
    type: 'plan' | 'titre_foncier' | 'contrat' | 'titre' | 'autre';
    created_at: string;
}

export interface Land {
    id: string;
    title: string;
    description: string;
    price: number;
    status: LandStatus;
    location: string;
    surface: number;
    owner_name: 'Katos';
    image_url?: string;
    reference: string;
    legal_nature: string;
    lots?: Lot[];
    documents?: LandDocument[];
    assignedAgent?: string;
    created_at: string;
}

export interface LandFilters {
    status?: LandStatus;
    minPrice?: number;
    maxPrice?: number;
    agentId?: string;
}

export interface Villa {
    id: string;
    title: string;
    description: string;
    type: string;
    surface: number;
    price: number;
    status: 'disponible' | 'vendu' | 'reserve';
    location: string;
    image_url?: string;
    assignedAgent?: string;
    created_at: string;
}

export type ImmobilierType = 'achat' | 'location';

export interface ImmobilierBien {
    id: string;
    title: string;
    description: string;
    bien_type: ImmobilierType;
    surface: number;
    price: number;
    status: 'disponible' | 'vendu' | 'loue' | 'reserve';
    location: string;
    image_url?: string;
    assignedAgent?: string;
    owner_name?: string;
    created_at: string;
}

export interface ConstructionProject {
    id: string;
    contactId: number;
    villaModelId?: string; // Lien avec Villa.id
    progress: number; // % avancement
    photos: string[]; // Liste d'URLs d'images
    technicalIssues: string[]; // Problèmes signalés
    teamPlanning: string; // Planning des équipes
    deliveryDate: string; // Date de livraison prévue
    technicianName: string;
    status: 'en_cours' | 'bloque' | 'termine' | 'livre' | 'en_pause';
    created_at: string;
    updated_at: string;
}
