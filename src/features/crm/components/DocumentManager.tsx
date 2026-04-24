import React, { useState } from 'react';
import { 
    FileText, Upload, Trash2, Download, History, 
    File, FileSpreadsheet, Image as ImageIcon
} from 'lucide-react';
import { useContactStore } from '@/stores/contactStore';
import type { DocumentType, CrmDocument } from '../types/documents';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';

interface DocumentManagerProps {
    contactId: number;
    projectId?: string;
}

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

const DocumentManager: React.FC<DocumentManagerProps> = ({ contactId, projectId }) => {
    const { documents, addDocument, deleteDocument, updateDocumentVersion } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<CrmDocument | null>(null);
    
    const [uploadForm, setUploadForm] = useState({
        name: '',
        type: 'autre' as DocumentType,
        url: 'https://example.com/demo.pdf', // Mock URL
        size: '0.5 MB'
    });

    if (user?.role !== 'admin' && user?.role !== 'dir_commercial' && user?.role !== 'conformite') {
        return null;
    }

    const filteredDocs = documents.filter(doc => {
        if (projectId) return doc.projectId === projectId;
        return doc.contactId === contactId;
    });

    const getFileIcon = (type: string | undefined) => {
        const t = type?.toLowerCase();
        if (t === 'pdf') return <FileText size={20} className="text-red-500" />;
        if (t === 'dwg' || t === 'dxf') return <File size={20} className="text-blue-500" />;
        if (t === 'xls' || t === 'xlsx' || t === 'csv') return <FileSpreadsheet size={20} className="text-green-500" />;
        if (t === 'jpg' || t === 'png' || t === 'webp') return <ImageIcon size={20} className="text-purple-500" />;
        return <File size={20} className="text-gray-400" />;
    };

    const handleUpload = () => {
        if (!uploadForm.name) return;
        addDocument({
            ...uploadForm,
            contactId,
            projectId,
            fileType: 'pdf' // Mock
        });
        showToast('Document ajouté avec succès');
        setShowUploadModal(false);
        setUploadForm({ name: '', type: 'autre', url: 'https://example.com/demo.pdf', size: '0.5 MB' });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            deleteDocument(id);
            showToast('Document supprimé');
        }
    };

    const handleNewVersion = (id: string) => {
        const notes = window.prompt('Note pour cette nouvelle version :');
        if (notes === null) return;
        updateDocumentVersion(id, 'https://example.com/demo_v' + Date.now() + '.pdf', notes || undefined);
        showToast('Nouvelle version ajoutée');
    };

    return (
        <div className="document-manager">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold m-0 text-primary" style={{ border: 'none' }}>Documents & Contrats</h3>
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowUploadModal(true)}>
                    <Upload size={16} /> Télécharger
                </button>
            </div>

            <div className="document-list">
                {filteredDocs.length > 0 ? filteredDocs.map(doc => (
                    <div key={doc.id} className="document-card">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="doc-icon">
                                {getFileIcon(doc.fileType)}
                            </div>
                            <div className="doc-info">
                                <h4 className="doc-name">
                                    {doc.name}
                                    <span className="version-tag">v{doc.version}</span>
                                </h4>
                                <div className="doc-meta">
                                    <span 
                                        className="type-badge" 
                                        style={{ backgroundColor: colorMix(TYPE_COLORS[doc.type], 0.1), color: TYPE_COLORS[doc.type] }}
                                    >
                                        {TYPE_LABELS[doc.type]}
                                    </span>
                                    <span className="size-date">{doc.size} · Mis à jour le {doc.updatedAt}</span>
                                </div>
                            </div>
                        </div>

                        <div className="doc-actions">
                            <button 
                                className="action-btn btn-history" 
                                title="Historique des versions"
                                onClick={() => { setSelectedDoc(doc); setShowHistoryModal(true); }}
                            >
                                <History size={18} />
                            </button>
                            <button className="action-btn btn-download" title="Télécharger">
                                <Download size={18} />
                            </button>
                            <button 
                                className="action-btn" 
                                title="Nouvelle version"
                                onClick={() => handleNewVersion(doc.id)}
                            >
                                <Upload size={18} />
                            </button>
                            <button 
                                className="action-btn btn-delete" 
                                title="Supprimer"
                                onClick={() => handleDelete(doc.id)}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="empty-state">
                        <FileText size={48} className="mx-auto" />
                        <p>Aucun document pour le moment.</p>
                        <button className="mt-4 text-xs font-bold text-primary hover:underline" onClick={() => setShowUploadModal(true)}>
                            Cliquez ici pour ajouter votre premier document
                        </button>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Charger un document" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Nom du document *</label>
                        <input 
                            className="form-input" 
                            value={uploadForm.name} 
                            onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                            placeholder="Ex: Plan technique R+1"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Type de document</label>
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
                    <div className="form-group">
                        <label className="form-label">Fichier</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors cursor-pointer">
                            <div className="space-y-1 text-center">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-indigo-500 focus-within:outline-none">
                                        Cliquez pour uploader
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowUploadModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleUpload}>Confirmer l'upload</button>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Historique des versions" size="md">
                {selectedDoc && (
                    <div className="space-y-4">
                        <div className="mb-4">
                            <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider">{selectedDoc.name}</h4>
                        </div>
                        <div className="space-y-3">
                            {[...selectedDoc.versions].sort((a,b) => b.version - a.version).map(v => (
                                <div key={v.version} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            v{v.version}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">Version {v.version}</div>
                                            <div className="text-[11px] text-gray-400">Ajouté le {v.createdAt} {v.notes ? `· ${v.notes}` : ''}</div>
                                        </div>
                                    </div>
                                    <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// Helper for background color alpha
function colorMix(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default DocumentManager;
