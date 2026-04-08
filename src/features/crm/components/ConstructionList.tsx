import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useVillas, useCreateVilla, useUpdateVilla, useDeleteVilla } from '../api/villaApi';
import ProjectManagement from '@/features/crm/components/ProjectManagement';
import VillaCard from './VillaCard';
import VillaForm from './VillaForm';
import type { Villa } from '../types/land';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';

const ConstructionList: React.FC = () => {
    const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
    const [isVillaFormOpen, setIsVillaFormOpen] = useState(false);
    const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'catalog' | 'projects'>('catalog');
    const { showToast } = useToast();
    const { user } = useAuth();

    const { data: villas, isLoading } = useVillas();
    console.log('[ConstructionList] Current user:', user?.id, 'Role:', user?.role);
    const createVilla = useCreateVilla();
    const updateVilla = useUpdateVilla();
    const deleteVilla = useDeleteVilla();

    const filteredVillas = villas?.filter(v => {
        // Restriction par service pour les commerciaux uniquement
        // Les managers et admins devraient pouvoir voir tout le catalogue de construction
        // Restriction par service pour les commerciaux et managers (Superviseurs et Admins voient tout)
        if (user?.role === 'commercial' || user?.role === 'manager') {
            const userSvc = user?.service === 'gestion' ? 'gestion_immobiliere' : user?.service;
            if (userSvc !== 'construction') return false;
        }

        return v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               v.type.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleAddVilla = () => {
        setEditingVilla(null);
        setIsVillaFormOpen(true);
    };

    const handleEditVilla = (villa: Villa) => {
        setEditingVilla(villa);
        setIsVillaFormOpen(true);
    };

    const handleDeleteVilla = async (id: string) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce modèle ?')) {
            try {
                await deleteVilla.mutateAsync(id);
                showToast('Modèle supprimé du catalogue');
                setIsVillaFormOpen(false); // Close form if open
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                showToast('Erreur lors de la suppression : ' + (error instanceof Error ? error.message : 'Permission refusée'), 'error');
            }
        }
    };

    const handleSaveVilla = async (data: Partial<Villa>) => {
        try {
            if (editingVilla) {
                await updateVilla.mutateAsync({ id: editingVilla.id, updates: data });
                showToast('Modèle mis à jour');
            } else {
                await createVilla.mutateAsync(data);
                showToast('Nouveau modèle ajouté au catalogue');
            }
            setIsVillaFormOpen(false);
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de la villa:', error);
            showToast('Erreur lors de l\'enregistrement : ' + (error instanceof Error ? error.message : 'Une erreur inconnue est survenue'), 'error');
        }
    };

    return (
        <div className="real-estate-page">
            <div className="page-header">
                <div>
                    <h1 style={{ fontWeight: 800 }}>Construction</h1>
                    <p className="subtitle">Catalogue des modèles de construction &amp; suivi de chantier</p>
                </div>
                <div className="header-actions">
                    {user?.role !== 'commercial' && (
                        activeTab === 'projects' ? (
                            <button
                                className="btn-primary flex items-center gap-2"
                                onClick={() => setIsProjectFormOpen(true)}
                            >
                                <Plus size={18} /> Nouveau Projet
                            </button>
                        ) : (
                            <button
                                className="btn-primary flex items-center gap-2"
                                onClick={handleAddVilla}
                            >
                                <Plus size={18} /> Nouveau Modèle
                            </button>
                        )
                    )}
                </div>
            </div>

            <div className="tabs-wrapper">
                <div className="tabs-segmented">
                    <button
                        className={`tab-segment ${activeTab === 'catalog' ? 'active' : ''}`}
                        onClick={() => setActiveTab('catalog')}
                    >
                        Modèles de Construction
                    </button>
                    <button
                        className={`tab-segment ${activeTab === 'projects' ? 'active' : ''}`}
                        onClick={() => setActiveTab('projects')}
                    >
                        Suivi de Chantier
                    </button>
                </div>
            </div>

            {activeTab === 'catalog' ? (
                <>
                    <div className="filters-bar mt-6 flex gap-4">
                        <div className="search-input flex-1">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher un modèle ou type..."
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
                        <div className="property-list animate-fade-in">
                            {filteredVillas?.length ? filteredVillas.map((villa) => (
                                <VillaCard
                                    key={villa.id}
                                    villa={villa}
                                    onEdit={handleEditVilla}
                                    onDelete={handleDeleteVilla}
                                />
                            )) : (
                                <div className="col-span-full p-12 text-center text-muted">
                                    Aucun modèle trouvé dans le catalogue.
                                </div>
                            )}
                        </div>
                    )}

                    <VillaForm
                        isOpen={isVillaFormOpen}
                        onClose={() => setIsVillaFormOpen(false)}
                        onSave={handleSaveVilla}
                        onDelete={user?.role !== 'commercial' ? handleDeleteVilla : undefined}
                        initialData={editingVilla}
                    />
                </>
            ) : (
                <ProjectManagement
                    isCreateModalOpen={isProjectFormOpen}
                    setIsCreateModalOpen={setIsProjectFormOpen}
                />
            )}
        </div>
    );
};

export default ConstructionList;
