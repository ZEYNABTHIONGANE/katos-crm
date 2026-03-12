import { create } from 'zustand';
import type { ServiceType } from '../features/crm/components/ServiceSelector';

// ─── Status → Column map ─────────────────────────────────────────────
export const STATUS_TO_COLUMN: Record<string, string> = {
    'Prospect': 'nouveau',
    'En Qualification': 'qualification',
    'RDV / Visite Terrain': 'rdv',
    'Client': 'client',
    'Projet Livré': 'livre',
};

// ─── Shared Types ────────────────────────────────────────────────────────
export interface CrmDocument {
    id: string;
    name: string;
    type: 'contrat' | 'plan' | 'devis' | 'facture' | 'reservation' | 'autre';
    url: string;
    version: number;
    versions: { version: number; url: string; createdAt: string; notes?: string }[];
    contactId: number;
    projectId?: string;
    createdAt: string;
    updatedAt: string;
    size: string;
    fileType: string;
}

export interface CrmContact {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    status: string;
    address: string;
    country: string;
    source: string;
    service?: ServiceType;
    propertyId?: string;
    propertyTitle?: string;
    lastAction: string;
    budget: string;
    notes: string;
    assignedAgent: string;
}

export interface FollowUp {
    id: string;
    contactId: number;
    agent: string;
    dateRelance: string; // ISO string YYYY-MM-DD
    note: string;
    statut: 'retard' | 'today' | 'upcoming' | 'done';
    priorite: 'haute' | 'normale' | 'basse';
    interactionId?: string; // Link to the interaction that created this relance
}

export type InteractionType = 'call' | 'email' | 'rdv' | 'visite_terrain' | 'visite_chantier' | 'note';

export interface Interaction {
    id: string;
    contactId: number;
    type: InteractionType;
    title: string;
    description: string;
    date: string;
    heure: string;
    agent: string;
    lieu?: string; // For RDV and visits
    issue?: string; // Follow-up action description
    executionStatus: 'fait' | 'a_faire';
    technician?: string;
}

export interface Visit {
    id: number;
    title: string;
    contactId: number;
    date: string;
    heure: string;
    lieu: string;
    type: 'terrain' | 'chantier' | 'bureau';
    statut: 'upcoming' | 'today' | 'completed';
    agent: string;
    technician?: string;
    notes: string;
}

export interface ConstructionProject {
    id: string;
    contactId: number;
    villaModelId?: string;
    progress: number;
    photos: string[];
    technicalIssues: string[];
    teamPlanning: string;
    deliveryDate: string;
    technicianName: string;
    status: 'en_cours' | 'termine' | 'en_pause';
    created_at: string;
    updated_at: string;
}

// ─── Initial data ─────────────────────────────────────────────────────
const fmt = (d: Date) => d.toISOString().split('T')[0];
const today = new Date();
const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

const initialInteractions: Interaction[] = [
    { id: 'int1', contactId: 1, type: 'call', title: 'Appel de qualification', date: '2026-03-05', heure: '14:30', agent: 'Abdou Sarr', description: 'Discussion sur le budget et les préférences de zone.', executionStatus: 'fait' },
    { id: 'int2', contactId: 1, type: 'email', title: 'Envoi catalogue', date: '2026-03-04', heure: '09:15', agent: 'Abdou Sarr', description: 'Brochure PDF des terrains disponibles envoyée par email.', executionStatus: 'fait' },
    { id: 'int3', contactId: 2, type: 'visite_terrain', title: 'Visite terrain - Almadies Phase 2', date: '2026-03-06', heure: '15:30', agent: 'Abdou Sarr', description: "Visite de la parcelle Lot 22. Cliente très intéressée.", issue: 'Envoi proposition de prix prévue le 10 Mar.', executionStatus: 'fait' },
];

