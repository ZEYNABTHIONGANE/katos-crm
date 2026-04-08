import React, { useState } from 'react';
import { Save } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Villa } from '../types/land';

interface ConstructionFormProps {
    initialData?: Partial<Villa>;
    onSave: (data: Partial<Villa>) => void;
    onCancel: () => void;
}

const ConstructionForm: React.FC<ConstructionFormProps> = ({ initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Villa>>({
        title: '',
        description: '',
        type: '',
        price: 0,
        surface: 0,
        location: '',
        status: 'disponible',
        assignedAgent: '',
        ...initialData
    });

    const [commercials, setCommercials] = useState<{ id: string, name: string, service: string }[]>([]);

    React.useEffect(() => {
        const loadCommercials = async () => {
            const { fetchCommercials } = await import('../api/contactApi');
            const data = await fetchCommercials();
            setCommercials(data);
        };
        loadCommercials();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={initialData?.id ? 'Modifier le modèle' : 'Ajouter un nouveau modèle'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="premium-form">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Titre du modèle *</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="Ex: Villa Prestige R+1"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Type de villa</label>
                        <select
                            className="form-select"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="">Sélectionner un modèle...</option>
                            <option value="Villa Zahra F3">Villa Zahra F3</option>
                            <option value="Villa Kenza F3">Villa Kenza F3</option>
                            <option value="Villa Fatima F4">Villa Fatima F4</option>
                            <option value="Villa Amina F6">Villa Amina F6</option>
                            <option value="Villa Aicha F6">Villa Aicha F6</option>
                            <option value="Construction Personnalisée">Construction Personnalisée</option>
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
                            <option value="vendu">Vendu</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Surface Habitable (m²)</label>
                        <input
                            type="number"
                            required
                            className="form-input"
                            value={formData.surface}
                            onChange={(e) => setFormData({ ...formData, surface: Number(e.target.value) })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Prix Estimé (FCFA)</label>
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
                            value={formData.assignedAgent || ''}
                            onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value as any })}
                        >
                            <option value="">— Non assigné —</option>
                            {commercials.map(agent => (
                                <option key={agent.id} value={agent.name}>{agent.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group col-2">
                        <label className="form-label">Localisation Suggérée *</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="Ex: Diamniadio, Sangalkam..."
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <div className="form-group col-2">
                        <label className="form-label">Description / Détails techniques</label>
                        <textarea
                            rows={3}
                            className="form-textarea"
                            placeholder="4 chambres, cuisine équipée, terrasse..."
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
                        <Save size={18} /> {initialData?.id ? 'Enregistrer' : 'Créer le modèle'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ConstructionForm;
