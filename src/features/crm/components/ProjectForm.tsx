import React, { useState } from 'react';
import { Save } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useContactStore } from '@/stores/contactStore';
import { useVillas } from '../api/villaApi';
import type { ConstructionProject } from '../types/land';

interface ProjectFormProps {
    onSave: (data: Omit<ConstructionProject, 'id'>) => void;
    onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSave, onCancel }) => {
    const { contacts } = useContactStore();
    const { data: villas } = useVillas();

    // Filter only active clients
    const clients = contacts.filter(c => c.status === 'Client');

    const [formData, setFormData] = useState({
        contactId: 0,
        villaModelId: '',
        technicianName: '',
        deliveryDate: '',
        teamPlanning: '',
        progress: 0,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.contactId === 0 || !formData.villaModelId) {
            alert('Veuillez sélectionner un client et un modèle de villa');
            return;
        }

        const newProject: Omit<ConstructionProject, 'id'> = {
            contactId: formData.contactId,
            villaModelId: formData.villaModelId,
            technicianName: formData.technicianName,
            deliveryDate: formData.deliveryDate,
            teamPlanning: formData.teamPlanning,
            progress: formData.progress,
            photos: [],
            technicalIssues: [],
            status: 'en_cours',
            created_at: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString().split('T')[0],
        };

        onSave(newProject);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title="Démarrer un nouveau chantier"
            size="md"
        >
            <form onSubmit={handleSubmit} className="premium-form">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Client *</label>
                        <select
                            required
                            className="form-select"
                            value={formData.contactId}
                            onChange={(e) => {
                                const contactId = Number(e.target.value);
                                const contact = contacts.find(c => c.id === contactId);
                                setFormData({
                                    ...formData,
                                    contactId,
                                    villaModelId: contact?.propertyId || formData.villaModelId
                                });
                            }}
                        >
                            <option value={0}>Sélectionner un client...</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name} ({client.company})</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group col-2">
                        <label className="form-label">Modèle de Villa *</label>
                        <select
                            required
                            className="form-select"
                            value={formData.villaModelId}
                            onChange={(e) => setFormData({ ...formData, villaModelId: e.target.value })}
                        >
                            <option value="">Sélectionner un modèle...</option>
                            {villas?.map(villa => (
                                <option key={villa.id} value={villa.id}>{villa.title}</option>
                            ))}
                            <option value="custom">Construction Personnalisée</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Technicien Responsable</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nom du technicien"
                            value={formData.technicianName}
                            onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date de livraison prévue</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.deliveryDate}
                            onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                        />
                    </div>

                    <div className="form-group col-2">
                        <label className="form-label">Planning initial des équipes</label>
                        <textarea
                            rows={2}
                            className="form-textarea"
                            placeholder="Ex: Équipe maçonnerie disponible dès lundi..."
                            value={formData.teamPlanning}
                            onChange={(e) => setFormData({ ...formData, teamPlanning: e.target.value })}
                        ></textarea>
                    </div>
                </div>

                <div className="form-actions mt-6">
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        Annuler
                    </button>
                    <button type="submit" className="btn-primary">
                        <Save size={18} /> Créer le chantier
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ProjectForm;
