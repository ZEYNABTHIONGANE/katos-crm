import { useState, useEffect } from 'react';
import { 
    FileText, MessageSquare, 
    CheckCircle2, AlertCircle, ShieldAlert,
    ExternalLink
} from 'lucide-react';
import { 
    fetchIssueReports, createComplianceReport, 
    type ComplianceIssue, type ComplianceReport 
} from '../api/complianceApi';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useContactStore } from '@/stores/contactStore';

interface Props {
    issue: ComplianceIssue;
    onClose: () => void;
}

const ComplianceIssueDetail = ({ issue, onClose }: Props) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { documents } = useContactStore();
    
    const [reports, setReports] = useState<ComplianceReport[]>([]);
    const [newReport, setNewReport] = useState('');
    const [isResolved, setIsResolved] = useState(false);
    const [requiresAdmin, setRequiresAdmin] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const clientDocs = documents.filter(doc => doc.contactId === issue.contactId);

    const loadReports = async () => {
        const data = await fetchIssueReports(issue.id);
        setReports(data);
    };

    useEffect(() => {
        loadReports();
    }, [issue.id]);

    const submitReport = async () => {
        if (!newReport.trim() || !user) return;
        
        setIsSubmitting(true);
        try {
            await createComplianceReport({
                issueId: issue.id,
                agentId: user.id,
                content: newReport,
                isResolved,
                requiresAdmin
            });
            showToast('Rapport enregistré avec succès');
            setNewReport('');
            setIsResolved(false);
            setRequiresAdmin(false);
            loadReports();
            if (isResolved) {
                setTimeout(onClose, 1500);
            }
        } catch (error) {
            showToast('Erreur lors de l\'enregistrement', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="compliance-issue-detail p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Colonne Gauche : Infos & Documents */}
                <div className="lg:col-span-1 border-r border-gray-100 pr-6">
                    <div className="mb-6">
                        <label className="text-[10px] uppercase font-black text-muted tracking-widest mb-2 block">Description du problème</label>
                        <div className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-100 italic">
                            "{issue.description}"
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="text-[10px] uppercase font-black text-muted tracking-widest mb-3 block">Documents du Client</label>
                        {clientDocs.length > 0 ? (
                            <div className="space-y-2">
                                {clientDocs.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-primary/30 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <FileText size={18} className="text-primary/50" />
                                            <span className="text-xs font-bold truncate max-w-[150px]">{doc.name}</span>
                                        </div>
                                        <button className="p-1 px-2 text-[10px] bg-primary/5 text-primary rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold">
                                            Ouvrir <ExternalLink size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted italic">Aucun document chargé pour ce client.</p>
                        )}
                    </div>

                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                            <ShieldAlert size={16} /> Rappel Rôle
                        </h4>
                        <p className="text-[11px] leading-relaxed text-primary/70">
                            Votre rôle est de vérifier que le dossier est complet et que les contrats PDF uploadés sont conformes avant d'autoriser la suite des opérations.
                        </p>
                    </div>
                </div>

                {/* Colonne Droite : Rapports & Actions */}
                <div className="lg:col-span-2">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className="text-primary" />
                            Historique des interventions
                        </h3>
                        
                        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                            {reports.length > 0 ? reports.map(report => (
                                <div key={report.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                    <div className="d-flex-between mb-2">
                                        <span className="text-xs font-bold text-primary">{report.agentName}</span>
                                        <span className="text-[10px] text-muted">{new Date(report.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{report.content}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {report.isResolved && (
                                            <span className="flex items-center gap-1 bg-green-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                                                <CheckCircle2 size={13} /> Problème résolu
                                            </span>
                                        )}
                                        {report.requiresAdmin && (
                                            <span className="flex items-center gap-1 bg-danger/10 text-danger text-[10px] font-bold px-2 py-1 rounded-lg border border-danger/20">
                                                <AlertCircle size={12} /> Besoin intervention Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-muted italic text-center py-10">Aucun rapport rédigé pour le moment.</p>
                            )}
                        </div>

                        {/* Formulaire Nouveau Rapport */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h4 className="text-sm font-bold mb-3">Nouvelle intervention / Rapport</h4>
                            <textarea 
                                className="form-textarea w-full bg-white mb-4" 
                                rows={4} 
                                placeholder="Résumez votre intervention ou les corrections apportées..."
                                value={newReport}
                                onChange={e => setNewReport(e.target.value)}
                            />
                            
                            <div className="flex flex-wrap gap-4 mb-6">
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 px-4 rounded-xl border border-gray-100 shadow-sm">
                                    <input 
                                        type="checkbox" 
                                        checked={isResolved}
                                        onChange={e => setIsResolved(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-xs font-bold text-success flex items-center gap-1">
                                        <CheckCircle2 size={14} /> Marquer comme résolu
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 px-4 rounded-xl border border-gray-100 shadow-sm">
                                    <input 
                                        type="checkbox"
                                        checked={requiresAdmin}
                                        onChange={e => setRequiresAdmin(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-xs font-bold text-danger flex items-center gap-1">
                                        <AlertCircle size={14} /> Nécessite l'Admin
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end">
                                <button 
                                    className="btn-primary" 
                                    onClick={submitReport}
                                    disabled={isSubmitting || !newReport.trim()}
                                >
                                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer le rapport'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplianceIssueDetail;
