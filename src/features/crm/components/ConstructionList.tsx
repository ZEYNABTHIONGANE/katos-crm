import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useVillas } from '../api/villaApi';
import ProjectManagement from '@/features/crm/components/ProjectManagement';

const ConstructionList: React.FC = () => {
    const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'catalog' | 'projects'>('catalog');

    const { data: villas, isLoading } = useVillas();

    const filteredVillas = villas?.filter(v =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="real-estate-page">
            <div className="page-header">
                <div>
                    <h1 style={{ fontWeight: 800 }}>Construction</h1>
                    <p className="subtitle">Catalogue des modèles de villas et projets</p>
                </div>
                <div className="header-actions">
                    {activeTab === 'projects' && (
                        <button
                            className="btn-primary flex items-center gap-2"
                            onClick={() => setIsProjectFormOpen(true)}
                        >
                            <Plus size={18} /> Nouveau Projet
                        </button>
                    )}
                </div>
            </div>

            <div className="tabs-wrapper">
                <div className="tabs-segmented">
                    <button
                        className={`tab-segment ${activeTab === 'catalog' ? 'active' : ''}`}
                        onClick={() => setActiveTab('catalog')}
                    >
                        Catalogue Villas
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
                        <div className="contacts-table-container card-premium mt-8">
                            <table className="contacts-table">
                                <thead>
                                    <tr>
                                        <th>Modèle / Type</th>
                                        <th>Prix Estimé</th>
                                        <th style={{ textAlign: 'right' }}>Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVillas?.length ? filteredVillas.map((villa) => (
                                        <tr key={villa.id} className="contact-row">
                                            <td>
                                                <div className="font-medium text-main">{villa.title}</div>
                                                <div className="text-sm text-muted">{villa.type}</div>
                                            </td>
                                            <td>
                                                <div className="property-price-tag" style={{ border: 'none', background: 'none', padding: 0 }}>
                                                    {new Intl.NumberFormat('fr-FR').format(villa.price)} <small>FCFA</small>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-icon">
                                                    <Search size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="empty-state">Aucun modèle trouvé.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
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
