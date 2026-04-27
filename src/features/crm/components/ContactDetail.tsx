import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, Edit2, CheckCircle2, Plus,
    Megaphone, User, Folder, MessageSquare, ClipboardList, HardHat,
    ArrowRight, Trash2
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import DocumentManager from './DocumentManager';
import { useContactStore, type InteractionType, calculateLeadScore } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';

import { fetchCommercials } from '../api/contactApi';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import { supabase } from '@/lib/supabaseClient';
import { ALL_STATUSES } from '../utils/crmConstants';
import { signalComplianceIssue } from '../api/complianceApi';
import { fetchAvailableSlots, bookFieldSlot, type FieldSlot } from '../api/fieldApi';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

const SOURCE_OPTIONS = ['Site web', 'Facebook', 'LinkedIn', 'Instagram', 'TikTok', 'Prospection', 'Recommandation', 'Autre'];
// const AGENTS = ['Abdou Sarr', 'Omar Diallo', 'Katos Admin'];


const INTERACTION_CONFIG: Record<InteractionType, { icon: any; label: string; color: string }> = {
    call: { icon: Phone, label: 'Appel', color: '#3b82f6' },
    email: { icon: Mail, label: 'Email', color: '#10b981' },
    rdv: { icon: Calendar, label: 'Rendez-vous', color: '#8b5cf6' },
    visite_terrain: { icon: MapPin, label: 'Visite Terrain', color: '#f59e0b' },
    visite_chantier: { icon: HardHat, label: 'Visite Chantier', color: '#ef4444' },
    note: { icon: MessageSquare, label: 'Note interne', color: '#6b7280' },
    pipeline_step: { icon: ArrowRight, label: 'Changement d\'étape', color: '#9d174d' },
};

const ContactDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { 
        contacts, updateContact,
        visits, addVisit, moveVisitStatut, updateVisit, deleteVisit,
        interactions, addInteraction, updateInteraction, deleteInteraction,
        addFollowUp 
    } = useContactStore();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [commercials, setCommercials] = useState<{ id: string, name: string, service: string, role?: string }[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInteractionModal, setShowInteractionModal] = useState(false);
    const [editingInteraction, setEditingInteraction] = useState<string | null>(null);
    const [editingVisit, setEditingVisit] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'history' | 'documents'>('history');
    const [isSubmittingInteraction, setIsSubmittingInteraction] = useState(false);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [activeDispute, setActiveDispute] = useState<any>(null);
    const [showComplianceModal, setShowComplianceModal] = useState(false);

    // Debugging logs
    console.log('[ContactDetail] Rendering for ID:', id);
    console.log('[ContactDetail] Contacts in store:', contacts.length);

    // Find contact in store or fallback to the first one (for demo safety)
    const contact = useMemo(() => {
        if (!id) return null;
        return contacts.find(c => String(c.id) === String(id));
    }, [contacts, id]);

    // Sécurité Rôle/Service
    useEffect(() => {
        if (!contact || !user) return;

        // Si le rôle nécessite la liste des commerciaux pour la vérification hiérarchique, 
        // on attend que celle-ci soit chargée avant de décider du blocage.
        const needsCommercials = ['resp_commercial', 'manager'].includes(user.role || '');
        if (needsCommercials && commercials.length === 0) return;

        let hasAccess = true;

        if (['admin', 'dir_commercial', 'superviseur', 'conformite'].includes(user.role || '')) {
            hasAccess = true;
        } else {
            const userSvc = user.service === 'gestion' ? 'gestion_immobiliere' : user.service;
            const assignedNorm = (contact.assignedAgent || '').trim().toLowerCase();
            const userNameNorm = (user.name || '').trim().toLowerCase();

            if (user.role === 'manager') {
                hasAccess = contact.service === userSvc;
            } else if (user.role === 'resp_commercial') {
                const supervised = getSupervisedAgentNames(user, commercials);
                const supervisedNorm = supervised ? supervised.map(n => n?.trim().toLowerCase()) : [];
                hasAccess = supervisedNorm.includes(assignedNorm);
            } else if (user.role === 'commercial') {
                hasAccess = assignedNorm === userNameNorm;
            } else if (user.role === 'assistante') {
                hasAccess = contact.createdBy ? contact.createdBy === user.name : !contact.assignedAgent;
            }
        }

        if (!hasAccess) {
            showToast("Vous n'avez pas accès à ce dossier", 'error');
            navigate('/prospects');
        }
    }, [user, contact, commercials, showToast, navigate]);
    const [complianceDescription, setComplianceDescription] = useState('');
    const [compliancePriority, setCompliancePriority] = useState<'basse' | 'normale' | 'haute'>('normale');
    const [isSubmittingCompliance, setIsSubmittingCompliance] = useState(false);
    
    // Technician availability
    const [availableSlots, setAvailableSlots] = useState<FieldSlot[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState<string>('');
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    
    useEffect(() => {
        if (searchParams.get('action') === 'interaction') {
            setShowInteractionModal(true);
        }
    }, [searchParams]);

    useEffect(() => {
        const loadCommonData = async () => {
            const data = await fetchCommercials();
            setCommercials(data);
            
            if (id) {
                const { data } = await supabase
                    .from('compliance_issues')
                    .select('*')
                    .eq('contact_id', Number(id))
                    .neq('status', 'resolu')
                    .order('created_at', { ascending: false })
                    .limit(1);
                
                if (data && data.length > 0) {
                    setActiveDispute(data[0]);
                } else {
                    setActiveDispute(null);
                }
            }
        };
        loadCommonData();
    }, [id]);

    const [editForm, setEditForm] = useState<any>(null);

    const availableAgents = useMemo(() => {
        const list = commercials.filter(c => c.role !== 'technicien_terrain' && c.role !== 'technicien_chantier');
        if (user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') return list;
        if (!editForm?.service) return list;
        const profileService = editForm.service === 'gestion_immobiliere' ? 'gestion' : editForm.service;
        return list.filter(c => c.service === profileService);
    }, [commercials, editForm?.service, user]);
    const [interactionForm, setInteractionForm] = useState({
        type: 'call' as InteractionType,
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        lieu: '',
        technician: '',
        scheduleFollowUp: false,
        followUpDate: '',
        followUpTime: '09:00',
        followUpNote: '',
        followUpPriority: 'normale' as 'haute' | 'normale' | 'basse'
    });

    // Fetch available slots when date or type changes
    useEffect(() => {
        const loadSlots = async () => {
            if (['visite_terrain', 'visite_chantier'].includes(interactionForm.type)) {
                setIsLoadingSlots(true);
                const type = interactionForm.type === 'visite_chantier' ? 'chantier' : 'terrain';
                const slots = await fetchAvailableSlots(interactionForm.date, type);
                setAvailableSlots(slots);
                setIsLoadingSlots(false);
            } else {
                setAvailableSlots([]);
                setSelectedSlotId('');
            }
        };
        loadSlots();
    }, [interactionForm.date, interactionForm.type]);

    // Filter interactions from store for this contact
    const contactInteractions = useMemo(() => {
        if (!contact || !Array.isArray(interactions)) return [];
        return interactions.filter(i => String(i.contactId) === String(contact.id));
    }, [interactions, contact]);

    // Filter appointments (visits) from store for this contact
    const contactVisits = useMemo(() => {
        if (!contact || !Array.isArray(visits)) return [];
        return visits.filter(v => String(v.contactId) === String(contact.id));
    }, [visits, contact]);

    // Combine interactions and visits into a single, sorted history
    const unifiedHistory = useMemo(() => {
        const historyItems = [
            ...contactInteractions.map(i => ({ 
                ...i, 
                category: 'interaction' as const,
                statut: 'completed' as any
            })),
            ...contactVisits.map(v => ({ 
                id: v.id.toString(), 
                contactId: v.contactId,
                type: (v.type === 'chantier' ? 'visite_chantier' : v.type === 'terrain' ? 'visite_terrain' : 'rdv') as InteractionType,
                title: v.title,
                description: v.notes,
                date: v.date || '',
                heure: v.heure || '',
                agent: v.agent,
                lieu: v.lieu,
                statut: v.statut,
                category: 'visit',
                technician: v.technician
            }))
        ];

        // Déduplication des éléments pour ne pas montrer à la fois l'interaction et la visite liée
        const uniqueItems = [];
        const seenKeys = new Set();

        for (const item of historyItems) {
            // Pour les notes internes, on les garde toujours
            if (item.type === 'note') {
                uniqueItems.push(item);
                continue;
            }

            // Clé de déduplication basée sur le contact, la date, l'heure et le titre
            // On utilise contactId ici aussi par sécurité même si on est dans la fiche d'un seul contact
            const dateKey = `${item.contactId || 'no-id'}_${item.date || 'no-date'}_${item.heure || '00:00'}`;
            const titleKey = (item.title || '').toLowerCase().trim();
            const key = `${dateKey}_${titleKey}`;

            if (!seenKeys.has(key)) {
                uniqueItems.push(item);
                seenKeys.add(key);
            }
        }

        return uniqueItems.sort((a, b) => {
            const dateA = new Date((a.date || '1970-01-01') + 'T' + (a.heure || '00:00')).getTime();
            const dateB = new Date((b.date || '1970-01-01') + 'T' + (b.heure || '00:00')).getTime();
            return dateB - dateA;
        });
    }, [contactInteractions, contactVisits]);

    // Update edit form when contact changes (e.g. initial load)
    useEffect(() => {
        if (contact) {
            setEditForm({
                ...contact,
                budgetConfirmed: contact.budgetConfirmed ?? false,
                isReactive: contact.isReactive ?? false
            });
        }
    }, [contact]);

    if (!contacts || contacts.length === 0) return <div className="p-20 text-center text-primary font-bold">Chargement des données de la base... Veuillez patienter.</div>;
    if (!contact) return <div className="p-20 text-center text-danger font-bold">Contact #{id} introuvable ou accès non autorisé pour votre profil ({user?.role}).</div>;

    const getStatusBadge = (status: string) => {
        const s = status || 'Prospect';
        switch (s) {
            case 'Prospect': return <span className="badge badge-warning">Prospect</span>;
            case 'Qualification': 
            case 'En Qualification': return <span className="badge badge-info">Qualification</span>;
            case 'RDV': return <span className="badge badge-primary">RDV</span>;
            case 'Proposition Commerciale': return <span className="badge badge-primary">Proposition</span>;
            case 'Négociation': return <span className="badge badge-info">Négociation</span>;
            case 'Réservation': return <span className="badge badge-secondary">Réservation</span>;
            case 'Contrat': return <span className="badge badge-success">Contrat</span>;
            case 'Paiement': return <span className="badge badge-success">Paiement</span>;
            case 'Transfert de dossier technique':
            case 'Transfert dossier tech': return <span className="badge badge-warning">Transfert Tech</span>;
            case 'Suivi Chantier': return <span className="badge badge-warning">Chantier</span>;
            case 'Livraison Client': return <span className="badge badge-success">Livré</span>;
            case 'Fidélisation': return <span className="badge badge-primary">Fidélisation</span>;
            default: return <span className="badge badge-secondary">{s}</span>;
        }
    };

    const saveEdit = async () => {
        if (contact && !isSubmittingEdit) {
            console.log('[DEBUG saveEdit] CONTACT OBJECT:', contact);
            console.log('[DEBUG saveEdit] EDITFORM BEFORE SAVE:', editForm);
            
            setIsSubmittingEdit(true);
            try {
                // Blocage si litige actif et tentative de passage à un statut final
                const BLOCKING_STATUSES = ['Livraison Client', 'Projet Livré', 'Fidélisation'];
                if (activeDispute && BLOCKING_STATUSES.includes(editForm.status)) {
                    showToast("Action bloquée : Un litige est en cours sur ce dossier.", 'error');
                    setIsSubmittingEdit(false);
                    return;
                }

                // Ensure values are booleans
                const finalUpdates = {
                    ...editForm,
                    budgetConfirmed: !!editForm.budgetConfirmed,
                    isReactive: !!editForm.isReactive
                };
                console.log('[DEBUG saveEdit] FINAL UPDATES TO STORE:', finalUpdates);
                const success = await updateContact(contact.id, finalUpdates as any);
                if (success === false) {
                    showToast('Erreur de sauvegarde (Base de données)', 'error');
                } else {
                    showToast('Informations du contact mises à jour');
                    setShowEditModal(false);
                }
            } catch (err) {
                showToast('Erreur lors de la mise à jour', 'error');
            } finally {
                setIsSubmittingEdit(false);
            }
        }
    };

    const saveInteraction = async () => {
        if (isSubmittingInteraction) return;
        setIsSubmittingInteraction(true);
        console.log('[saveInteraction] Starting...', interactionForm);
        if (!interactionForm.title.trim()) {
            showToast('Le titre est obligatoire', 'error');
            setIsSubmittingInteraction(false);
            return;
        }

        // Validation disponibilité techniciens
        if (['visite_terrain', 'visite_chantier'].includes(interactionForm.type) && !selectedSlotId && !editingInteraction && !editingVisit) {
            showToast('Veuillez sélectionner un créneau de disponibilité technicien', 'error');
            setIsSubmittingInteraction(false);
            return;
        }

        const selectedSlot = availableSlots.find(s => s.id === selectedSlotId);
        const technicianName = selectedSlot ? selectedSlot.agentName : interactionForm.technician;
        const finalHeure = selectedSlot ? selectedSlot.startTime.substring(0, 5) : interactionForm.heure;

        try {
            const interactionData = {
                contactId: contact.id,
                type: interactionForm.type,
                title: interactionForm.title,
                description: interactionForm.description,
                date: interactionForm.date,
                heure: interactionForm.heure,
                agent: editingInteraction ? (interactions.find(i => i.id === editingInteraction)?.agent || 'Katos Admin') : (contact.assignedAgent || 'Katos Admin'),
                lieu: interactionForm.lieu,
                technician: interactionForm.technician || ''
            };

            console.log('[UI] saveInteraction - Construction interactionData:', interactionData);

            if (editingVisit) {
                console.log('[UI] saveInteraction - Calling updateVisit', editingVisit);
                await updateVisit(editingVisit, {
                    title: interactionForm.title,
                    date: interactionForm.date,
                    heure: finalHeure,
                    lieu: interactionForm.lieu,
                    notes: interactionForm.description,
                    technician: technicianName
                });
                setEditingVisit(null);
            } else if (editingInteraction) {
                console.log('[UI] saveInteraction - Calling updateInteraction', editingInteraction);
                await updateInteraction(editingInteraction, interactionData);
            } else {
                console.log('[UI] saveInteraction - Calling addInteraction');
                // We need the ID if we want to link a follow-up, but addInteraction doesn't return it easily from store
                // However, addInteraction in store calls api.createInteractionApi
                // I'll update the store to return the saved object or at least handle the follow-up internally if passed
                await addInteraction(interactionData);
                console.log('[UI] saveInteraction - addInteraction COMPLETED');
            }

            // Create follow-up if manually scheduled (simplification per user request)
            if (interactionForm.scheduleFollowUp && interactionForm.followUpDate) {
                console.log('[UI] saveInteraction - Creating follow-up');
                await addFollowUp({
                    contactId: contact.id,
                    agent: (contact.assignedAgent || 'Katos Admin').trim(),
                    dateRelance: interactionForm.followUpDate,
                    heure: interactionForm.followUpTime,
                    note: interactionForm.followUpNote || `Relance suite à: ${interactionForm.title}`,
                    statut: 'upcoming',
                    priorite: interactionForm.followUpPriority
                });
            }

            // If it's a NEW visit or RDV, also add to visits for tracking
            if (!editingInteraction && !editingVisit && ['rdv', 'visite_terrain', 'visite_chantier'].includes(interactionForm.type)) {
                console.log('[UI] saveInteraction - Creating associated visit (always upcoming as requested)');
                
                await addVisit({
                    title: interactionForm.title,
                    contactId: contact.id,
                    date: interactionForm.date,
                    heure: finalHeure,
                    lieu: interactionForm.lieu || '',
                    type: interactionForm.type === 'visite_chantier' ? 'chantier' : interactionForm.type === 'visite_terrain' ? 'terrain' : 'bureau',
                    statut: 'upcoming',
                    agent: (contact.assignedAgent || 'Katos Admin').trim(),
                    technician: technicianName || '',
                    notes: interactionForm.description || ''
                });
                
                // Réserver le créneau en base
                if (selectedSlotId) {
                    await bookFieldSlot(selectedSlotId, contact.id);
                }
                console.log('[UI] saveInteraction - addVisit COMPLETED');
            }

            showToast('Interaction enregistrée avec succès');
            setShowInteractionModal(false);
            setEditingInteraction(null);
            setInteractionForm({
                type: 'call',
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                lieu: '',
                technician: '',
                scheduleFollowUp: false,
                followUpDate: '',
                followUpTime: '09:00',
                followUpNote: '',
                followUpPriority: 'normale'
            });
            console.log('[saveInteraction] Success, modal closed');
        } catch (err) {
            console.error('[saveInteraction] ERROR:', err);
            showToast('Une erreur est survenue lors de l\'enregistrement', 'error');
        } finally {
            setIsSubmittingInteraction(false);
        }
    };

    const markVisitDone = (vid: number) => {
        moveVisitStatut(vid, 'completed');
        showToast('Visite marquée comme effectuée');
    };


    // Unified edit handler — routes to the correct form state depending on category
    const handleEditItem = (item: any) => {
        if (item.category === 'visit') {
            setEditingVisit(Number(item.id));
            setEditingInteraction(null);
        } else {
            setEditingInteraction(item.id);
            setEditingVisit(null);
        }
        setInteractionForm({
            type: item.type,
            title: item.title,
            description: item.description || '',
            date: item.date,
            heure: item.heure,
            lieu: item.lieu || '',
            technician: item.technician || '',
            scheduleFollowUp: false,
            followUpDate: '',
            followUpTime: '09:00',
            followUpNote: '',
            followUpPriority: 'normale'
        });
        setShowInteractionModal(true);
    };

    // Unified delete handler — routes to the correct store function
    const handleDeleteItem = async (item: any) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
        if (item.category === 'visit') {
            await deleteVisit(Number(item.id));
        } else {
            await deleteInteraction(item.id);
        }
        showToast('Élément supprimé');
    };

    return (
        <div className="contact-detail-page">
            <button className="btn-back" onClick={() => navigate('/prospects')}>
                <ArrowLeft size={18} /> Retour à la liste
            </button>

            <div className="detail-header card-premium">
                <div className="header-info">
                    <div className="avatar-large">{(contact.name || '?').charAt(0)}</div>
                    <div className="title-section">
                        <div className="d-flex align-center gap-sm">
                            <h1>{contact.name || 'Sans Nom'}</h1>
                            {getStatusBadge(contact.status)}
                            {(() => {
                                const score = calculateLeadScore(contact);
                                const scoreClass = score >= 35 ? 'score-hot' : score >= 16 ? 'score-warm' : 'score-cold';
                                return (
                                    <span className={`lead-score-badge ${scoreClass}`} style={{ marginLeft: '8px' }}>
                                        {score} PTS {score >= 35 && '🔥'}
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="subtitle">
                            {contact.company || 'Particulier'} · Réf #{contact.id} · 
                            <span className="badge-soft-primary" style={{ marginLeft: '8px', textTransform: 'capitalize' }}>
                                {contact.service === 'gestion_immobiliere' ? 'Gestion' : contact.service}
                            </span>

                            {contact.propertyTitle && (
                                <span className="badge-soft-orange" style={{ marginLeft: '8px' }}>
                                    {contact.propertyTitle}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="header-actions">
                    {['admin', 'dir_commercial', 'commercial'].includes(user?.role || '') && (
                        <button className="btn-outline" onClick={() => { setEditForm(contact); setShowEditModal(true); }}>
                            <Edit2 size={16} /> Modifier
                        </button>
                    )}
                    {user?.role !== 'resp_commercial' && (
                        <button className="btn-primary" onClick={() => setShowInteractionModal(true)}>
                            <Plus size={16} /> Ajouter une interaction
                        </button>
                    )}
                    {(user?.role === 'commercial' || user?.role === 'assistante' || user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'manager') && (
                        <button 
                            className={`btn-outline ${activeDispute ? 'text-danger border-danger' : ''}`} 
                            onClick={() => setShowComplianceModal(true)}
                            title="Signaler un litige ou un problème de conformité"
                        >
                            <ShieldAlert size={16} /> {activeDispute ? 'Litige Actif' : 'Signaler Litige'}
                        </button>
                    )}
                </div>
            </div>

            {activeDispute && (
                <div className={`alert-banner-v2 ${activeDispute.status === 'besoin_admin' ? 'banner-critical' : 'banner-warning'} mb-6`}>
                    <div className="flex items-center gap-4">
                        <div className="banner-icon">
                            {activeDispute.status === 'besoin_admin' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-sm uppercase tracking-wider">Dossier sous surveillance</span>
                                <span className={`badge-status-${activeDispute.status}`}>
                                    {activeDispute.status === 'nouveau' && 'Attente de prise en charge'}
                                    {activeDispute.status === 'en_cours' && 'Correction en cours par Conformité'}
                                    {activeDispute.status === 'besoin_admin' && 'Intervention Direction Requise'}
                                </span>
                            </div>
                            <p className="text-sm opacity-90">
                                Un litige de priorité <strong>{activeDispute.priority}</strong> est en cours. 
                                Les actions de clôture de vente sont suspendues.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="detail-grid">
                <div className="grid-left">
                    <div className="info-card card-premium">
                        <h3>Informations</h3>
                        <div className="info-list">
                            <div className="info-item">
                                <Mail className="icon-muted" size={18} />
                                <div><span className="info-label">Email</span><a href={`mailto:${contact.email}`} className="info-value link">{contact.email}</a></div>
                            </div>
                            <div className="info-item">
                                <Phone className="icon-muted" size={18} />
                                <div><span className="info-label">Téléphone</span><a href={`tel:${contact.phone}`} className="info-value link">{contact.phone}</a></div>
                            </div>
                            <div className="info-item">
                                <MapPin className="icon-muted" size={18} />
                                <div><span className="info-label">Adresse / Pays</span><span className="info-value">{contact.address}{contact.country ? `, ${contact.country}` : ''}</span></div>
                            </div>
                            <div className="info-item">
                                <Megaphone className="icon-muted" size={18} />
                                <div><span className="info-label">Source / Canal</span><span className="info-value">{contact.source || <em style={{ color: 'var(--text-muted)' }}>Non défini</em>}</span></div>
                            </div>
                            <div className="info-item">
                                <User className="icon-muted" size={18} />
                                <div>
                                    <span className="info-label">Commercial affecté</span>
                                    <span className="info-value" style={{ color: 'var(--primary)', fontWeight: 600 }}>{contact.assignedAgent || 'Non assigné'}</span>
                                </div>
                            </div>
                            {contact.createdAt && (
                                <div className="info-item">
                                    <Clock className="icon-muted" size={18} />
                                    <div>
                                        <span className="info-label">Délai (jours)</span>
                                        <span className="info-value" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                            {Math.floor((new Date().getTime() - new Date(contact.createdAt).getTime()) / (1000 * 60 * 60 * 24))} jours
                                        </span>
                                        <span className="text-xs text-muted" style={{ marginLeft: 6 }}>(Créé le {new Date(contact.createdAt).toLocaleDateString('fr-FR')})</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="info-card card-premium mt-15">
                        <div className="d-flex-between" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>Notes Internes</h3>
                            {user?.role === 'admin' && (
                                <button
                                    className="btn-outline"
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                                    onClick={() => { setEditForm({ ...contact }); setShowEditModal(true); }}
                                >
                                    <Edit2 size={12} /> Modifier
                                </button>
                            )}
                        </div>
                        <p className="notes-text">{contact.notes || <em style={{ color: 'var(--text-muted)' }}>Aucune note pour ce contact.</em>}</p>
                    </div>
                </div>

                <div className="grid-right">
                    <div className="tabs-container card-premium">
                        <div className="tabs-header">
                            <button 
                                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <ClipboardList size={16} />
                                Historique des interactions
                            </button>
                            {['admin', 'dir_commercial', 'conformite'].includes(user?.role || '') && (
                                <button 
                                    className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('documents')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Folder size={16} />
                                    Documents & Contrats
                                </button>
                            )}
                        </div>
                        <div className="tab-content">
                            {activeTab === 'history' ? (
                                <div className="timeline">
                                    <div className="d-flex-between mb-sm">
                                        <h4 className="section-title">Timeline des échanges</h4>
                                        {user?.role !== 'resp_commercial' && (
                                            <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }} onClick={() => setShowInteractionModal(true)}>
                                                <Plus size={13} /> Ajouter
                                            </button>
                                        )}
                                    </div>
                                    
                                    {unifiedHistory.length === 0 ? (
                                        <div className="empty-state p-20 text-center">
                                            <p className="text-muted">Aucune interaction enregistrée pour le moment.</p>
                                        </div>
                                    ) : (
                                        unifiedHistory.map((item) => {
                                            const config = INTERACTION_CONFIG[item.type];
                                            const Icon = config.icon;
                                            const isReschedulable = item.category === 'visit' && item.statut !== 'completed';

                                            return (
                                                <div key={item.id} className="timeline-item-premium">
                                                    <div className="timeline-marker-v2" style={{ backgroundColor: config.color + '20', color: config.color }}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <div className="timeline-card-v2">
                                                        <div className="timeline-header">
                                                            <strong>{item.title}</strong>
                                                            <div className="d-flex align-center gap-xs">
                                                                {item.category === 'visit' && item.statut !== 'completed' && (
                                                                    <button 
                                                                        className="btn-soft-success btn-xs"
                                                                        style={{ fontSize: '0.65rem', padding: '2px 8px' }}
                                                                        onClick={() => markVisitDone(Number(item.id))}
                                                                    >
                                                                        Terminer
                                                                    </button>
                                                                )}
                                                                {item.category === 'visit' && item.statut === 'completed' && (
                                                                    <span className="text-success d-flex align-center gap-xs" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                                                        <CheckCircle2 size={12} /> Effectué
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="timeline-meta-v2">
                                                            <span><Clock size={12} /> {item.date} à {item.heure}</span>
                                                            {item.lieu && <span><MapPin size={12} /> {item.lieu}</span>}
                                                            <span><User size={12} /> {item.agent}</span>
                                                            {item.technician && <span><HardHat size={12} /> {item.technician}</span>}
                                                        </div>

                                                        {item.description && <p className="timeline-desc">{item.description}</p>}

                                                        <div className="d-flex-between mt-10">
                                                            <div className="d-flex gap-sm">
                                                                {user?.role !== 'resp_commercial' && (
                                                                    <button className="btn-ghost btn-xs" onClick={() => handleEditItem(item)}>
                                                                        <Edit2 size={12} /> Modifier
                                                                    </button>
                                                                )}
                                                                {isReschedulable && user?.role !== 'resp_commercial' && (
                                                                    <button 
                                                                        className="btn-ghost btn-xs text-primary" 
                                                                        onClick={() => handleEditItem(item)}
                                                                    >
                                                                        <Calendar size={12} /> Reporter
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {user?.role !== 'resp_commercial' && (
                                                                <button 
                                                                    className="btn-ghost btn-xs text-danger"
                                                                    onClick={() => handleDeleteItem(item)}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                <DocumentManager contactId={contact.id} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ---- Modale Modifier Contact ---- */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier le contact" size="lg">
                {editForm && (
                    <>
                        <div className="form-grid">
                    <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Entreprise</label><input className="form-input" value={editForm.company} onChange={e => setEditForm({ ...editForm, company: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                    <div className="form-group">
                        <label className="form-label">Statut</label>
                        <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                            {ALL_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Canal d'acquisition</label>
                        <select className="form-select" value={editForm.source || ''} onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
                            <option value="">— Sélectionner —</option>
                            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Commercial affecté</label>
                        <select 
                            className="form-select" 
                            disabled={!['admin', 'dir_commercial'].includes(user?.role || '')}
                            value={editForm.assignedAgent || ''} 
                            onChange={e => setEditForm({ ...editForm, assignedAgent: e.target.value })}
                        >
                            <option value="">— Non assigné —</option>
                            {availableAgents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                        {!['admin', 'dir_commercial'].includes(user?.role || '') && (
                            <p className="text-xs text-muted mt-1">Seul l'admin ou le dir. commercial peut réaffecter un dossier.</p>
                        )}
                    </div>
                    <div className="form-group"><label className="form-label">Adresse</label><input className="form-input" value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Ex: 12 avenue Senghor" /></div>
                    <div className="form-group"><label className="form-label">Pays</label><input className="form-input" value={editForm.country || ''} onChange={e => setEditForm({ ...editForm, country: e.target.value })} placeholder="Ex: Sénégal" /></div>
                    <div className="form-group col-2" style={{ display: 'flex', gap: '24px', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', marginTop: '8px' }}>
                        <label className="flex items-center gap-2 cursor-pointer" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={editForm.budgetConfirmed} onChange={e => setEditForm({ ...editForm, budgetConfirmed: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                            Budget Confirmé (+20 pts)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={editForm.isReactive} onChange={e => setEditForm({ ...editForm, isReactive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                            Prospect Réactif (+10 pts)
                        </label>
                    </div>
                    <div className="form-group col-2"><label className="form-label">Notes Internes</label><textarea className="form-textarea" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveEdit} disabled={isSubmittingEdit}>
                        {isSubmittingEdit ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    </div>
                </>
                )}
            </Modal>

            {/* ---- Modale UNIFIÉE Interaction ---- */}
            <Modal 
                isOpen={showInteractionModal} 
                onClose={() => { setShowInteractionModal(false); setEditingInteraction(null); }} 
                title={editingInteraction ? "Modifier l'Interaction" : "Nouvelle Interaction"} 
                size="lg"
            >
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Type d'interaction</label>
                        <div className="interaction-type-selector">
                            {(Object.keys(INTERACTION_CONFIG) as InteractionType[]).map(type => {
                                const cfg = INTERACTION_CONFIG[type];
                                const Icon = cfg.icon;
                                return (
                                    <button 
                                        key={type}
                                        className={`btn-type ${interactionForm.type === type ? 'active' : ''}`}
                                        onClick={() => setInteractionForm({ ...interactionForm, type })}
                                        style={{ 
                                            borderColor: interactionForm.type === type ? cfg.color : 'transparent',
                                            backgroundColor: interactionForm.type === type ? cfg.color + '15' : 'var(--bg-app)',
                                        }}
                                    >
                                        <div className="type-icon-wrapper" style={{ color: cfg.color, backgroundColor: cfg.color + '10' }}>
                                            <Icon size={18} />
                                        </div>
                                        <span className="type-label">{cfg.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="form-group col-2">
                        <label className="form-label">Titre de l'interaction *</label>
                        <input 
                            className="form-input" 
                            value={interactionForm.title} 
                            onChange={e => setInteractionForm({ ...interactionForm, title: e.target.value })} 
                            placeholder="Ex: Appel de relance devis" 
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={interactionForm.date} onChange={e => setInteractionForm({ ...interactionForm, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Heure</label>
                        <input className="form-input" type="time" value={interactionForm.heure} onChange={e => setInteractionForm({ ...interactionForm, heure: e.target.value })} />
                    </div>

                    {['rdv', 'visite_terrain', 'visite_chantier'].includes(interactionForm.type) && (
                        <>
                            <div className="form-group col-2">
                                <label className="form-label">Lieu</label>
                                <input className="form-input" value={interactionForm.lieu} onChange={e => setInteractionForm({ ...interactionForm, lieu: e.target.value })} placeholder="Adresse ou lieu précis" />
                            </div>
                            
                            {['visite_terrain', 'visite_chantier'].includes(interactionForm.type) && !editingInteraction && !editingVisit && (
                                <div className="form-group col-2">
                                    <label className="form-label" style={{ color: 'var(--katos-orange)', fontWeight: 800 }}>
                                        Disponibilité Techniciens Terrain *
                                    </label>
                                    <select 
                                        className="form-select bg-orange-50 border-orange-200"
                                        value={selectedSlotId}
                                        onChange={e => setSelectedSlotId(e.target.value)}
                                        disabled={isLoadingSlots}
                                    >
                                        <option value="">— Sélectionner un créneau —</option>
                                        {availableSlots.map(slot => (
                                            <option key={slot.id} value={slot.id}>
                                                {slot.agentName} : {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                                            </option>
                                        ))}
                                    </select>
                                    {availableSlots.length === 0 && !isLoadingSlots && (
                                        <p className="text-[10px] text-red-500 font-bold mt-1">
                                            ⚠️ Aucun technicien disponible pour cette date ({interactionForm.date}).
                                        </p>
                                    )}
                                    {isLoadingSlots && <p className="text-[10px] text-muted italic mt-1">Recherche des disponibilités...</p>}
                                </div>
                            )}

                            {interactionForm.type === 'rdv' && (
                                <div className="form-group col-2">
                                    <label className="form-label">Technicien / Expert accompagnateur (Optionnel)</label>
                                    <input className="form-input" value={interactionForm.technician} onChange={e => setInteractionForm({ ...interactionForm, technician: e.target.value })} placeholder="Ex: Samba Tall (Technicien)" />
                                </div>
                            )}
                        </>
                    )}

                    <div className="form-group col-2">
                        <label className="form-label">Description / Compte-rendu</label>
                        <textarea className="form-textarea" value={interactionForm.description} onChange={e => setInteractionForm({ ...interactionForm, description: e.target.value })} placeholder="Résumé de l'échange..." />
                    </div>

                    {/* Section Programmation Relance (Toujours visible même en édition) */}
                    <div className="form-group col-2 mt-10" style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <label className="d-flex align-center gap-sm" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--primary)' }}>
                            <input 
                                type="checkbox" 
                                checked={interactionForm.scheduleFollowUp} 
                                onChange={e => setInteractionForm({ ...interactionForm, scheduleFollowUp: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                            Programmer une action de rappel (Relance) ?
                        </label>
                    </div>

                    {interactionForm.scheduleFollowUp && (
                        <div className="form-grid col-2" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '5px' }}>
                            <div className="form-group">
                                <label className="form-label">Date du rappel *</label>
                                <input 
                                    className="form-input" 
                                    type="date" 
                                    value={interactionForm.followUpDate} 
                                    onChange={e => setInteractionForm({ ...interactionForm, followUpDate: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priorité</label>
                                <select 
                                    className="form-select" 
                                    value={interactionForm.followUpPriority} 
                                    onChange={e => setInteractionForm({ ...interactionForm, followUpPriority: e.target.value as any })}
                                >
                                    <option value="basse">Basse</option>
                                    <option value="normale">Normale</option>
                                    <option value="haute">Haute</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Heure du rappel *</label>
                                <input 
                                    className="form-input" 
                                    type="time" 
                                    value={interactionForm.followUpTime} 
                                    onChange={e => setInteractionForm({ ...interactionForm, followUpTime: e.target.value })}
                                />
                            </div>
                            <div className="form-group col-2">
                                <label className="form-label">Note pour le rappel</label>
                                <input 
                                    className="form-input" 
                                    type="text" 
                                    placeholder="Ex: Rappeler pour confirmer le budget..." 
                                    value={interactionForm.followUpNote}
                                    onChange={e => setInteractionForm({ ...interactionForm, followUpNote: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="form-actions mt-20">
                    <button className="btn-secondary" onClick={() => setShowInteractionModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={saveInteraction} disabled={isSubmittingInteraction}>
                        {isSubmittingInteraction ? 'Enregistrement...' : 'Enregistrer l\'interaction'}
                    </button>
                </div>
            </Modal>

            {/* ---- Modale Signaler Litige ---- */}
            <Modal 
                isOpen={showComplianceModal} 
                onClose={() => setShowComplianceModal(false)} 
                title="Signaler un problème de Conformité / Litige" 
                size="md"
            >
                <div className="p-4">
                    <p className="text-sm text-muted mb-4">
                        Utilisez ce formulaire pour alerter l'équipe de Conformité. Décrivez précisément le problème (documents manquants, erreur de contrat, contestation client, etc.).
                    </p>
                    <div className="form-group mb-4">
                        <label className="form-label">Niveau de Priorité</label>
                        <select 
                            className="form-select" 
                            value={compliancePriority} 
                            onChange={e => setCompliancePriority(e.target.value as any)}
                        >
                            <option value="basse">🟢 Basse (Vérification simple)</option>
                            <option value="normale">🟡 Normale (Dossier standard)</option>
                            <option value="haute">🔴 Haute (Urgence critique)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description du problème *</label>
                        <textarea 
                            className="form-textarea" 
                            rows={4} 
                            placeholder="Détaillez le litige ici..."
                            value={complianceDescription}
                            onChange={e => setComplianceDescription(e.target.value)}
                        />
                    </div>
                    <div className="form-actions mt-15">
                        <button className="btn-secondary" onClick={() => setShowComplianceModal(false)}>Annuler</button>
                        <button 
                            className="btn-danger" 
                            disabled={isSubmittingCompliance || !complianceDescription.trim()}
                            onClick={async () => {
                                if (!user) return;
                                setIsSubmittingCompliance(true);
                                try {
                                    await signalComplianceIssue({
                                        contactId: Number(id),
                                        signaledBy: user.id,
                                        description: complianceDescription,
                                        priority: compliancePriority,
                                        contactName: contact.name
                                    });
                                    // Update local state to show the banner
                                    setActiveDispute({
                                        status: 'nouveau',
                                        priority: compliancePriority
                                    });
                                    showToast('Litige signalé avec succès à l\'équipe de conformité.');
                                    setShowComplianceModal(false);
                                    setComplianceDescription('');
                                } catch (err) {
                                    showToast('Erreur lors du signalement.', 'error');
                                } finally {
                                    setIsSubmittingCompliance(false);
                                }
                            }}
                        >
                            {isSubmittingCompliance ? 'Signalement...' : 'Envoyer le signalement'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ContactDetail;
