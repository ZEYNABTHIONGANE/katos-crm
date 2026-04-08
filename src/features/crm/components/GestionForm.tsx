import { useState, useEffect } from 'react';
import { Save, User, UserCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { fetchCommercials } from '../api/contactApi';
import type { ImmobilierBien, ImmobilierType } from '../types/land';

interface GestionFormProps {
    isOpen: boolean;
    initialData?: Partial<ImmobilierBien>;
    onSave: (data: Partial<ImmobilierBien>) => Promise<void>;
    onCancel: () => void;
}

const emptyForm: Partial<ImmobilierBien> = {
    title: '',
    description: '',
    price: 0,
    surface: 0,
    location: '',
    bien_type: 'location',
    status: 'disponible',
    owner_name: '',
    assignedAgent: '',
};

const GestionForm: React.FC<GestionFormProps> = ({ isOpen, initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<ImmobilierBien>>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [agents, setAgents] = useState<any[]>([]);

    useEffect(() => {
        if (initialData) {
            setFormData({ ...emptyForm, ...initialData });
        } else {
            setFormData(emptyForm);
        }
    }, [initialData, isOpen]);

    useEffect(() => {
        const loadAgents = async () => {
            // On ne récupère que les agents du service gestion
            const data = await fetchCommercials('gestion');
            setAgents(data);
        };
        if (isOpen) loadAgents();
    }, [isOpen]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={initialData?.id ? 'Modifier le bien' : 'Ajouter un nouveau bien'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="form-grid">
                <div className="form-group col-2">
                    <label className="form-label">Titre de l'annonce *</label>
                    <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Ex: Appartement 3 pièces – Point E"
                        value={formData.title || ''}
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
                    <label className="form-label">
                        Prix (FCFA{formData.bien_type === 'location' ? '/mois' : ''})
                    </label>
                    <input
                        type="number"
                        required
                        className="form-input"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label flex items-center gap-2">
                        <User size={14} /> Propriétaire
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Nom du propriétaire..."
                        value={formData.owner_name || ''}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label flex items-center gap-2">
                        <UserCheck size={14} /> Agent Responsable
                    </label>
                    <select
                        className="form-select"
                        value={formData.assignedAgent || ''}
                        onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })}
                    >
                        <option value="">Sélectionner un agent...</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.name}>{agent.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group col-2">
                    <label className="form-label">Localisation *</label>
                    <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Ville, quartier..."
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                </div>

                <div className="form-group col-2">
                    <label className="form-label">Description</label>
                    <textarea
                        rows={3}
                        className="form-textarea"
                        placeholder="Détails supplémentaires..."
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="form-actions col-2">
                    <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSaving}>
                        Annuler
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                        {isSaving ? 'Enregistrement...' : (
                            <>
                                <Save size={18} /> {initialData?.id ? 'Enregistrer les modifications' : 'Créer le bien'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GestionForm;
