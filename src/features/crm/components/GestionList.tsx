import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useImmobilierBiens, useCreateImmobilierBien, useUpdateImmobilierBien, useDeleteImmobilierBien } from '../api/immobilierApi';
import GestionForm from '@/features/crm/components/GestionForm';
import GestionCard from './GestionCard';
import type { ImmobilierBien } from '../types/land';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';

const GestionList: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBien, setEditingBien] = useState<ImmobilierBien | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'location' | 'achat'>('all');
    const { showToast } = useToast();
    const { user } = useAuth();

    const { data: biens, isLoading } = useImmobilierBiens();
    const createMutation = useCreateImmobilierBien();
    const updateMutation = useUpdateImmobilierBien();
    const deleteMutation = useDeleteImmobilierBien();

    const handleSave = async (data: Partial<ImmobilierBien>) => {
        try {
            if (editingBien) {
                await updateMutation.mutateAsync({ id: editingBien.id, updates: data });
                showToast('Bien mis à jour');
            } else {
                await createMutation.mutateAsync(data);
                showToast('Nouveau bien ajouté au catalogue');
            }
            setIsFormOpen(false);
            setEditingBien(null);
        } catch (err) {
            console.error('Erreur lors de la sauvegarde:', err);
            showToast('Erreur lors de la sauvegarde : ' + (err instanceof Error ? err.message : 'Une erreur inconnue est survenue'), 'error');
        }
    };

    const handleEdit = (bien: ImmobilierBien) => {
        setEditingBien(bien);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
            await deleteMutation.mutateAsync(id);
            showToast('Bien supprimé du catalogue');
        }
    };

    const filteredBiens = biens?.filter(b => {
        // Restriction par service pour les commerciaux et managers (Superviseurs et Admins voient tout)
        if (user?.role === 'commercial' || user?.role === 'manager') {
            const userSvc = user?.service === 'gestion' ? 'gestion_immobiliere' : user?.service;
            if (userSvc !== 'gestion_immobiliere') return false;
        }

        const matchSearch =
            b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'all' || b.bien_type === filterType;
        return matchSearch && matchType;
    });

    return (
        <div className="real-estate-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Gestion Immobilière</h1>
                    <p className="subtitle">Catalogue des biens en location &amp; à la vente</p>
                </div>
                {user?.role !== 'commercial' && (
                    <button
                        className="btn-primary"
                        onClick={() => { setEditingBien(null); setIsFormOpen(true); }}
                    >
                        <Plus size={18} /> Nouveau bien
                    </button>
                )}
            </div>

            {/* Filtres */}
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
                <div className="tabs-segmented">
                    {[
                        { k: 'all', l: 'Tous' },
                        { k: 'location', l: 'Location' },
                        { k: 'achat', l: 'Vente' },
                    ].map(f => (
                        <button
                            key={f.k}
                            className={`tab-segment ${filterType === f.k ? 'active' : ''}`}
                            onClick={() => setFilterType(f.k as any)}
                        >
                            {f.l}
                        </button>
                    ))}
                </div>
                <button className="btn-secondary flex items-center gap-2">
                    <Filter size={18} /> Filtres
                </button>
            </div>

            {/* Grille de cartes */}
            {isLoading ? (
                <div className="p-12 text-center">Chargement...</div>
            ) : (
                <div className="property-list animate-fade-in">
                    {filteredBiens?.length ? filteredBiens.map((bien) => (
                        <GestionCard
                            key={bien.id}
                            bien={bien}
                            onEdit={user?.role !== 'commercial' ? handleEdit : undefined}
                            onDelete={user?.role !== 'commercial' ? handleDelete : undefined}
                        />
                    )) : (
                        <div className="col-span-full p-12 text-center text-muted">
                            Aucun bien trouvé dans le catalogue.
                        </div>
                    )}
                </div>
            )}

            <GestionForm
                isOpen={isFormOpen}
                initialData={editingBien || undefined}
                onSave={handleSave}
                onCancel={() => { setIsFormOpen(false); setEditingBien(null); }}
            />
        </div>
    );
};

export default GestionList;
