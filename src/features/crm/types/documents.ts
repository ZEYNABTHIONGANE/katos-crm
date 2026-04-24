export type DocumentType = 'contrat' | 'plan' | 'devis' | 'facture' | 'bon_reservation' | 'identite' | 'passeport' | 'autre';

export interface DocumentVersion {
    version: number;
    url: string;
    createdAt: string;
    notes?: string;
}

export interface CrmDocument {
    id: string;
    name: string;
    type: DocumentType;
    url: string;
    version: number;
    versions: DocumentVersion[];
    contactId: number;
    projectId?: string;
    propertyId?: string; // ID of land or villa
    propertyType?: 'land' | 'villa';
    createdAt: string;
    updatedAt: string;
    size?: string;
    fileType?: string;
}
