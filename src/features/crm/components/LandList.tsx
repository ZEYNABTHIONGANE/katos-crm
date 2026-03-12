import React from 'react';
import { Plus, Search, Filter, MapPin, Maximize2, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLands, useCreateLand } from '../api/landApi';
import LandForm from './LandForm';
import type { Land } from '../types/land';

const LandList: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const { data: lands, isLoading, error } = useLands();
    const createMutation = useCreateLand();
    const navigate = useNavigate();

    const handleSave = async (data: Partial<Land>) => {
        try {
            await createMutation.mutateAsync(data);
            setIsFormOpen(false);
        } catch (err) {
            console.error("Erreur lors de la création:", err);
        }
    };

    return (
        <div className="real-estate-page">
            <div className="page-header">
                <div>
                    <h1 style={{ fontWeight: 800 }}>Vente de Terrains</h1>
                    <p className="subtitle">Gestion des terrains</p>
                </div>
                <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => setIsFormOpen(true)}
                >
                    <Plus size={18} /> Nouveau terrain
                </button>
            </div>

            {isFormOpen && (
                <LandForm
                    onSave={handleSave}
                    onCancel={() => setIsFormOpen(false)}
                />
            )}

            <div className="filters-bar mt-6 flex gap-4">
                <div className="search-input flex-1">
                    <Search size={18} />
                    <input type="text" placeholder="Rechercher par titre, lieu ou lot..." />
                </div>
                <button className="btn-secondary flex-1 flex items-center gap-2">
                    <Filter size={18} /> Filtres
                </button>
            </div>

            {isLoading ? (
                <div className="p-12 text-center">Chargement des données...</div>
            ) : error ? (
                <div className="p-12 text-center text-red-500">Une erreur est survenue lors du chargement.</div>
            ) : lands?.length === 0 ? (
                <div className="p-12 text-center text-gray-400">Aucun terrain trouvé.</div>
            ) : (
                <div className="contacts-table-container card-premium mt-8">
                    <table className="contacts-table">
                        <thead>
                            <tr>
                                <th>Terrain / Référence</th>
                                <th>Localisation</th>
                                <th>Surface</th>
                                <th>Prix (FCFA)</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lands?.map((land) => (
                                <tr key={land.id} className="contact-row clickable" onClick={() => navigate(`/foncier/${land.id}`)}>
                                    <td>
                                        <div className="font-medium text-main">{land.title}</div>
                                        <div className="text-sm text-muted">{land.reference}</div>
                                    </td>
                                    <td>
                                        <div className="icon-text text-sm">
                                            <MapPin size={14} className="text-muted" />
                                            <span>{land.location}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="icon-text text-sm">
                                            <Maximize2 size={14} className="text-muted" />
                                            <span>{land.surface} m²</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="font-medium">
                                            {land.price.toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        {land.status === 'vendu' ? <span className="badge badge-success">Vendu</span> :
                                            land.status === 'reserve' ? <span className="badge badge-warning">Réservé</span> :
                                                <span className="badge badge-info">Disponible</span>}
                                    </td>
                                    <td className="actions-cell">
                                        <div className="flex gap-2">
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/foncier/${land.id}`); }}>
                                                <Eye size={16} />
                                            </button>
                                            <button className="btn-icon text-danger" style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LandList;