const initialDocuments: CrmDocument[] = [
    {
        id: 'doc1',
        name: 'Contrat Construction Villa Prestige',
        type: 'contrat',
        url: '#',
        version: 1,
        versions: [{ version: 1, url: '#', createdAt: '2026-02-10' }],
        contactId: 5,
        projectId: 'cp1',
        createdAt: '2026-02-10',
        updatedAt: '2026-02-10',
        size: '1.2 MB',
        fileType: 'pdf'
    },
    {
        id: 'doc2',
        name: 'Plan Architecture - Vue de face',
        type: 'plan',
        url: '#',
        version: 1,
        versions: [{ version: 1, url: '#', createdAt: '2026-02-12' }],
        contactId: 5,
        projectId: 'cp1',
        createdAt: '2026-02-12',
        updatedAt: '2026-02-12',
        size: '4.5 MB',
        fileType: 'dwg'
    }
];

const initialContacts: CrmContact[] = [
    { id: 1, name: 'Moussa Diop', company: 'SCAC Sénégal', email: 'm.diop@scac.sn', phone: '+221 77 123 45 67', status: 'Client', address: '12 Avenue Léopold Sédar Senghor', country: 'Sénégal', source: 'Recommandation', service: 'foncier', propertyId: '1', propertyTitle: 'Terrain 500m² - Diamniadio', lastAction: 'Livraison phase 1', budget: '80M FCFA', notes: 'Client très intéressé par le projet Résidence Horizon.', assignedAgent: 'Abdou Sarr' },
    { id: 2, name: 'Awa Ndiaye', company: 'Particulier', email: 'awa.nd@gmail.com', phone: '+221 76 987 65 43', status: 'Prospect', address: 'Quartier des Almadies', country: 'Sénégal', source: 'Facebook', service: 'construction', propertyId: 'v1', propertyTitle: 'Villa Prestige R+1', lastAction: 'Appel de qualification', budget: 'NC', notes: 'Cherche une villa R+1 aux Almadies.', assignedAgent: 'Omar Diallo' },
    { id: 3, name: 'Cheikh Fall', company: 'BTP Construction', email: 'c.fall@btp.sn', phone: '+221 77 555 11 22', status: 'En Qualification', address: 'Zone Franche, Diamniadio', country: 'Sénégal', source: 'LinkedIn', service: 'foncier', lastAction: 'Envoi devis', budget: '25M FCFA', notes: 'Intéressé par des terrains à Diamniadio.', assignedAgent: 'Abdou Sarr' },
    { id: 4, name: 'Fatou Sow', company: 'Particulier', email: 'fsow.pro@yahoo.fr', phone: '+221 78 444 99 88', status: 'Prospect', address: 'Quartier Mermoz', country: 'Sénégal', source: 'Instagram', service: 'gestion_immobiliere', propertyId: 'immo1', propertyTitle: 'Appartement 3 pièces - Plateau', lastAction: 'Visite terrain planifiée', budget: '15M FCFA', notes: 'Intéressée par la location.', assignedAgent: 'Omar Diallo' },
    { id: 5, name: 'Entreprise ABC', company: 'Groupe ABC', email: 'contact@abc-sn.com', phone: '+221 33 800 00 00', status: 'Client', address: 'Immeuble ABC, Rue de Thiong', country: 'Sénégal', source: 'Site web', service: 'construction', propertyId: 'v3', propertyTitle: 'Villa Duplex Premium', lastAction: 'Signature contrat', budget: '120M FCFA', notes: 'Projet résidentiel de 20 logements en cours.', assignedAgent: 'Katos Admin' },
    { id: 6, name: 'Ibou Thiam', company: 'Particulier', email: 'ibou.thiam@hotmail.com', phone: '+221 70 111 22 33', status: 'Projet Livré', address: 'Résidence Saly 2', country: 'Sénégal', source: 'Recommandation', lastAction: 'Remise des clés', budget: '45M FCFA', notes: 'Projet livré en Janvier 2026. Client satisfait.', assignedAgent: 'Omar Diallo' },
];

