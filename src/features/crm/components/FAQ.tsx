import React, { useState, useEffect, useMemo } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp, FileText, Landmark, Clock, ShieldCheck, Send, MessageSquare, User, History, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useFaqStore } from '@/stores/faqStore';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/app/providers/ToastProvider';
import type { FaqRequest, FaqEntry } from '../api/faqApi';
import { Trash2, PlusCircle } from 'lucide-react';


const CATEGORIES = [
    { id: 'all', label: 'Toutes les questions', icon: <HelpCircle size={16} /> },
    { id: 'client', label: 'Dossier Client', icon: <FileText size={16} /> },
    { id: 'admin', label: 'Administration', icon: <ShieldCheck size={16} /> },
    { id: 'finance', label: 'Financement', icon: <Landmark size={16} /> },
    { id: 'technique', label: 'Technique & Délais', icon: <Clock size={16} /> },
];

const FAQAccordion: React.FC<{ 
    item: FaqEntry, 
    canManage: boolean, 
    onDelete?: (id: string) => void 
}> = ({ item, canManage, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`faq-item-card ${isOpen ? 'open' : ''}`}>
            <div className="faq-question" onClick={() => setIsOpen(!isOpen)}>
                <div className="faq-question-content">
                    <span className={`category-tag tag-${item.category}`}>
                        {item.category === 'client' ? 'Dossier' : 
                         item.category === 'admin' ? 'Admin' : 
                         item.category === 'finance' ? 'Finance' : 
                         item.category === 'technique' ? 'Tech' : 'Général'}
                    </span>
                    <h3>{item.question}</h3>
                </div>
                <div className="d-flex items-center gap-3">
                    {canManage && (
                        <button 
                            className="btn-icon text-danger opacity-50 hover-opacity-100" 
                            onClick={(e) => { e.stopPropagation(); if(onDelete) onDelete(item.id); }}
                            title="Supprimer cette procédure"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>
            {isOpen && (
                <div className="faq-answer animate-slide-down">
                    <div className="answer-text">
                        {item.answer.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const FAQ = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { requests, faqEntries, loading, fetchRequests, addRequest, submitReply, fetchPublicEntries, addPublicEntry, removePublicEntry } = useFaqStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeTab, setActiveTab] = useState<'guide' | 'messages'>('guide');
    
    // Modals state
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [showAddFaqModal, setShowAddFaqModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [newQuestion, setNewQuestion] = useState({ subject: '', message: '' });
    const [newFaq, setNewFaq] = useState({ 
        question: '', 
        answer: '', 
        category: 'general' as FaqEntry['category']
    });
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isManager = ['admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager'].includes(user?.role || '');
    const canManageFaq = ['admin', 'dir_commercial', 'superviseur', 'resp_commercial'].includes(user?.role || '');

    useEffect(() => {
        if (user) {
            fetchRequests(user.id, user.role);
            fetchPublicEntries();
        }
    }, [user, activeTab, fetchRequests, fetchPublicEntries]);

    const handleSendQuestion = async () => {
        if (!newQuestion.subject || !newQuestion.message) {
            showToast('Veuillez remplir tous les champs', 'error');
            return;
        }
        
        if (!user?.parent_id) {
            showToast('Aucun manager rattaché à votre profil. Contactez l\'administrateur.', 'error');
            return;
        }

        setIsSubmitting(true);
        const ok = await addRequest({
            sender_id: user.id,
            sender_name: user.name,
            receiver_id: user.parent_id,
            subject: newQuestion.subject,
            message: newQuestion.message
        });

        if (ok) {
            showToast('Question envoyée avec succès !');
            setShowQuestionModal(false);
            setNewQuestion({ subject: '', message: '' });
        } else {
            showToast('Erreur lors de l\'envoi', 'error');
        }
        setIsSubmitting(false);
    };

    const handleSendReply = async () => {
        if (!replyText) return;
        setIsSubmitting(true);
        const ok = await submitReply(selectedRequest.id, replyText);
        if (ok) {
            showToast('Réponse envoyée !');
            setShowReplyModal(false);
            setReplyText('');
        } else {
            showToast('Erreur lors de l\'envoi', 'error');
        }
        setIsSubmitting(false);
    };

    const handleAddFaq = async () => {
        if (!newFaq.question || !newFaq.answer) {
            showToast('Veuillez remplir tous les champs', 'error');
            return;
        }

        setIsSubmitting(true);
        const ok = await addPublicEntry(newFaq);
        if (ok) {
            showToast('Procédure ajoutée avec succès');
            setShowAddFaqModal(false);
            setNewFaq({ question: '', answer: '', category: 'general' });
        } else {
            showToast('Erreur lors de l\'ajout', 'error');
        }
        setIsSubmitting(true);
    };

    const handleDeleteFaq = async (id: string) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cette procédure ?')) return;
        const ok = await removePublicEntry(id);
        if (ok) {
            showToast('Procédure supprimée');
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    };

    const filteredFAQ = useMemo(() => {
        return faqEntries.filter(item => {
            const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 item.answer.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, activeCategory, faqEntries]);

    return (
        <div className="faq-page-container">
            <div className="page-header">
                <div>
                    <h1 className="text-katos-blue" style={{ fontWeight: 800 }}>Guide & FAQ Commerciaux</h1>
                    <p className="subtitle">Retrouvez toutes les procédures et réponses aux questions fréquentes.</p>
                </div>
                
                <div className="d-flex items-center gap-6">
                    {activeTab === 'guide' && canManageFaq && (
                        <button className="btn-primary" onClick={() => setShowAddFaqModal(true)}>
                            <PlusCircle size={18} /> Ajouter une Procédure
                        </button>
                    )}
                    <div className="d-flex gap-6">
                        <button 
                            className={`tab-toggle-btn ${activeTab === 'guide' ? 'active' : ''}`}
                            onClick={() => setActiveTab('guide')}
                        >
                            <HelpCircle size={18} /> Guide Public
                        </button>
                        <button 
                            className={`tab-toggle-btn ${activeTab === 'messages' ? 'active' : ''}`}
                            onClick={() => setActiveTab('messages')}
                        >
                            <MessageSquare size={18} /> 
                            {canManageFaq ? 'Toutes les Questions' : isManager ? 'Questions d\'Équipe' : 'Mes Échanges'}
                            {requests.filter((r: FaqRequest) => r.status === 'pending' && (isManager ? (canManageFaq ? true : r.receiver_id === user?.id) : false)).length > 0 && (
                                <span className="count-badge">{requests.filter((r: FaqRequest) => r.status === 'pending' && (canManageFaq ? true : r.receiver_id === user?.id)).length}</span>
                            )}
                        </button>
                    </div>
            </div>
        </div>

            {activeTab === 'guide' ? (
                <>
                    {/* Barre de recherche premium */}
                    <div className="faq-search-wrapper card-premium mt-8">
                        <div className="search-box">
                            <Search className="search-icon" size={20} />
                            <input 
                                type="text" 
                                placeholder="Rechercher une procédure, un document, une règle..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="category-tabs mt-6">
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id} 
                                    className={`cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="faq-list mt-8">
                        {filteredFAQ.length > 0 ? (
                            filteredFAQ.map(item => (
                                <FAQAccordion 
                                    key={item.id} 
                                    item={item} 
                                    canManage={canManageFaq} 
                                    onDelete={handleDeleteFaq} 
                                />
                            ))
                        ) : (
                            <div className="empty-state p-12 card-premium text-center">
                                <div className="illustration mb-4 opacity-20">
                                    <Search size={64} className="mx-auto" />
                                </div>
                                <p className="text-muted font-medium">Aucun résultat trouvé pour "{searchTerm}"</p>
                                <button className="btn-secondary mt-4" onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}>
                                    Réinitialiser les filtres
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Call to action pour nouvelles questions */}
                    <div className="faq-footer-help mt-12 mb-8">
                        <div className="help-card card-premium bg-gradient-katos">
                            <div className="help-content">
                                <HelpCircle size={32} />
                                <div>
                                    <h3>Une question ne figure pas dans la liste ?</h3>
                                    <p>Envoyez une demande au service support ou à votre manager pour enrichir la base de connaissances.</p>
                                </div>
                            </div>
                            <button className="btn-white" onClick={() => { setActiveTab('messages'); setShowQuestionModal(!isManager); }}>
                                {isManager ? 'Voir les demandes' : 'Poser une question'}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="messaging-view mt-8">
                    <div className="d-flex-between mb-8">
                        <h2 className="section-title">
                            {canManageFaq ? 'Historique complet des questions commerciaux' : isManager ? 'Questions reçues de vos collaborateurs' : 'Suivi de mes questions au manager'}
                        </h2>
                        {!isManager && (
                            <button className="btn-primary" onClick={() => setShowQuestionModal(true)}>
                                <Send size={18} /> Poser une question
                            </button>
                        )}
                    </div>

                    <div className="requests-list">
                        {loading ? (
                            <div className="card-premium p-8 text-center">Chargement...</div>
                        ) : requests.length > 0 ? (
                            requests.map((req: FaqRequest) => (
                                <div key={req.id} className={`request-card card-premium ${req.status}`}>
                                    <div className="request-header">
                                        <div className="d-flex items-center gap-3">
                                            <div className="user-icon">
                                                {isManager ? <User size={20} /> : <History size={20} />}
                                            </div>
                                            <div>
                                                <div className="d-flex items-center gap-2">
                                                    <span className="sender-name">{isManager ? req.sender_name : 'À mon Manager'}</span>
                                                    <span className={`status-pill ${req.status}`}>
                                                        {req.status === 'pending' ? 'En attente' : 'Répondu'}
                                                    </span>
                                                </div>
                                                <h4 className="req-subject">{req.subject}</h4>
                                            </div>
                                        </div>
                                        <span className="req-date">{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    
                                    <div className="req-body">
                                        <p className="req-msg">{req.message}</p>
                                        
                                        {req.reply ? (
                                            <div className="req-reply mt-4">
                                                <div className="reply-header">
                                                    <CheckCircle2 size={16} />
                                                    <span>Réponse du Manager</span>
                                                </div>
                                                <p className="reply-text">{req.reply}</p>
                                            </div>
                                        ) : isManager ? (
                                            <button className="btn-secondary btn-sm mt-4" onClick={() => { setSelectedRequest(req); setShowReplyModal(true); }}>
                                                <MessageSquare size={16} /> Répondre
                                            </button>
                                        ) : (
                                            <div className="pending-notice mt-4">
                                                <Clock size={14} /> En attente de traitement...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state p-12 card-premium text-center">
                                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Aucun échange en cours.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Poser une question */}
            <Modal isOpen={showQuestionModal} onClose={() => setShowQuestionModal(false)} title="Nouvelle question au manager" size="lg">
                <div className="faq-modal-content">
                    <div className="form-group pb-6">
                        <label className="d-block mb-3 font-bold text-lg">Sujet de la demande</label>
                        <input 
                            type="text" 
                            className="faq-input-large"
                            placeholder="De quoi s'agit-il ? (ex: Documents prêt immobilier, Commissions...)" 
                            value={newQuestion.subject}
                            onChange={(e) => setNewQuestion({...newQuestion, subject: e.target.value})}
                        />
                    </div>
                    <div className="form-group mt-4">
                        <label className="d-block mb-3 font-bold text-lg">Votre question détaillée</label>
                        <textarea 
                            rows={10} 
                            className="faq-textarea-large"
                            placeholder="Décrivez votre besoin le plus précisément possible..."
                            value={newQuestion.message}
                            onChange={(e) => setNewQuestion({...newQuestion, message: e.target.value})}
                        ></textarea>
                    </div>
                </div>
                <div className="form-actions mt-8 pt-6 border-t d-flex justify-end gap-6">
                    <button className="btn-secondary px-8 py-3" onClick={() => setShowQuestionModal(false)}>Annuler</button>
                    <button className="btn-primary px-12 py-3" onClick={handleSendQuestion} disabled={isSubmitting}>
                        {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma question'}
                    </button>
                </div>
            </Modal>

            {/* Modal: Répondre (Manager) */}
            <Modal isOpen={showReplyModal} onClose={() => setShowReplyModal(false)} title={`Répondre à ${selectedRequest?.sender_name}`} size="lg">
                <div className="faq-modal-content">
                    <div className="original-msg mb-8">
                        <span className="text-xs text-muted uppercase tracking-wider font-bold">Question reçue :</span>
                        <blockquote className="p-5 bg-slate-50 rounded-xl mt-2 border-l-4 border-katos-blue">
                            <strong className="d-block mb-2 text-lg">{selectedRequest?.subject}</strong>
                            <p className="text-slate-600 italic">"{selectedRequest?.message}"</p>
                        </blockquote>
                    </div>
                    <div className="form-group">
                        <label className="d-block mb-2 font-bold">Votre réponse officielle</label>
                        <textarea 
                            rows={8} 
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-katos-blue"
                            placeholder="Saisissez votre réponse ici..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            autoFocus
                        ></textarea>
                    </div>
                </div>
                <div className="form-actions mt-8 pt-4 border-t d-flex justify-end gap-6">
                    <button className="btn-secondary px-8 py-2" onClick={() => setShowReplyModal(false)}>Annuler</button>
                    <button className="btn-primary px-10 py-2" onClick={handleSendReply} disabled={isSubmitting}>
                        {isSubmitting ? 'Envoi...' : 'Envoyer la réponse'}
                    </button>
                </div>
            </Modal>

            {/* Modal: Ajouter une Procédure */}
            <Modal isOpen={showAddFaqModal} onClose={() => setShowAddFaqModal(false)} title="Nouvelle procédure / FAQ" size="lg">
                <div className="faq-modal-content">
                    <div className="form-group mb-6">
                        <label className="d-block mb-2 font-bold">Catégorie</label>
                        <select 
                            className="faq-input-large"
                            value={newFaq.category}
                            onChange={(e) => setNewFaq({...newFaq, category: e.target.value as any})}
                        >
                            <option value="general">Général</option>
                            <option value="client">Dossier Client</option>
                            <option value="admin">Administration</option>
                            <option value="finance">Financement</option>
                            <option value="technique">Technique & Délais</option>
                        </select>
                    </div>
                    <div className="form-group mb-6">
                        <label className="d-block mb-2 font-bold">Question / Titre de la procédure</label>
                        <input 
                            type="text" 
                            className="faq-input-large"
                            placeholder="Ex: Comment calculer les commissions ?" 
                            value={newFaq.question}
                            onChange={(e) => setNewFaq({...newFaq, question: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <label className="d-block mb-2 font-bold">Réponse / Détail de la procédure</label>
                        <textarea 
                            rows={10} 
                            className="faq-textarea-large"
                            placeholder="Décrivez la procédure étape par étape..."
                            value={newFaq.answer}
                            onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
                        ></textarea>
                    </div>
                </div>
                <div className="form-actions mt-8 pt-6 border-t d-flex justify-end gap-6">
                    <button className="btn-secondary px-8 py-3" onClick={() => setShowAddFaqModal(false)}>Annuler</button>
                    <button className="btn-primary px-12 py-3" onClick={handleAddFaq} disabled={isSubmitting}>
                        {isSubmitting ? 'Ajout en cours...' : 'Ajouter au Guide'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default FAQ;
