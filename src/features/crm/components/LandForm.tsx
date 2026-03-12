import React, { useState } from 'react';
import { Save, Plus, Trash2, FilePlus, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Land, LandStatus, Lot, LandDocument } from '../types/land';

interface LandFormProps {
    initialData?: Partial<Land>;
    onSave: (data: Partial<Land>) => void;
    onCancel: () => void;
}

const LEGAL_NATURES = ['Bail', 'Titre Foncier', 'Permis d\'occuper', 'Délibération', 'Attestation de cession'];
const AGENTS = ['Abdou Sarr', 'Omar Diallo', 'Katos Admin'];

const LandForm: React.FC<LandFormProps> = ({ initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Land>>({
        title: '',
        description: '',
        price: 0,
        surface: 0,
        location: '',
        reference: '',
        legal_nature: LEGAL_NATURES[0],
        status: 'disponible',
        owner_name: 'Katos',
        assignedAgent: AGENTS[0],
        lots: [],
        documents: [],
        ...initialData
    });

    const [activeTab, setActiveTab] = useState<'info' | 'lots' | 'docs'>('info');

    const handleAddLot = () => {
        const newLot: Partial<Lot> = {
            id: crypto.randomUUID(),
            lot_number: `Lot ${(formData.lots?.length || 0) + 1}`,
            surface: 0,
            price: 0,
            status: 'disponible'
        };
        setFormData({
            ...formData,
            lots: [...(formData.lots || []), newLot as Lot]
        });
    };

    const handleRemoveLot = (id: string) => {
        setFormData({
            ...formData,
            lots: formData.lots?.filter(l => l.id !== id)
        });
    };

    const handleUpdateLot = (id: string, updates: Partial<Lot>) => {
        setFormData({
            ...formData,
            lots: formData.lots?.map(l => l.id === id ? { ...l, ...updates } : l)
        });
    };

    const handleAddDocument = () => {
        const newDoc: Partial<LandDocument> = {
            id: crypto.randomUUID(),
            name: '',
            type: 'plan',
            file_url: ''
        };
        setFormData({
            ...formData,
            documents: [...(formData.documents || []), newDoc as LandDocument]
        });
    };

    const handleRemoveDocument = (id: string) => {
        setFormData({
            ...formData,
            documents: formData.documents?.filter(d => d.id !== id)
        });
    };

    const handleUpdateDocument = (id: string, updates: Partial<LandDocument>) => {
        setFormData({
            ...formData,
            documents: formData.documents?.map(d => d.id === id ? { ...d, ...updates } : d)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={initialData?.id ? 'Modifier le terrain' : 'Ajouter un nouveau terrain'}
            size="lg"
        >
            <div className="form-tabs mt-2 mb-6">
                <button
                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    Informations Générales
                </button>
                <button
                    className={`tab-btn ${activeTab === 'lots' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lots')}
                >
                    Lotissements ({formData.lots?.length || 0})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('docs')}
                >
                    Documents ({formData.documents?.length || 0})
                </button>
            </div>

            <form onSubmit={handleSubmit} className="premium-form">
                {activeTab === 'info' && (
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Référence du terrain *</label>
                            <input
                                type="text"
                                required
                                className="form-input"
                                placeholder="Ex: REF-TR-001"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            />
                        </div>

                        <div className="form-group col-2">
                            <label className="form-label">Titre de l'annonce terrain *</label>
                            <input
                                type="text"
                                required
                                className="form-input"
                                placeholder="Ex: Terrain 500m² - Sangalkam"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Statut</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as LandStatus })}
                            >
                                <option value="disponible">Disponible</option>
                                <option value="reserve">Réservé</option>
                                <option value="vendu">Vendu</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nature Juridique</label>
                            <select
                                className="form-select"
                                value={formData.legal_nature}
                                onChange={(e) => setFormData({ ...formData, legal_nature: e.target.value })}
                            >
                                {LEGAL_NATURES.map(nature => (
                                    <option key={nature} value={nature}>{nature}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Commercial Responsable</label>
                            <select
                                className="form-select"
                                value={formData.assignedAgent}
                                onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })}
                            >
                                {AGENTS.map(agent => (
                                    <option key={agent} value={agent}>{agent}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Surface (m²)</label>
                            <input
                                type="number"
                                required
                                className="form-input"
                                value={formData.surface}
                                onChange={(e) => setFormData({ ...formData, surface: Number(e.target.value) })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Prix (FCFA)</label>
                            <input
                                type="number"
                                required
                                className="form-input"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            />
                        </div>

                        <div className="form-group col-2">
                            <label className="form-label">Localisation *</label>
                            <input
                                type="text"
                                required
                                className="form-input"
                                placeholder="Ville, quartier..."
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        <div className="form-group col-2">
                            <label className="form-label">Description</label>
                            <textarea
                                rows={3}
                                className="form-textarea"
                                placeholder="Détails supplémentaires..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>
                    </div>
                )}

                {activeTab === 'lots' && (
                    <div className="dynamic-section">
                        <div className="section-header d-flex-between mb-4">
                            <p className="text-muted">Définissez les lots pour ce terrain si nécessaire.</p>
                            <button type="button" onClick={handleAddLot} className="btn-outline btn-sm">
                                <Plus size={16} /> Ajouter un lot
                            </button>
                        </div>

                        <div className="lots-list">
                            {(formData.lots || []).map((lot, index) => (
                                <div key={lot.id} className="dynamic-item card-premium p-4 mb-3">
                                    <div className="d-flex-between mb-3">
                                        <h5 style={{ fontWeight: 700, color: 'var(--primary)' }}>Lot #{index + 1}</h5>
                                        <button type="button" onClick={() => handleRemoveLot(lot.id)} className="text-danger">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="form-grid compact">
                                        <div className="form-group">
                                            <label className="form-label">Numéro du lot</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={lot.lot_number}
                                                onChange={(e) => handleUpdateLot(lot.id, { lot_number: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Surface (m²)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={lot.surface}
                                                onChange={(e) => handleUpdateLot(lot.id, { surface: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Prix (FCFA)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={lot.price}
                                                onChange={(e) => handleUpdateLot(lot.id, { price: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Statut</label>
                                            <select
                                                className="form-select"
                                                value={lot.status}
                                                onChange={(e) => handleUpdateLot(lot.id, { status: e.target.value as any })}
                                            >
                                                <option value="disponible">Disponible</option>
                                                <option value="reserve">Réservé</option>
                                                <option value="vendu">Vendu</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(formData.lots || []).length === 0 && (
                                <div className="empty-state p-8 text-center border-dashed">
                                    <AlertCircle className="icon-muted mb-2" />
                                    <p className="text-muted">Aucun lot défini.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'docs' && (
                    <div className="dynamic-section">
                        <div className="section-header d-flex-between mb-4">
                            <p className="text-muted">Joignez les documents officiels liés au terrain.</p>
                            <button type="button" onClick={handleAddDocument} className="btn-outline btn-sm">
                                <FilePlus size={16} /> Ajouter un document
                            </button>
                        </div>

                        <div className="docs-list">
                            {(formData.documents || []).map((doc) => (
                                <div key={doc.id} className="dynamic-item card-premium p-4 mb-3">
                                    <div className="d-flex-between mb-3">
                                        <h5 style={{ fontWeight: 700 }}>Document</h5>
                                        <button type="button" onClick={() => handleRemoveDocument(doc.id)} className="text-danger">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="form-grid compact">
                                        <div className="form-group col-2">
                                            <label className="form-label">Nom du document</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Plan cadastral"
                                                className="form-input"
                                                value={doc.name}
                                                onChange={(e) => handleUpdateDocument(doc.id, { name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Type</label>
                                            <select
                                                className="form-select"
                                                value={doc.type}
                                                onChange={(e) => handleUpdateDocument(doc.id, { type: e.target.value as any })}
                                            >
                                                <option value="plan">Plan</option>
                                                <option value="titre_foncier">Titre foncier</option>
                                                <option value="titre">Titre de propriété</option>
                                                <option value="contrat">Contrat</option>
                                                <option value="autre">Autre</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">URL ou Fichier</label>
                                            <input
                                                type="text"
                                                placeholder="Lien vers le fichier"
                                                className="form-input"
                                                value={doc.file_url}
                                                onChange={(e) => handleUpdateDocument(doc.id, { file_url: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(formData.documents || []).length === 0 && (
                                <div className="empty-state p-8 text-center border-dashed">
                                    <FilePlus className="icon-muted mb-2" />
                                    <p className="text-muted">Aucun document joint.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="form-actions mt-8 pt-4 border-top">
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        Annuler
                    </button>
                    <button type="submit" className="btn-primary">
                        <Save size={18} /> {initialData?.id ? 'Enregistrer les modifications' : 'Créer le terrain'}
                    </button>
                </div>
            </form>

            <style>{`
                .form-tabs {
                    display: flex;
                    gap: 0.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                .tab-btn {
                    padding: 0.75rem 1.25rem;
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    font-weight: 600;
                    color: var(--text-muted);
                    transition: all 0.2s;
                }
                .tab-btn.active {
                    color: var(--primary);
                    border-bottom-color: var(--primary);
                }
                .btn-outline.btn-sm {
                    padding: 0.4rem 0.75rem;
                    font-size: 0.813rem;
                }
                .form-grid.compact {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                .border-dashed {
                    border: 2px dashed var(--border-color);
                    border-radius: var(--radius-lg);
                }
                .border-top {
                    border-top: 1px solid var(--border-color);
                }
            `}</style>
        </Modal >
    );
};

export default LandForm;

