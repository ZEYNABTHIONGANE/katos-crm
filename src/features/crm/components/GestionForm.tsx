import React, { useState } from 'react';
import { Save } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { ImmobilierBien, ImmobilierType } from '../types/land';

interface GestionFormProps {
    initialData?: Partial<ImmobilierBien>;
    onSave: (data: Partial<ImmobilierBien>) => void;
    onCancel: () => void;
}

const GestionForm: React.FC<GestionFormProps> = ({ initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<ImmobilierBien>>({
        title: '',
        description: '',
        price: 0,
        surface: 0,
        location: '',
        bien_type: 'location',
        status: 'disponible',
        ...initialData
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={initialData?.id ? 'Modifier le bien' : 'Ajouter un nouveau bien'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="premium-form">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Titre de l'annonce *</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="Ex: Appartement 3 pièces - Point E"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Type de transaction</label>
                        <select
                            className="form-select"
                            value={formData.bien_type}
                            onChange={(e) => setFormData({ ...formData, bien_type: e.target.value as ImmobilierType })}
                        >
                            <option value="location">Location</option>
                            <option value="achat">Achat / Vente</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Statut</label>
                        <select
                            className="form-select"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="disponible">Disponible</option>
                            <option value="reserve">Réservé</option>
                            <option value="loue">Loué</option>
                            <option value="vendu">Vendu</option>
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
                        <label className="form-label">Commercial Responsable</label>
                        <select
                            className="form-select"
                            value={formData.assignedAgent}
                            onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value as any })}
                        >
                            <option value="Abdou Sarr">Abdou Sarr</option>
                            <option value="Omar Diallo">Omar Diallo</option>
                            <option value="Katos Admin">Katos Admin</option>
                        </select>
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

                <div className="form-actions mt-6">
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        Annuler
                    </button>
                    <button type="submit" className="btn-primary">
                        <Save size={18} /> {initialData?.id ? 'Enregistrer' : 'Créer le bien'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GestionForm;
