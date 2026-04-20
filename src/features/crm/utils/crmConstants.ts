/**
 * Constantes CRM partagées entre les composants
 * Utiliser ces constantes partout pour garantir la cohérence des données
 */

/** Statuts considérés comme une vente/conversion réussie */
export const SALE_STATUSES = [
    'Contrat',
    'Paiement',
    'Transfert de dossier technique',
    'Transfert dossier tech',
    'Suivi Chantier',
    'Livraison Client',
    'Fidélisation',
    'Client',
    'Projet Livré',
];

/** Statuts de pipeline actif (avant vente) */
export const PIPELINE_STATUSES = [
    'Prospect',
    'Qualification',
    'En Qualification',
    'RDV',
    'RDV / Visite Terrain',
    'Proposition Commerciale',
    'Négociation',
    'Réservation',
];

/** Tous les statuts du cycle de vente complet */
export const ALL_STATUSES = [...PIPELINE_STATUSES, ...SALE_STATUSES];

/**
 * Compte les contacts assignés à un agent donné (tous statuts confondus)
 * C'est le "portefeuille total" de l'agent
 */
export const countAgentContacts = (
    contacts: { assignedAgent?: string; status: string }[],
    agentName: string
) => {
    const norm = agentName.trim().toLowerCase();
    return contacts.filter(c => (c.assignedAgent || '').trim().toLowerCase() === norm);
};

/**
 * Compte les ventes d'un agent (statuts de conversion)
 */
export const countAgentSales = (
    contacts: { assignedAgent?: string; status: string }[],
    agentName: string
) => {
    return countAgentContacts(contacts, agentName).filter(c => SALE_STATUSES.includes(c.status));
};
