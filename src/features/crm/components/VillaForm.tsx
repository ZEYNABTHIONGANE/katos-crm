import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import type { Villa } from '../types/land';

interface VillaFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (villa: Partial<Villa>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    initialData?: Villa | null;
}

const emptyVilla: Partial<Villa> = {
    title: '',
    description: '',
    type: '',
    surface: 0,
    price: 0,
    status: 'disponible',
    location: 'Sénégal',
    image_url: '',
};

const VillaForm: React.FC<VillaFormProps> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
    const [form, setForm] = useState<Partial<Villa>>(emptyVilla);
    const [isSaving, setIsSaving] = useState(false);


    useEffect(() => {
        if (initialData) {
            setForm({ ...emptyVilla, ...initialData });
        } else {
            setForm(emptyVilla);
        }
    }, [initialData, isOpen]);

    const handleDelete = async () => {
        if (!initialData?.id || !onDelete) return;
        setIsSaving(true);
        try {
            await onDelete(initialData.id);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(form);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Modifier le modèle de construction' : 'Ajouter un modèle de construction'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="form-grid">
                <div className="form-group col-2">
                    <label className="form-label">Titre du modèle *</label>
                    <input
                        className="form-input"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="Ex: Villa Zahra F3"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label className="form-label">Type (F3, F4, etc.) *</label>
                    <input
                        className="form-input"
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        placeholder="Ex: F4"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label className="form-label">Surface totale (m²)</label>
                    <input
                        className="form-input"
                        type="number"
                        value={form.surface}
                        onChange={e => setForm({ ...form, surface: Number(e.target.value) })}
                    />
                </div>
                
                <div className="form-group col-2">
                    <label className="form-label">Prix Estimé de construction (FCFA) *</label>
                    <input
                        className="form-input"
                        type="number"
                        value={form.price}
                        onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                        required
                    />
                </div>

                <div className="form-actions form-group col-2 mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {initialData && onDelete && (
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                style={{ color: 'var(--danger)', borderColor: 'rgba(225, 29, 72, 0.2)' }}
                                onClick={handleDelete}
                                disabled={isSaving}
                            >
                                Supprimer le modèle
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? 'Enregistrement...' : (initialData ? 'Mettre à jour' : 'Ajouter au catalogue')}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default VillaForm;
