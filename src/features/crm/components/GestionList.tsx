import React, { useState } from 'react';
import { Plus, Search, Filter, MapPin, Tag, Trash2, Eye } from 'lucide-react';
import { useImmobilierBiens, useCreateImmobilierBien, useUpdateImmobilierBien, useDeleteImmobilierBien } from '../api/immobilierApi';
import GestionForm from '@/features/crm/components/GestionForm';
import type { ImmobilierBien } from '../types/land';

const GestionList: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBien, setEditingBien] = useState<ImmobilierBien | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: biens, isLoading } = useImmobilierBiens();
    const createMutation = useCreateImmobilierBien();
    const updateMutation = useUpdateImmobilierBien();
    const deleteMutation = useDeleteImmobilierBien();

    const handleSave = async (data: Partial<ImmobilierBien>) => {
        try {
            if (editingBien) {
                await updateMutation.mutateAsync({ id: editingBien.id, updates: data });
            } else {
                await createMutation.mutateAsync(data);
            }
            setIsFormOpen(false);
            setEditingBien(null);
        } catch (err) {
            console.error("Erreur lors de la sauvegarde:", err);
        }
    };

    const handleEdit = (bien: ImmobilierBien) => {
        setEditingBien(bien);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const filteredBiens = biens?.filter(b =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="real-estate-page">
            <div className="page-header">
                <div>
                    <h1>Gestion Immobilière</h1>
                    <p className="subtitle">Location et vente de biens immobiliers</p>
                </div>
                <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => { setEditingBien(null); setIsFormOpen(true); }}
                >
                    <Plus size={18} /> Nouveau bien
                </button>
            </div>

            {isFormOpen && (
                <GestionForm
                    initialData={editingBien || undefined}
                    onSave={handleSave}
                    onCancel={() => { setIsFormOpen(false); setEditingBien(null); }}
                />
            )}

            <div className="filters-bar mt-6 flex gap-4">
                <div className="search-input flex-1">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par titre, ville, quartier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-secondary flex items-center gap-2">
                    <Filter size={18} /> Filtres
                </button>
            </div>

            {isLoading ? (
                <div className="p-12 text-center">Chargement...</div>
            ) : (
                <div className="contacts-table-container card-premium mt-8">
                    <table className="contacts-table">
                        <thead>
                            <tr>
                                <th>Bien / Type</th>
                                <th>Localisation</th>
                                <th>Surface</th>
                                <th>Prix (FCFA)</th>
                                <th>Commercial</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBiens?.length ? filteredBiens.map((bien) => (
                                <tr key={bien.id} className="contact-row clickable" onClick={() => handleEdit(bien)}>
                                    <td>
                                        <div className="font-medium text-main">{bien.title}</div>
                                        <div className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                                            {bien.bien_type === 'location' ? 'Location' : 'Vente'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="icon-text text-sm">
                                            <MapPin size={14} className="text-muted" />
                                            <span>{bien.location}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="icon-text text-sm">
                                            <Tag size={14} className="text-muted" />
                                            <span>{bien.surface} m²</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="font-medium">
                                            {new Intl.NumberFormat('fr-FR').format(bien.price)}
                                            {bien.bien_type === 'location' && <small> / mois</small>}
                                        </div>
                                    </td>
                                    <td>
                                        {bien.assignedAgent ? (
                                            <div className="text-sm font-medium" style={{ color: 'var(--primary)' }}>{bien.assignedAgent}</div>
                                        ) : <span className="text-sm text-muted">—</span>}
                                    </td>
                                    <td className="actions-cell">
                                        <div className="flex gap-2">
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEdit(bien); }}>
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="btn-icon text-danger"
                                                onClick={(e) => handleDelete(bien.id, e)}
                                                style={{ color: 'var(--danger)' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="empty-state">Aucun bien trouvé.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default GestionList;
