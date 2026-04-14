import { useState, useMemo } from 'react';
import { 
    Search, Filter, FileText, Download, Trash2, 
    User, HardHat, ExternalLink
} from 'lucide-react';
import { useContactStore } from '@/stores/contactStore';
import type { DocumentType } from '../types/documents';
import { useToast } from '@/app/providers/ToastProvider';

const TYPE_LABELS: Record<DocumentType, string> = {
    contrat: 'Contrat',
    plan: 'Plan / Plan technique',
    devis: 'Devis',
    facture: 'Facture',
    bon_reservation: 'Bon de réservation',
    autre: 'Autre document'
};

const TYPE_COLORS: Record<DocumentType, string> = {
    contrat: '#2B2E83',
    plan: '#E96C2E',
    devis: '#10B981',
    facture: '#F59E0B',
    bon_reservation: '#EF4444',
    autre: '#64748b'
};

const DocumentsPage = () => {
    const { documents, contacts, constructionProjects, deleteDocument } = useContactStore();
    const { showToast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');

    const getContactName = (id: number) => contacts.find(c => c.id === id)?.name || 'Inconnu';
    const getProjectName = (id?: string) => {
        if (!id) return null;
        const project = constructionProjects.find(p => p.id === id);
        return project ? `Chantier #${project.id}` : null;
    };

    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               getContactName(doc.contactId).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === 'all' || doc.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [documents, searchTerm, typeFilter, contacts]);

    const handleDelete = (id: string) => {
        if (window.confirm('Supprimer ce document ?')) {
            deleteDocument(id);
            showToast('Document supprimé');
        }
    };

    return (
        <div className="documents-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Gestion Documentaire</h1>
                    <p className="subtitle">Centralisez et sécurisez tous vos actifs documentaires</p>
                </div>
            </div>

            <div className="filters-bar p-2 rounded-2xl flex gap-3 mb-8">
                <div className="search-input flex-1 flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <Search size={18} className="text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Rechercher par nom de document ou client..."
                        className="bg-transparent border-none outline-none p-3 w-full text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
                    <Filter size={18} className="text-gray-400 mr-2" />
                    <select 
                        className="bg-transparent border-none outline-none text-sm py-3 font-medium cursor-pointer"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                    >
                        <option value="all">Tous les types</option>
                        {Object.entries(TYPE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card-premium p-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)' }}>
                <table className="rpt-table w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="text-left p-4 text-[10px] uppercase text-gray-400 font-extrabold tracking-wider">Document</th>
                            <th className="text-left p-4 text-[10px] uppercase text-gray-400 font-extrabold tracking-wider">Type</th>
                            <th className="text-left p-4 text-[10px] uppercase text-gray-400 font-extrabold tracking-wider">Client / Projet</th>
                            <th className="text-left p-4 text-[10px] uppercase text-gray-400 font-extrabold tracking-wider">Version</th>
                            <th className="text-left p-4 text-[10px] uppercase text-gray-400 font-extrabold tracking-wider">Dernière MAJ</th>
                            <th className="text-right p-4 text-[10px] uppercase text-gray-400 font-extrabold tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDocs.length > 0 ? filteredDocs.map(doc => (
                            <tr key={doc.id} className="hover:bg-white/80 transition-all cursor-default group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-primary/5 text-primary rounded-xl group-hover:scale-110 transition-transform">
                                            <FileText size={20} />
                                        </div>
                                        <span className="font-bold text-sm text-text-main">{doc.name}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span 
                                        className="text-[10px] uppercase font-black px-3 py-1 rounded-full" 
                                        style={{ backgroundColor: colorMix(TYPE_COLORS[doc.type], 0.1), color: TYPE_COLORS[doc.type] }}
                                    >
                                        {TYPE_LABELS[doc.type]}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold flex items-center gap-1.5 text-text-main">
                                            <User size={14} className="text-primary/40" />
                                            {getContactName(doc.contactId)}
                                        </span>
                                        {doc.projectId && (
                                            <span className="text-[11px] text-secondary font-bold flex items-center gap-1.5 mt-1 bg-secondary/5 w-fit px-2 py-0.5 rounded-md">
                                                <HardHat size={12} />
                                                {getProjectName(doc.projectId)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="text-xs font-black bg-gray-100 px-2.5 py-1 rounded-lg text-gray-600 border border-gray-200/50">v{doc.version}</span>
                                </td>
                                <td className="p-4 text-xs font-medium text-gray-500">{doc.updatedAt}</td>
                                <td className="p-4">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all" title="Ouvrir">
                                            <ExternalLink size={18} />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all" title="Télécharger">
                                            <Download size={18} />
                                        </button>
                                        <button 
                                            className="p-2 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-xl transition-all" 
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
                                <td colSpan={6} className="p-20 text-center text-gray-400 font-medium italic">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <Search size={48} />
                                        <p>Aucun document ne correspond à votre recherche.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
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

export default DocumentsPage;
