import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLands, useCreateLand, useDeleteLand } from '../api/landApi';
import LandForm from './LandForm';
import LandCard from './LandCard';
import type { Land } from '../types/land';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';

const LandList: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { data: lands, isLoading, error } = useLands();
    const createMutation = useCreateLand();
    const deleteMutation = useDeleteLand();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();

    const handleSave = async (data: Partial<Land>) => {
        try {
            await createMutation.mutateAsync(data);
            setIsFormOpen(false);
            showToast('Nouveau terrain ajouté');
        } catch (err) {
            console.error('Erreur lors de la création:', err);
            showToast('Erreur lors de la création : ' + (err instanceof Error ? err.message : 'Une erreur inconnue est survenue'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce terrain ?')) {
            await deleteMutation.mutateAsync(id);
            showToast('Terrain supprimé');
        }
    };

    const filteredLands = lands?.filter(l => {
        // Restriction par service pour les commerciaux et managers (Superviseurs et Admins voient tout)
        if (user?.role === 'commercial' || user?.role === 'manager') {
            const userSvc = user?.service === 'gestion' ? 'gestion_immobiliere' : user?.service;
            if (userSvc !== 'foncier') return false;
        }

        return l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               l.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
               l.location.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="real-estate-page">
            <div className="page-header">
                <div>
                    <p className="subtitle">Catalogue des parcelles foncières disponibles</p>
                </div>
                {user?.role !== 'commercial' && (
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => setIsFormOpen(true)}
                    >
                        <Plus size={18} /> Nouveau terrain
                    </button>
                )}
            </div>

            {isFormOpen && (
                <LandForm
                    onSave={handleSave}
                    onCancel={() => setIsFormOpen(false)}
                />
            )}

            {/* Barre de recherche */}
            <div className="filters-bar mt-6 flex gap-4">
                <div className="search-input flex-1">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par titre, référence, localisation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Liste des terrains */}
            {isLoading ? (
                <div className="p-12 text-center">Chargement des données...</div>
            ) : error ? (
                <div className="p-12 text-center" style={{ color: 'var(--danger)' }}>
                    Une erreur est survenue lors du chargement.
                </div>
            ) : (
                <div className="property-list mt-8">
                    {filteredLands?.length ? filteredLands.map((land) => (
                        <div key={land.id} onClick={() => navigate(`/foncier/${land.id}`)}>
                            <LandCard
                                land={land}
                                onEdit={() => navigate(`/foncier/${land.id}`)}
                                onDelete={user?.role !== 'commercial' ? (id) => handleDelete(id) : undefined}
                            />
                        </div>
                    )) : (
                        <div className="p-12 text-center text-muted card-premium">
                            Aucun terrain trouvé dans le catalogue.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LandList;