const initialFollowUps: FollowUp[] = [
    { id: 'r1', contactId: 2, agent: 'Abdou Sarr', dateRelance: addDays(-3), note: "Rappeler pour confirmation de la visite Almadies.", statut: 'retard', priorite: 'haute' },
    { id: 'r2', contactId: 3, agent: 'Omar Diallo', dateRelance: addDays(-1), note: "Relance devis envoyé le 1er mars.", statut: 'retard', priorite: 'haute' },
    { id: 'r3', contactId: 4, agent: 'Abdou Sarr', dateRelance: fmt(today), note: 'Suite visite terrain Mermoz.', statut: 'today', priorite: 'haute' },
];

const initialVisites: Visit[] = [
    { id: 1, title: 'Visite parcelle Almadies Phase 2', contactId: 2, date: addDays(1), heure: '10:00', lieu: 'Lot 22 - Almadies Phase 2, Dakar', type: 'terrain', statut: 'upcoming', agent: 'Abdou Sarr', notes: 'Cliente cherche un terrain de 300m² minimum.' },
    { id: 2, title: 'Visite chantier Résidence Horizon', contactId: 1, date: fmt(today), heure: '09:00', lieu: 'Chantier Résidence Horizon, Plateau', type: 'chantier', statut: 'today', agent: 'Omar Diallo', technician: 'Samba Tall', notes: 'Vérification avancement Phase 1.' },
    { id: 3, title: 'RDV bureau - Signature contrat', contactId: 5, date: addDays(-2), heure: '14:30', lieu: 'Siège Katos, Dakar', type: 'bureau', statut: 'completed', agent: 'Katos Admin', notes: 'Signature du compromis de vente.' },
];

const initialProjects: ConstructionProject[] = [
    {
        id: 'cp1',
        contactId: 5,
        villaModelId: 'v1',
        progress: 35,
        photos: ['https://images.unsplash.com/photo-1541888946425-d81bb19480c5?q=80&w=2070&auto=format&fit=crop'],
        technicalIssues: ['Retard livraison briques', 'Problème étanchéité dalles'],
        teamPlanning: 'Équipe Maçonnerie : Lun-Ven 8h-17h',
        deliveryDate: '2026-08-15',
        technicianName: 'Samba Tall',
        status: 'en_cours',
        created_at: addDays(-30),
        updated_at: fmt(today)
    }
];

// ─── Store ────────────────────────────────────────────────────────────
interface ContactStore {
    contacts: CrmContact[];
    followUps: FollowUp[];
    visits: Visit[];
    interactions: Interaction[];
    addContact: (c: Omit<CrmContact, 'id'>) => void;
    updateContact: (id: number, updates: Partial<CrmContact>) => void;
    deleteContact: (id: number) => void;
    moveContactStatus: (id: number, newStatus: string) => void;

    addFollowUp: (f: Omit<FollowUp, 'id'>) => void;
    updateFollowUp: (id: string, updates: Partial<FollowUp>) => void;
    deleteFollowUp: (id: string) => void;

    addVisit: (v: Omit<Visit, 'id'>) => void;
    updateVisit: (id: number, updates: Partial<Visit>) => void;
    deleteVisit: (id: number) => void;
    moveVisitStatut: (id: number, newStatut: 'upcoming' | 'today' | 'completed') => void;

    addInteraction: (i: Omit<Interaction, 'id'>, relance?: Omit<FollowUp, 'id' | 'contactId' | 'interactionId'>) => void;
    updateInteraction: (id: string, updates: Partial<Interaction>) => void;
    deleteInteraction: (id: string) => void;

    constructionProjects: ConstructionProject[];
    addProject: (p: Omit<ConstructionProject, 'id'>) => void;
    updateProject: (id: string, updates: Partial<ConstructionProject>) => void;
    deleteProject: (id: string) => void;

    documents: CrmDocument[];
    addDocument: (d: Omit<CrmDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'versions'>) => void;
    updateDocumentVersion: (id: string, url: string, notes?: string) => void;
    deleteDocument: (id: string) => void;
}

