import React, { useState } from 'react';
import { HardHat, Camera, AlertTriangle, Calendar, User, MapPin, Search, Filter } from 'lucide-react';
import { useContactStore } from '@/stores/contactStore';
import { useVillas } from '../api/villaApi';
import type { ConstructionProject } from '../types/land';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/app/providers/ToastProvider';

import ProjectForm from './ProjectForm';
import DocumentManager from './DocumentManager';

interface ProjectManagementProps {
    isCreateModalOpen: boolean;
    setIsCreateModalOpen: (open: boolean) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ isCreateModalOpen, setIsCreateModalOpen }) => {
    const { constructionProjects, contacts, updateProject, addProject } = useContactStore();
    const { data: villas } = useVillas();
    const { showToast } = useToast();
    const [selectedProject, setSelectedProject] = useState<ConstructionProject | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Filtering state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'en_cours' | 'termine'>('all');

    // Form state for updates
    const [progress, setProgress] = useState(0);
    const [techNote, setTechNote] = useState('');
    const [planning, setPlanning] = useState('');
    const [delivery, setDelivery] = useState('');

    const handleOpenEdit = (project: ConstructionProject) => {
        setSelectedProject(project);
        setProgress(project.progress);
        setPlanning(project.teamPlanning);
        setDelivery(project.deliveryDate);
        setIsEditModalOpen(true);
    };

    const handleUpdate = () => {
        if (!selectedProject) return;

        const updates: Partial<ConstructionProject> = {
            progress,
            teamPlanning: planning,
            deliveryDate: delivery,
        };

        if (techNote.trim()) {
            updates.technicalIssues = [...selectedProject.technicalIssues, techNote];
        }

        updateProject(selectedProject.id, updates);
        showToast('Suivi de chantier mis à jour avec succès');
        setIsEditModalOpen(false);
        setTechNote('');
    };

    const handleAdd = (data: Omit<ConstructionProject, 'id'>) => {
        addProject(data);
        showToast('Nouveau chantier créé avec succès');
        setIsCreateModalOpen(false);
    };

    const getContactName = (id: number) => contacts.find(c => c.id === id)?.name || 'Inconnu';
    const getContactAddress = (id: number) => contacts.find(c => c.id === id)?.address || 'Adresse non renseignée';
    const getContactAgent = (id: number) => contacts.find(c => c.id === id)?.assignedAgent || 'Non assigné';
    const getVillaTitle = (id: string) => villas?.find(v => v.id === id)?.title || 'Modèle personnalisé';

    const filteredProjects = constructionProjects.filter(project => {
        const contactName = getContactName(project.contactId).toLowerCase();
        const villaTitle = getVillaTitle(project.villaModelId).toLowerCase();
        const technician = project.technicianName.toLowerCase();
        const search = searchTerm.toLowerCase();

        const matchesSearch = contactName.includes(search) ||
            villaTitle.includes(search) ||
            technician.includes(search);

        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="project-management-container">
            <div className="filters-bar mt-6 flex gap-4">
                <div className="search-input flex-1">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par client, villa ou technicien..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group flex items-center bg-white border rounded-lg px-3 shadow-sm">
                    <Filter size={18} className="text-muted mr-2" />
                    <select
                        className="bg-transparent border-none outline-none text-sm py-2"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">Tous les chantiers</option>
                        <option value="en_cours">En cours</option>
                        <option value="termine">Terminés</option>
                    </select>
                </div>
            </div>

            <div className="projects-grid mt-8">
                {filteredProjects.length > 0 ? filteredProjects.map((project) => (
                    <div key={project.id} className="project-card-technical">
                        <div className="project-header">
                            <div>
                                <h3 className="flex items-center gap-2">
                                    <HardHat size={18} />
                                    {getVillaTitle(project.villaModelId)}
                                </h3>
                                <div className="client-name">Client : {getContactName(project.contactId)}</div>
                                <div className="text-xs text-muted mt-1 flex items-center gap-1">
                                    <MapPin size={12} />
                                    {getContactAddress(project.contactId)}
                                </div>
                            </div>
                            <span className={`status-pill pill-${project.status === 'en_cours' ? 'warning' : 'success'}`}>
                                {project.status === 'en_cours' ? 'En cours' : 'Terminé'}
                            </span>
                        </div>

                        <div className="project-progress-section">
                            <div className="progress-header">
                                <span className="progress-label">Avancement</span>
                                <span className="progress-value">{project.progress}%</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${project.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="project-details">
                            <div className="detail-item">
                                <Calendar size={18} />
                                <div>
                                    <div className="detail-label">Livraison prévue</div>
                                    <div className="detail-value">{project.deliveryDate || 'Non fixée'}</div>
                                </div>
                            </div>
                            <div className="detail-item">
                                <User size={18} />
                                <div>
                                    <div className="detail-label">Commercial Référent</div>
                                    <div className="detail-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>{getContactAgent(project.contactId)}</div>
                                </div>
                            </div>
                            <div className="detail-item">
                                <HardHat size={18} />
                                <div>
                                    <div className="detail-label">Technicien responsable</div>
                                    <div className="detail-value">{project.technicianName}</div>
                                </div>
                            </div>

                            {project.technicalIssues.length > 0 && (
                                <div className="issues-alert">
                                    <div className="alert-title">
                                        <AlertTriangle size={14} /> Points d'attention ({project.technicalIssues.length})
                                    </div>
                                    <ul>
                                        {project.technicalIssues.map((issue, i) => (
                                            <li key={i}>{issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="mt-6 border-t pt-4">
                                <DocumentManager contactId={project.contactId} projectId={project.id} />
                            </div>
                        </div>

                        <div className="project-footer">
                            <button
                                className="btn-update"
                                onClick={() => handleOpenEdit(project)}
                            >
                                Mettre à jour le suivi
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="empty-state p-12 card-premium text-center" style={{ gridColumn: '1 / -1' }}>
                        <HardHat size={48} className="mx-auto text-muted mb-4 opacity-20" />
                        <p className="text-muted">Aucun chantier ne correspond à votre recherche.</p>
                    </div>
                )}
            </div>

            {/* update Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Mise à jour technique du chantier" size="lg">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Taux d'avancement (%)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="range"
                                style={{ flex: 1, accentColor: '#f59e0b' }}
                                min="0" max="100"
                                value={progress}
                                onChange={(e) => setProgress(parseInt(e.target.value))}
                            />
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', width: '3.5rem', textAlign: 'right' }}>{progress}%</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Planning des équipes</label>
                        <textarea
                            className="form-textarea"
                            rows={3}
                            value={planning}
                            onChange={(e) => setPlanning(e.target.value)}
                            placeholder="Ex: Équipe gros œuvre présente de 7h à 18h..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date de livraison prévue</label>
                        <input
                            className="form-input"
                            type="date"
                            value={delivery}
                            onChange={(e) => setDelivery(e.target.value)}
                        />
                    </div>

                    <div className="form-group col-2">
                        <label className="form-label flex items-center gap-2" style={{ color: '#e11d48' }}>
                            <AlertTriangle size={16} />
                            Ajouter un Point d'attention (Problème Technique)
                        </label>

                        {selectedProject?.technicalIssues && selectedProject.technicalIssues.length > 0 && (
                            <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                <p className="text-xs font-bold uppercase text-red-600 mb-2">Historique des points d'attention :</p>
                                <ul className="text-sm text-red-800 space-y-1 ml-4 list-disc">
                                    {selectedProject.technicalIssues.map((issue, idx) => (
                                        <li key={idx}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <textarea
                            className="form-textarea"
                            style={{ borderColor: '#fecaca', background: '#fff9f9' }}
                            rows={2}
                            value={techNote}
                            onChange={(e) => setTechNote(e.target.value)}
                            placeholder="Décrivez ici le problème rencontré sur le terrain..."
                        />
                    </div>

                    <div className="form-group col-2">
                        <label className="form-label">Photos du chantier (URLs)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                                <Camera size={24} />
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 'auto' }}>Ajouter des photos du terrain ou du bâtiment pour le suivi client.</p>
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Annuler</button>
                    <button className="btn-primary" style={{ background: '#f59e0b' }} onClick={handleUpdate}>Enregistrer les modifications</button>
                </div>
            </Modal>

            {/* create Modal */}
            {isCreateModalOpen && (
                <ProjectForm
                    onSave={handleAdd}
                    onCancel={() => setIsCreateModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ProjectManagement;
