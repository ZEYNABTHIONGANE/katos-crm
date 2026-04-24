import { create } from 'zustand';
import type { ServiceType } from '../features/crm/components/ServiceSelector';
import type { CrmDocument } from '../features/crm/types/documents';
import type { ConstructionProject } from '../features/crm/types/land';
import * as api from '../features/crm/api/contactApi';
import * as projectApi from '../features/crm/api/projectApi';
import { checkActiveDispute } from '../features/crm/api/complianceApi';

// ─── Status → Column map ─────────────────────────────────────────────
export const STATUS_TO_COLUMN: Record<string, string> = {
    'Prospect': 'prospect',
    'Qualification': 'qualification',
    'En Qualification': 'qualification',
    'RDV': 'rdv',
    'Proposition Commerciale': 'proposition',
    'Négociation': 'negociation',
    'Réservation': 'reservation',
    'Contrat': 'contrat',
    'Paiement': 'paiement',
    'Transfert de dossier technique': 'transfert_technique',
    'Suivi Chantier': 'suivi_chantier',
    'Livraison Client': 'livraison',
    'Fidélisation': 'fidelisation',
    'Pas intéressé': 'pas_interesse',
};

// ─── Status → Progress % ──────────────────────────────────────────────
export const STATUS_PROGRESS: Record<string, number> = {
    'pas_interesse': 0,
    'prospect': 5,
    'qualification': 10,
    'rdv': 20,
    'proposition': 35,
    'negociation': 50,
    'reservation': 65,
    'contrat': 80,
    'paiement': 90,
    'transfert_technique': 93,
    'suivi_chantier': 95,
    'livraison': 100,
    'fidelisation': 100,
};

// ─── Shared Types ────────────────────────────────────────────────────────
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
    createdBy?: string;
    createdAt?: string; // ISO date string
    budgetConfirmed?: boolean;
    isReactive?: boolean;
    convertedAt?: string; // Date of conversion to client
    refusalReason?: string; // Motif si "Pas intéressé"
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

export type InteractionType = 'call' | 'email' | 'rdv' | 'visite_terrain' | 'visite_chantier' | 'note' | 'pipeline_step';

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
    statut: 'upcoming' | 'today' | 'completed' | 'cancelled';
    agent: string;
    technician?: string;
    notes: string;
}


// ─── Store ────────────────────────────────────────────────────────────
interface ContactStore {
    contacts: CrmContact[];
    followUps: FollowUp[];
    visits: Visit[];
    interactions: Interaction[];

    fetchData: () => Promise<void>;

    addContact: (contact: Omit<CrmContact, 'id'>) => Promise<CrmContact | string>;
    addContactsBulk: (contacts: Omit<CrmContact, 'id'>[]) => Promise<CrmContact[]>;
    addInteractionsBulk: (interactions: Omit<Interaction, 'id'>[]) => Promise<number>;
    updateContact: (id: number, updates: Partial<CrmContact>) => Promise<boolean>;
    deleteContact: (id: number) => Promise<void>;
    moveContactStatus: (id: number, newStatus: string, comment?: string, agentName?: string, refusalReason?: string) => Promise<boolean>;

    addFollowUp: (f: Omit<FollowUp, 'id'>) => Promise<void>;
    updateFollowUp: (id: string, updates: Partial<FollowUp>) => Promise<void>;
    deleteFollowUp: (id: string) => Promise<void>;

    addVisit: (v: Omit<Visit, 'id'>) => Promise<Visit | null>;
    updateVisit: (id: number, updates: Partial<Visit>) => Promise<void>;
    deleteVisit: (id: number) => Promise<void>;
    moveVisitStatut: (id: number, newStatut: 'upcoming' | 'today' | 'completed') => Promise<void>;

    addInteraction: (i: Omit<Interaction, 'id'>, relance?: Omit<FollowUp, 'id' | 'contactId' | 'interactionId'>) => Promise<void>;
    updateInteraction: (id: string, updates: Partial<Interaction>) => Promise<void>;
    deleteInteraction: (id: string) => Promise<void>;