export const useContactStore = create<ContactStore>()((set) => ({
    contacts: initialContacts,
    followUps: initialFollowUps,
    visits: initialVisites,
    interactions: initialInteractions,

    addContact: (c) =>
        set((state) => ({
            contacts: [
                ...state.contacts,
                { ...c, id: Math.max(...state.contacts.map(x => x.id), 0) + 1 },
            ],
        })),

    updateContact: (id, updates) =>
        set((state) => ({
            contacts: state.contacts.map(c => c.id === id ? { ...c, ...updates } : c),
        })),

    deleteContact: (id) =>
        set((state) => ({
            contacts: state.contacts.filter(c => c.id !== id),
        })),

    moveContactStatus: (id, newStatus) =>
        set((state) => ({
            contacts: state.contacts.map(c => c.id === id ? { ...c, status: newStatus } : c),
        })),

    addFollowUp: (f) =>
        set((state) => ({
            followUps: [
                ...state.followUps,
                { ...f, id: 'r' + Date.now() },
            ],
        })),

    updateFollowUp: (id, updates) =>
        set((state) => ({
            followUps: state.followUps.map(f => f.id === id ? { ...f, ...updates } : f),
        })),

    deleteFollowUp: (id) =>
        set((state) => ({
            followUps: state.followUps.filter(f => f.id !== id),
        })),

    addVisit: (v) =>
        set((state) => ({
            visits: [
                ...state.visits,
                { ...v, id: Math.max(...state.visits.map(x => x.id), 0) + 1 },
            ],
        })),

    updateVisit: (id, updates) =>
        set((state) => ({
            visits: state.visits.map(v => v.id === id ? { ...v, ...updates } : v),
        })),

    deleteVisit: (id) =>
        set((state) => ({
            visits: state.visits.filter(v => v.id !== id),
        })),

    moveVisitStatut: (id, newStatut) =>
        set((state) => ({
            visits: state.visits.map(v => v.id === id ? { ...v, statut: newStatut } : v),
        })),

    addInteraction: (i, relance) =>
        set((state) => {
            const intId = 'int' + Date.now();
            const newInteraction = { ...i, id: intId };
            let newFollowUps = [...state.followUps];

            if (relance) {
                newFollowUps.push({
                    ...relance,
                    id: 'r' + Date.now(),
                    contactId: i.contactId,
                    interactionId: intId
                });
            }

            return {
                interactions: [newInteraction, ...state.interactions],
                followUps: newFollowUps
            };
        }),

    updateInteraction: (id, updates) =>
        set((state) => ({
            interactions: state.interactions.map(i => i.id === id ? { ...i, ...updates } : i),
        })),

    deleteInteraction: (id) =>
        set((state) => ({
            interactions: state.interactions.filter(i => i.id !== id),
        })),

    constructionProjects: initialProjects,
    addProject: (p) =>
        set((state) => ({
            constructionProjects: [
                ...state.constructionProjects,
                { ...p, id: 'cp' + Date.now() },
            ],
        })),

    updateProject: (id, updates) =>
        set((state) => ({
            constructionProjects: state.constructionProjects.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString().split('T')[0] } : p),
        })),

    deleteProject: (id) =>
        set((state) => ({
            constructionProjects: state.constructionProjects.filter(p => p.id !== id),
        })),

    documents: initialDocuments,
    addDocument: (d) =>
        set((state) => {
            const now = new Date().toISOString().split('T')[0];
            const newDoc: CrmDocument = {
                ...d,
                id: 'doc' + Date.now(),
                version: 1,
                versions: [{ version: 1, url: d.url, createdAt: now }],
                createdAt: now,
                updatedAt: now
            };
            return { documents: [...state.documents, newDoc] };
        }),

    updateDocumentVersion: (id, url, notes) =>
        set((state) => ({
            documents: state.documents.map(doc => {
                if (doc.id === id) {
                    const newVersion = doc.version + 1;
                    const now = new Date().toISOString().split('T')[0];
                    return {
                        ...doc,
                        url,
                        version: newVersion,
                        versions: [...doc.versions, { version: newVersion, url, createdAt: now, notes }],
                        updatedAt: now
                    };
                }
                return doc;
            })
        })),

    deleteDocument: (id) =>
        set((state) => ({
            documents: state.documents.filter(doc => doc.id !== id),
        })),
}));
