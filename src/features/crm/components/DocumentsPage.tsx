import { useState, useMemo } from 'react';
import { 
    Search, Filter, FileText, Download, Trash2, 
    User, HardHat, ExternalLink, ShieldAlert,
    Upload, Plus, PieChart, Briefcase, FileCheck, Layers
} from 'lucide-react';
import { useContactStore } from '@/stores/contactStore';
import type { DocumentType } from '../types/documents';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import Modal from '@/components/ui/Modal';
import { useRef } from 'react';

const TYPE_LABELS: Record<DocumentType, string> = {
    contrat: 'Contrat',
    plan: 'Plan / Plan technique',
    devis: 'Devis',
    facture: 'Facture',
    bon_reservation: 'Bon de réservation',
    identite: "Pièce d'identité",
    passeport: 'Passeport',
    autre: 'Autre document'
};

const TYPE_COLORS: Record<DocumentType, string> = {
    contrat: '#2B2E83',
    plan: '#E96C2E',
    devis: '#10B981',
    facture: '#F59E0B',
    bon_reservation: '#EF4444',
    identite: '#8B5CF6',
    passeport: '#EC4899',
    autre: '#64748b'
};

const DocumentsPage = () => {
    const { documents, contacts, constructionProjects, deleteDocument, addDocument } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();
    
    // Permissions : Admin, Directeur, Responsable, Conformité
    const hasAccess = useMemo(() => {
        return ['admin', 'dir_commercial', 'resp_commercial', 'conformite'].includes(user?.role || '');
    }, [user]);

    const canUpload = useMemo(() => {
        return ['admin', 'dir_commercial', 'resp_commercial'].includes(user?.role || '');
    }, [user]);

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    const [uploadForm, setUploadForm] = useState({
        name: '',
        type: 'autre' as DocumentType,
        contactId: '',
        projectId: '',
        propertyId: '',
        propertyType: '' as 'land' | 'villa' | '',
        url: 'https://example.com/demo.pdf', // Mock
        size: ''
    });

    if (!hasAccess) {
        return (
            <div className="p-20 text-center card-premium m-20">
                <h2 className="text-danger flex items-center justify-center gap-2 mb-4">
                    <ShieldAlert size={24} /> Accès Refusé
                </h2>
                <p className="text-muted">Vous n'avez pas les permissions nécessaires pour accéder à la gestion documentaire complète.</p>
                <div className="mt-6">
                    <button className="btn-primary" onClick={() => window.history.back()}>Retour</button>
                </div>
            </div>
        );
    }
    
    // Stats calculation
    const stats = useMemo(() => {
        return {
            total: documents.length,
            contracts: documents.filter(d => d.type === 'contrat').length,
            plans: documents.filter(d => d.type === 'plan').length,
            invoices: documents.filter(d => d.type === 'facture').length
        };
    }, [documents]);

    const getContactName = (id: number) => contacts.find(c => c.id === id)?.name || 'Inconnu';
    
    const getPropertyInfo = (doc: any) => {
        if (doc.projectId) return `Chantier #${doc.projectId}`;
        if (doc.propertyId) {
            const contact = contacts.find(c => c.id === doc.contactId);
            return contact?.propertyTitle || `Bien #${doc.propertyId}`;
        }
        return null;
    };

    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               getContactName(doc.contactId).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === 'all' || doc.type === typeFilter;
            return matchesSearch && matchesType;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [documents, searchTerm, typeFilter, contacts]);

    const handleUpload = () => {
        if (!uploadForm.name || !uploadForm.contactId) {
            showToast('Veuillez remplir les champs obligatoires');
            return;
        }
        addDocument({
            name: uploadForm.name,
            type: uploadForm.type,
            contactId: parseInt(uploadForm.contactId),
            projectId: uploadForm.projectId || undefined,
            propertyId: uploadForm.propertyId || undefined,
            propertyType: uploadForm.propertyType || undefined,
            url: uploadForm.url,
            size: uploadForm.size || '1.2 MB',
            fileType: selectedFile?.name.split('.').pop() || 'pdf'
        });
        showToast('Document ajouté avec succès');
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadForm({ 
            name: '', 
            type: 'autre', 
            contactId: '', 
            projectId: '', 
            propertyId: '',
            propertyType: '',
            url: 'https://example.com/demo.pdf', 
            size: '' 
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            // Auto-fill name if empty
            if (!uploadForm.name) {
                setUploadForm(prev => ({ ...prev, name: file.name.split('.')[0] }));
            }
            setUploadForm(prev => ({ ...prev, size: (file.size / (1024 * 1024)).toFixed(1) + ' MB' }));
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Supprimer ce document ?')) {
            deleteDocument(id);
            showToast('Document supprimé');
        }
    };

    return (
        <div className="documents-page">
            <div className="page-header d-flex justify-between align-center">
                <div>
                    <h1>Espace Documentaire</h1>
                    <p className="subtitle">Gestion centralisée des contrats, plans et factures</p>
                </div>
                {canUpload && (
                    <button className="btn-primary flex items-center gap-2" onClick={() => setShowUploadModal(true)}>
                        <Plus size={20} /> Nouveau Document
                    </button>
                )}
            </div>

            {/* Stats Overview */}
            <div className="doc-stats-grid">
                <div className="doc-stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #2B2E83 0%, #3B82F6 100%)' }}>
                        <Layers size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Documents</span>
                    </div>
                </div>
                <div className="doc-stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' }}>
                        <FileCheck size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.contracts}</span>
                        <span className="stat-label">Contrats Signés</span>
                    </div>
                </div>
                <div className="doc-stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #E96C2E 0%, #FB923C 100%)' }}>
                        <Briefcase size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.plans}</span>
                        <span className="stat-label">Plans & Techniques</span>
                    </div>
                </div>
                <div className="doc-stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' }}>
                        <PieChart size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.invoices}</span>
                        <span className="stat-label">Factures & Devis</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="filters-bar d-flex gap-3">
                <div className="search-input flex-1 d-flex align-center px-4 bg-white/50 rounded-xl border border-white">
                    <Search size={18} className="text-muted mr-2" />
                    <input 
                        type="text" 
                        placeholder="Rechercher un document ou un client..."
                        className="bg-transparent border-none outline-none py-3 w-full text-sm font-semibold"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="type-selector d-flex align-center px-4 bg-white/50 rounded-xl border border-white">
                    <Filter size={18} className="text-muted mr-2" />
                    <select 
                        className="bg-transparent border-none outline-none py-3 text-sm font-bold cursor-pointer"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                    >
                        <option value="all">Toutes les catégories</option>
                        {Object.entries(TYPE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table View */}
            <div className="card-premium p-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)' }}>
                <table className="rpt-table w-full">
                    <thead>
                        <tr>
                            <th>Document</th>
                            <th>Catégorie</th>
                            <th>Client / Projet</th>
                            <th>Version</th>
                            <th>Modifié le</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDocs.length > 0 ? filteredDocs.map(doc => (
                            <tr key={doc.id}>
                                <td>
                                    <div className="d-flex align-center gap-3">
                                        <div className="file-type-icon">
                                            <FileText size={20} style={{ color: TYPE_COLORS[doc.type] }} />
                                        </div>
                                        <span className="font-bold text-sm text-slate-800">{doc.name}</span>
                                    </div>
                                </td>
                                <td>
                                    <span 
                                        className="text-[10px] uppercase font-black px-3 py-1 rounded-full" 
                                        style={{ backgroundColor: colorMix(TYPE_COLORS[doc.type], 0.1), color: TYPE_COLORS[doc.type] }}
                                    >
                                        {TYPE_LABELS[doc.type]}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex flex-col">
                                        <span className="text-sm font-bold d-flex align-center gap-1 text-slate-700">
                                            <User size={12} className="text-muted" />
                                            {getContactName(doc.contactId)}
                                        </span>
                                        {getPropertyInfo(doc) && (
                                            <span className="text-[10px] font-bold text-secondary mt-1">
                                                <HardHat size={10} className="mr-1" />
                                                {getPropertyInfo(doc)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="text-xs font-extrabold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">v{doc.version}</span>
                                </td>
                                <td>
                                    <span className="text-xs font-medium text-slate-400">{doc.updatedAt}</span>
                                </td>
                                <td>
                                    <div className="d-flex justify-end gap-1">
                                        <button className="p-2 text-slate-400 hover:text-primary transition-colors" title="Ouvrir">
                                            <ExternalLink size={18} />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-green-600 transition-colors" title="Télécharger">
                                            <Download size={18} />
                                        </button>
                                        <button 
                                            className="p-2 text-slate-400 hover:text-danger transition-colors" 
                                            title="Supprimer"
                                            onClick={() => handleDelete(doc.id)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="p-20 text-center text-muted font-medium italic">
                                    Aucun document trouvé pour ces critères.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Global Upload Modal */}
            <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Ajouter un nouveau document" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Nom du document *</label>
                        <input 
                            className="form-input" 
                            placeholder="Ex: Contrat de vente finalisé"
                            value={uploadForm.name}
                            onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Catégorie</label>
                        <select 
                            className="form-select"
                            value={uploadForm.type}
                            onChange={e => setUploadForm({ ...uploadForm, type: e.target.value as DocumentType })}
                        >
                            {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Associer à un client *</label>
                        <select 
                            className="form-select"
                            value={uploadForm.contactId}
                            onChange={e => setUploadForm({ ...uploadForm, contactId: e.target.value })}
                        >
                            <option value="">Sélectionnez un client...</option>
                            {contacts.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.company || 'Particulier'})</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Lier à un objet (Vente, Location, Chantier)</label>
                        <p className="text-[10px] text-muted mb-2">Sélectionnez le contexte spécifique de ce document.</p>
                        <select 
                            className="form-select"
                            value={uploadForm.projectId || (uploadForm.propertyId ? 'prop' : '')}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'prop') {
                                    const contact = contacts.find(c => c.id === parseInt(uploadForm.contactId));
                                    setUploadForm({ 
                                        ...uploadForm, 
                                        projectId: '', 
                                        propertyId: contact?.propertyId || '', 
                                        propertyType: (contact?.service === 'foncier' ? 'land' : 'villa') 
                                    });
                                } else if (val.startsWith('proj_')) {
                                    setUploadForm({ 
                                        ...uploadForm, 
                                        projectId: val.replace('proj_', ''), 
                                        propertyId: '', 
                                        propertyType: '' 
                                    });
                                } else {
                                    setUploadForm({ ...uploadForm, projectId: '', propertyId: '', propertyType: '' });
                                }
                            }}
                            disabled={!uploadForm.contactId}
                        >
                            <option value="">Document général (KYC / Dossier client)</option>
                            
                            {/* Option pour le bien principal (Land/Villa) */}
                            {(() => {
                                const contact = contacts.find(c => c.id === parseInt(uploadForm.contactId));
                                if (contact?.propertyId) {
                                    const label = contact.service === 'foncier' ? 'Vente Terrain' : 'Achat/Location Villa';
                                    return <option value="prop">{label} : {contact.propertyTitle || contact.propertyId}</option>;
                                }
                                return null;
                            })()}

                            {/* Options pour les chantiers */}
                            {constructionProjects
                                .filter(p => p.contactId === parseInt(uploadForm.contactId))
                                .map(p => (
                                    <option key={p.id} value={`proj_${p.id}`}>Chantier #{p.id} ({p.technicianName || 'Sans technicien'})</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Fichier</label>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                        />
                        <div 
                            className={`upload-dropzone p-8 border-2 border-dashed ${selectedFile ? 'border-primary bg-primary/5' : 'border-slate-200'} rounded-xl text-center hover:border-primary transition-colors cursor-pointer`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className={`mx-auto ${selectedFile ? 'text-primary' : 'text-muted'} mb-2`} size={32} />
                            <p className="text-xs font-bold text-slate-500">
                                {selectedFile ? `Fichier sélectionné : ${selectedFile.name}` : 'Cliquez pour sélectionner un fichier'}
                            </p>
                            <p className="text-[10px] text-muted mt-1">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                    </div>
                </div>
                <div className="form-actions mt-6">
                    <button className="btn-secondary" onClick={() => setShowUploadModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleUpload}>Ajouter au système</button>
                </div>
            </Modal>
        </div>
    );
};

function colorMix(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default DocumentsPage;