    constructionProjects: ConstructionProject[];
    addProject: (p: Omit<ConstructionProject, 'id'>) => Promise<void>;
    updateProject: (id: string, updates: Partial<ConstructionProject>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;

    documents: CrmDocument[];
    addDocument: (d: Omit<CrmDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'versions'>) => Promise<void>;
    updateDocumentVersion: (id: string, url: string, notes?: string) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
}

export const useContactStore = create<ContactStore>()((set, get) => ({
    contacts: [],
    followUps: [],
    visits: [],
    interactions: [],
    constructionProjects: [],
    documents: [],

    fetchData: async () => {
        console.log('[STORE] Starting resilient data fetch...');
        
        const fetchSafely = async <T>(promise: Promise<T>, label: string, fallback: T): Promise<T> => {
            try {
                return await promise;
            } catch (err) {
                console.error(`[STORE] Error fetching ${label}:`, err);
                return fallback;
            }
        };

        // Fetch all modules in parallel but with individual error handling
        const [contacts, interactions, visits, followUps, projects, docs] = await Promise.all([
            fetchSafely(api.fetchContacts(), 'contacts', []),
            fetchSafely(api.fetchInteractions(), 'interactions', []),
            fetchSafely(api.fetchVisits(), 'visits', []),
            fetchSafely(api.fetchFollowUps(), 'followUps', []),
            fetchSafely(projectApi.fetchProjects(), 'projects', []),
            fetchSafely(projectApi.fetchDocuments(), 'documents', [])
        ]);

        set({ 
            contacts, 
            interactions, 
            visits, 
            followUps, 
            constructionProjects: projects, 
            documents: docs 
        });
        console.log('[STORE] Resilient fetch completed.');
    },

    addContact: async (c) => {
        try {
            const newContact = await api.createContact(c);
            if (newContact) {
                set((state) => ({ contacts: [newContact, ...state.contacts] }));
                return newContact;
            }
            return 'Insertion échouée (voir console pour détails)';
        } catch (err: any) {
            console.error('[addContact] Exception:', err);
            return err?.message || 'Erreur inconnue';
        }
    },

    addContactsBulk: async (contacts) => {
        try {
            const newContacts = await api.bulkCreateContacts(contacts);
            if (newContacts.length > 0) {
                set((state) => ({ contacts: [...newContacts, ...state.contacts] }));
            }
            return newContacts;
        } catch (err) {
            console.error('[contactStore] Error adding contacts bulk:', err);
            return [];
        }
    },
    addInteractionsBulk: async (interactions) => {
        try {
            const newInteractions = await api.bulkCreateInteractions(interactions);
            if (newInteractions.length > 0) {
                const mappedInteractions = newInteractions.map(i => ({
                    id: i.id,
                    contactId: i.contact_id,
                    type: i.type,
                    title: i.title,
                    description: i.description,
                    date: i.date,
                    heure: i.heure,
                    agent: i.agent,
                    lieu: i.lieu,
                    technician: i.technician
                }));
                set((state) => ({ interactions: [...mappedInteractions, ...state.interactions] }));
            }
            return newInteractions.length;
        } catch (err) {
            console.error('[contactStore] Error adding interactions bulk:', err);
            return 0;
        }
    },

    updateContact: async (id, updates) => {
        const { contacts } = get();
        const contact = contacts.find(c => c.id === id);
        if (!contact) return false;

        const previousContact = { ...contact };

        // Blocage si litige actif et passage à statut final
        if (updates.status && ['Livraison Client', 'Projet Livré'].includes(updates.status)) {
            const hasDispute = await checkActiveDispute(id);
            if (hasDispute) {
                console.warn(`[STORE] Update blocked for contact ${id}: Active compliance dispute.`);
                return false;
            }
        }

        // Auto-set convertedAt if status moves to a sale status for the first time
        if (updates.status && !contact.convertedAt) {
            const SALE_STATUSES = ['Client', 'Projet Livré', 'Contrat', 'Paiement', 'Transfert de dossier technique', 'Transfert dossier tech', 'Suivi Chantier', 'Livraison Client', 'Réservation', 'Fidélisation'];
            if (SALE_STATUSES.includes(updates.status)) {
                updates.convertedAt = new Date().toISOString();
            }
        }

        // Optimistic update
        set((state) => ({ contacts: state.contacts.map(c => c.id === id ? { ...c, ...updates } : c) }));
        
        try {
            const success = await api.updateContactApi(id, updates);
            if (success === false) {
                // Rollback if API fails
                set((state) => ({ contacts: state.contacts.map(c => c.id === id ? previousContact : c) }));
                return false;
            }
            return true;
        } catch (err) {
            console.error('[STORE] Update Error:', err);
            // Rollback on crash
            set((state) => ({ contacts: state.contacts.map(c => c.id === id ? previousContact : c) }));
            return false;
        }
    },

    deleteContact: async (id) => {
        set((state) => ({ contacts: state.contacts.filter(c => c.id !== id) }));
        await api.deleteContactApi(id);
    },

    moveContactStatus: async (id: number, newStatus: string, comment?: string, agentName?: string, refusalReason?: string) => {
        const { contacts, addInteraction } = get();
        const contact = contacts.find(c => c.id === id);
        if (!contact) return false;

        const previousContact = { ...contact };
        const updates: Partial<CrmContact> = { 
            status: newStatus,
            refusalReason: refusalReason || undefined
        };

        // Blocage si litige actif et passage à statut final
        if (['Livraison Client', 'Projet Livré'].includes(newStatus)) {
            const hasDispute = await checkActiveDispute(id);
            if (hasDispute) {
                console.warn(`[STORE] Move status blocked for contact ${id}: Active compliance dispute.`);
                return false; 
            }
        }

        // Auto-set convertedAt
        if (!contact.convertedAt) {
            const SALE_STATUSES = ['Client', 'Projet Livré', 'Contrat', 'Paiement', 'Transfert de dossier technique', 'Transfert dossier tech', 'Suivi Chantier', 'Livraison Client'];
            if (SALE_STATUSES.includes(newStatus)) {
                updates.convertedAt = new Date().toISOString();
            }
        }

        // Optimistic update
        set((state) => ({ contacts: state.contacts.map(c => c.id === id ? { ...c, ...updates } : c) }));
        
        try {
            const success = await api.updateContactApi(id, updates);
            if (success === false) {
                set((state) => ({ contacts: state.contacts.map(c => c.id === id ? previousContact : c) }));
                return false;
            }

            // Log the transition in history
            await addInteraction({
                contactId: id,
                type: 'pipeline_step',
                title: `Passage à l'étape : ${newStatus}`,
                description: comment || `L'agent a déplacé le prospect vers l'étape ${newStatus}.`,
                date: new Date().toISOString().split('T')[0],
                heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                agent: agentName || contact.assignedAgent || 'Système'
            });

            return true;
        } catch (err) {
            console.error('[STORE] moveStatus Error:', err);
            set((state) => ({ contacts: state.contacts.map(c => c.id === id ? previousContact : c) }));
            return false;
        }
    },

    addFollowUp: async (f) => {
        const saved = await api.createFollowUpApi(f);
        if (saved) {
            set((state) => ({ followUps: [saved, ...state.followUps] }));
        }
    },

    updateFollowUp: async (id, updates) => {
        set((state) => ({ followUps: state.followUps.map(f => f.id === id ? { ...f, ...updates } : f) }));
        await api.updateFollowUpApi(id, updates);
    },

    deleteFollowUp: async (id) => {
        set((state) => ({ followUps: state.followUps.filter(f => f.id !== id) }));
        await api.deleteFollowUpApi(id);
    },

    addVisit: async (v) => {
        try {
            const saved = await api.createVisitApi(v);
            if (saved) {
                set((state) => ({ visits: [saved, ...state.visits] }));
                return saved;
            }
            return null;
        } catch (error) {
            console.error('[STORE] addVisit error:', error);
            return null;
        }
    },

    updateVisit: async (id, updates) => {
        set((state) => ({ visits: state.visits.map(v => v.id === id ? { ...v, ...updates } : v) }));
        await api.updateVisitApi(id, updates);
    },

    deleteVisit: async (id) => {
        set((state) => ({ visits: state.visits.filter(v => v.id !== id) }));
        await api.deleteVisitApi(id);
    },

    moveVisitStatut: async (id, newStatut) => {
        set((state) => ({ visits: state.visits.map(v => v.id === id ? { ...v, statut: newStatut } : v) }));
        await api.updateVisitApi(id, { statut: newStatut });
    },

    addInteraction: async (i, relance) => {
        try {
            console.log('[STORE] addInteraction START - Payload:', i);
            const newInt = await api.createInteractionApi(i);
            console.log('[STORE] createInteractionApi RETURNED:', newInt);

            if (newInt) {
                set((state) => ({ interactions: [newInt, ...state.interactions] }));
                console.log('[STORE] Interaction state updated');

                if (relance) {
                    console.log('[STORE] Adding associated relance...');
                    const newRelance = await api.createFollowUpApi({
                        ...relance,
                        contactId: i.contactId,
                        interactionId: newInt.id
                    });
                    if (newRelance) {
                        set((state) => ({ followUps: [newRelance, ...state.followUps] }));
                        console.log('[STORE] Relance state updated');
                    }
                }
            } else {
                console.warn('[STORE] addInteraction: API returned NULL');
            }
        } catch (error) {
            console.error('[STORE] addInteraction CRASH:', error);
            throw error;
        }
    },

    updateInteraction: async (id, updates) => {
        set((state) => ({ interactions: state.interactions.map(i => i.id === id ? { ...i, ...updates } : i) }));
        await api.updateInteractionApi(id, updates);
    },

    deleteInteraction: async (id) => {
        set((state) => ({ interactions: state.interactions.filter(i => i.id !== id) }));
        await api.deleteInteractionApi(id);
    },

    addProject: async (p) => {
        const saved = await projectApi.createProject(p);
        if (saved) {
            set((state) => ({ constructionProjects: [...state.constructionProjects, saved] }));
        }
    },

    updateProject: async (id, updates) => {
        set((state) => ({
            constructionProjects: state.constructionProjects.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString().split('T')[0] } : p),
        }));
        await projectApi.updateProjectApi(id, updates);
    },

    deleteProject: async (id) => {
        set((state) => ({ constructionProjects: state.constructionProjects.filter(p => p.id !== id) }));
        await projectApi.deleteProjectApi(id);
    },

    addDocument: async (d) => {
        const saved = await projectApi.createDocumentApi(d);
        if (saved) {
            set((state) => ({ documents: [...state.documents, saved] }));
        }
    },

    updateDocumentVersion: async (id, url, notes) => {
        // Version update is actually handled by creating a new document in the metadata for this version
        // In this simple implementation we'll just delete and re-create or similar, but for now let's keep it simple
        // and just update the local state as the current API doesn't handle versions explicitly yet
        set((state) => ({
            documents: state.documents.map(doc => {
                if (doc.id === id) {
                    const newVersion = (doc.version || 1) + 1;
                    const now = new Date().toISOString();
                    return {
                        ...doc,
                        url,
                        version: newVersion,
                        versions: [...(doc.versions || []), { version: newVersion, url, createdAt: now, notes }],
                        updatedAt: now
                    };
                }
                return doc;
            })
        }));
        // Note: Real API for versioning would be needed here
    },

    deleteDocument: async (id) => {
        set((state) => ({ documents: state.documents.filter(doc => doc.id !== id) }));
        await projectApi.deleteDocumentApi(id);
    },
}));

export const calculateLeadScore = (c: CrmContact) => {
    let score = 0;
    if (c.budgetConfirmed) score += 20;
    const rdvStatuses = ['RDV', 'Proposition Commerciale', 'Négociation', 'Réservation', 'Contrat', 'Paiement', 'Transfert de dossier technique', 'Suivi Chantier', 'Livraison Client'];
    if (rdvStatuses.includes(c.status)) score += 15;
    if (c.isReactive) score += 10;
    return score;
};
