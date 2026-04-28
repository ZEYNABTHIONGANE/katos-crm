import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Plus, Phone, Mail, MapPin, Eye, Edit2, Trash2, MessageSquare, Upload, Calendar } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ServiceSelector from './ServiceSelector';
import PropertyPicker, { type SelectedProperty } from './PropertyPicker';
import { useContactStore, type CrmContact, calculateLeadScore } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';
import { useNotifications } from '@/app/providers/NotifProvider';
import { fetchCommercials } from '../api/contactApi';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import { ALL_STATUSES } from '../utils/crmConstants';

const SOURCE_OPTIONS = [
    'Site web', 'Facebook', 'Instagram', 'TikTok', 'LinkedIn', 
    'WhatsApp', 'SMS', 'Email', 'Appel (Apporteur)', 'Appel (Prospection)', 
    'Terrain', 'Recommandation', 'Bouche à oreille', 'Autre'
];

const SERVICE_LABELS: Record<string, string> = {
    foncier: 'Foncier',
    construction: 'Construction',
    gestion_immobiliere: 'Gestion Immo',
};

const getAgentColor = (name: string) => {
    const colors = [
        { bg: 'rgba(79, 70, 229, 0.1)', text: '#4f46e5' }, // Indigo
        { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' }, // Emerald
        { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' }, // Amber
        { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899' }, // Pink
        { bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4' }, // Cyan
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

type FormData = Omit<CrmContact, 'id'>;

const emptyForm: FormData = {
    name: '', company: '', email: '', phone: '',
    status: 'Prospect', address: '', country: '',
    source: '', service: undefined, propertyId: undefined, propertyTitle: undefined,
    lastAction: '', budget: '', assignedAgent: '', notes: '', createdBy: '',
    budgetConfirmed: false, isReactive: false,
};

const ContactsList = () => {
    const { user } = useAuth();
    const { contacts, addContact, addContactsBulk, addInteractionsBulk, updateContact, deleteContact } = useContactStore();
    const { showToast } = useToast();
    const { addNotif } = useNotifications();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams] = useSearchParams();
    const [filter, setFilter] = useState(searchParams.get('filter') || 'Tous');
    const [agentFilter, setAgentFilter] = useState('all'); // Filtre par commercial
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editContact, setEditContact] = useState<CrmContact | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<CrmContact | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [commercials, setCommercials] = useState<{ id: string, name: string, service: string, role?: string, parent_id?: string, group_name?: string }[]>([]);
    
    // Filtres par date
    const [dateFilterType, setDateFilterType] = useState<'all' | 'createdAt' | 'convertedAt'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const rows = text.split(/\r?\n/).filter(row => row.trim());
            if (rows.length < 2) {
                showToast("Fichier vide ou invalide", "error");
                return;
            }

            // Detect delimiter (automatic between , and ;)
            const firstLine = rows[0];
            const commaCount = (firstLine.match(/,/g) || []).length;
            const semiCount = (firstLine.match(/;/g) || []).length;
            const delimiter = semiCount > commaCount ? ';' : ',';

            // Robust CSV line splitter (handles quotes)
            const splitCsvLine = (line: string, sep: string) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === sep && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else current += char;
                }
                result.push(current.trim());
                return result.map(v => v.replace(/^"|"$/g, '').trim());
            };

            // Normalize header names (remove accents and lowercase)
            const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const header = splitCsvLine(rows[0], delimiter).map(h => normalize(h));
            const noteIdx = header.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('obs') || h.includes('deta'));
            
            const data = rows.slice(1).map((row, rowIdx) => {
                let values = splitCsvLine(row, delimiter);
                
                // --- Smart Merge: handle rows with extra columns due to unquoted commas in notes ---
                if (values.length > header.length && noteIdx !== -1) {
                    const extraCount = values.length - header.length;
                    const beforeNote = values.slice(0, noteIdx);
                    // Merge note parts using the detected delimiter
                    const noteParts = values.slice(noteIdx, noteIdx + extraCount + 1);
                    const afterNote = values.slice(noteIdx + extraCount + 1);
                    values = [...beforeNote, noteParts.join(', '), ...afterNote];
                    console.log(`[CSV] Row ${rowIdx+1} merged: ${extraCount} extra columns found.`);
                }

                const obj: any = {};
                header.forEach((h, i) => {
                    obj[h] = values[i] || '';
                });
                return obj;
            });

            // Map and normalize fields
            const mappedData = data.map(item => {
                let srv = item.service || '';
                const normSrv = normalize(srv);
                if (normSrv.includes('foncier')) srv = 'foncier';
                else if (normSrv.includes('const')) srv = 'construction';
                else if (normSrv.includes('gest')) srv = 'gestion_immobiliere';
                else srv = 'construction';

                // Robust date parsing (DD/MM/YYYY)
                let cAt = item.date || item.creation || new Date().toISOString();
                if (typeof cAt === 'string' && cAt.includes('/')) {
                    const parts = cAt.split('/');
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                        cAt = `${year}-${month}-${day}`;
                    }
                }
                
                // Debug log for mapping
                console.log('[CSV Map] Item:', item.nom, '-> Statut:', item.statut, '-> Agent:', item.commercial);

                // Robust status mapping
                let stat = item.statut || item.status || item.stat || item.situation || 'Prospect';
                const normStat = normalize(stat);
                // Simple mapping for common variations
                if (normStat.includes('qualif')) stat = 'Qualification';
                else if (normStat.includes('rdv')) stat = 'RDV';
                else if (normStat.includes('prop')) stat = 'Proposition Commerciale';
                else if (normStat.includes('nego')) stat = 'Négociation';
                else if (normStat.includes('reser')) stat = 'Réservation';
                else if (normStat.includes('cont')) stat = 'Contrat';
                else if (normStat.includes('paie')) stat = 'Paiement';
                else if (normStat.includes('client')) stat = 'Client';

                // Détection de la présence explicite d'une colonne commercial dans le fichier
                const rowAgent = (item.commercial || item.agent || item.commercial_attribue || '').trim();
                let assignedAgent = '';

                // DEBUG: Détecter pourquoi l'admin est auto-assigné
                // console.log('[Import] rowAgent:', rowAgent, 'User Role:', user?.role, 'User Name:', user?.name);

                if (rowAgent) {
                    // Si une colonne commercial existe et est remplie dans le fichier, on l'utilise
                    assignedAgent = rowAgent;
                } else if (user?.role === 'commercial' || user?.role === 'conformite') {
                    // Si aucune colonne n'existe ET que c'est un commercial/conformité qui importe, on lui attribue
                    assignedAgent = user.name || '';
                } else {
                    // Sinon (admin, assistant, dir_com, etc.) et pas de colonne : à dispatcher (vide)
                    assignedAgent = '';
                }

                return {
                    name: item.nom || item.name || item.full_name || '',
                    company: item.entreprise || item.societe || item.company || '',
                    email: item.email || item.courriel || '',
                    phone: item.telephone || item.phone || item.tel || item.contact || item.mobile || item.numero || '',
                    status: stat,
                    notes: item.note || item.notes || item.note_interne || item.observations || item.commentaires || item.comm || item.details || '',
                    country: item.pays || item.country || '',
                    source: item.origine || item.source || item.canal || item.provenance || 'Importation',
                    service: srv as any,
                    assignedAgent: assignedAgent,
                    createdBy: user?.name || '',
                    createdAt: cAt
                };
            }).filter(item => item.name); // Filter out rows without a name

            if (mappedData.length === 0) {
                showToast("Aucun prospect valide trouvé dans le fichier", "info");
                return;
            }

            setImportData(mappedData);
        };
        reader.readAsText(file);
    };

    const processImport = async () => {
        if (importData.length === 0) return;
        setIsImporting(true);
        try {
            const newContacts = await addContactsBulk(importData);
            if (newContacts && newContacts.length > 0) {
                // Créer des entrées d'historique (interactions) pour les notes
                const notesInteractions = newContacts
                    .filter(c => c.notes && c.notes.trim())
                    .map(c => ({
                        contactId: c.id,
                        type: 'note' as any,
                        title: 'Note d\'importation',
                        description: c.notes,
                        date: new Date().toISOString().split('T')[0],
                        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        agent: c.assignedAgent || user?.name || 'Système'
                    }));

                if (notesInteractions.length > 0) {
                    await addInteractionsBulk(notesInteractions);
                }

                showToast(`${newContacts.length} prospects importés avec succès !`);
                setShowImportModal(false);
                setImportData([]);
            } else {
                showToast("Erreur lors de l'importation massive", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Une erreur est survenue pendant l'importation", "error");
        } finally {
            setIsImporting(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        const loadCommercials = async () => {
            const data = await fetchCommercials() as any;
            setCommercials(data);
        };
        loadCommercials();
    }, [user]);

    // Filtrer les commerciaux selon le service sélectionné dans le formulaire
    const availableAgents = commercials.filter(c => {
        // Exclure les techniciens (ils ne sont pas des commerciaux)
        if (c.role === 'technicien_terrain' || c.role === 'technicien_chantier') return false;

        // Pour les admins, dir_com et superviseurs, on montre TOUS les agents
        if (user?.role === 'admin' || user?.role === 'dir_commercial' || user?.role === 'superviseur') return true;
        
        // Pour un Responsable Commercial (RC), on montre ses managers et les agents de ses managers
        if (user?.role === 'resp_commercial') {
            const supervisedManagers = commercials.filter(comm => comm.parent_id === user.id);
            const supervisedManagerIds = supervisedManagers.map(m => m.id);
            return c.parent_id === user.id || (c.parent_id && supervisedManagerIds.includes(c.parent_id));
        }

        // Pour un manager, on montre les commerciaux de son groupe
        if (user?.role === 'manager') {
            return c.parent_id === user.id;
        }
        
        return false;
    });

    // ─── Liste des commerciaux supervisés (pour le dropdown de filtre) ───
    const supervisedForFilter = (() => {
        try {
            const names = getSupervisedAgentNames(user, commercials);
            if (names === null) {
                const set = new Set<string>();
                (contacts || []).forEach(c => { if (c.assignedAgent) set.add(c.assignedAgent); });
                return Array.from(set).sort();
            }
            return (names || []).filter(n => n && n !== user?.name).sort();
        } catch (err) {
            console.error('[ContactsList] Error calculating supervised list:', err);
            return [];
        }
    })();

    // Helper pour définir les périodes rapides
    const setQuickPeriod = (type: 'today' | 'week' | 'month' | 'year') => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        if (type === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (type === 'week') {
            const day = now.getDay() || 7;
            start.setDate(now.getDate() - day + 1);
            start.setHours(0, 0, 0, 0);
        } else if (type === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (type === 'year') {
            start = new Date(now.getFullYear(), 0, 1);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        if (dateFilterType === 'all') setDateFilterType('createdAt');
    };

    const filtered = useMemo(() => {
        try {
            return contacts.filter(c => {
                // 1. Recherche texte
                const matchesSearch =
                    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (c.company || '').toLowerCase().includes(searchTerm.toLowerCase());

                // 2. Filtre statut / température
                const score = calculateLeadScore(c);
                let matchesFilter = false;
                if (filter === 'Tous') {
                    matchesFilter = true;
                } else if (filter === 'temp-hot') {
                    matchesFilter = score >= 35;
                } else if (filter === 'temp-warm') {
                    matchesFilter = score >= 16 && score < 35;
                } else if (filter === 'temp-cold') {
                    matchesFilter = score < 16;
                } else if (filter === 'dossiers-chauds') {
                    matchesFilter = ['Proposition Commerciale', 'Négociation', 'Réservation'].includes(c.status);
                } else if (filter === 'ventes-globales') {
                    const SALE_STATUSES_LOCAL = ['Contrat', 'Paiement', 'Transfert de dossier technique', 'Transfert dossier tech', 'Suivi Chantier', 'Livraison Client', 'Fidélisation', 'Client', 'Projet Livré'];
                    matchesFilter = SALE_STATUSES_LOCAL.includes(c.status);
                } else {
                    matchesFilter = c.status === filter;
                }

                if (!matchesSearch || !matchesFilter) return false;

                // 3. Filtre par commercial (dropdown)
                if (agentFilter !== 'all') {
                    if (agentFilter === 'UNASSIGNED') {
                        if (c.assignedAgent) return false;
                    } else if ((c.assignedAgent || '').trim().toLowerCase() !== agentFilter.trim().toLowerCase()) {
                        return false;
                    }
                }

                // 4. Filtrage par date (Robuste : gère les dates partielles)
                if (dateFilterType !== 'all' && (startDate || endDate)) {
                    const dateValue = dateFilterType === 'createdAt' ? c.createdAt : c.convertedAt;
                    if (!dateValue) return false;
                    
                    const d = typeof dateValue === 'string' ? dateValue.split('T')[0] : '';
                    if (!d) return false;

                    if (startDate && d < startDate) return false;
                    if (endDate && d > endDate) return false;
                }

                // 5. Filtrage hiérarchique (accès)
                const supervisedNames = getSupervisedAgentNames(user, commercials);
                if (supervisedNames === null) return true; // Accès total

                if (user?.role === 'assistante') {
                    return c.createdBy === user.name || !c.assignedAgent;
                }

                // RC / Manager / Commercial : uniquement les contacts supervisés
                const lowerSupervised = supervisedNames.map(n => (n || '').trim().toLowerCase()).filter(Boolean);
                return lowerSupervised.includes((c.assignedAgent || '').trim().toLowerCase());
            });
        } catch (err) {
            console.error('[ContactsList] Error in filter logic:', err);
            return [];
        }
    }, [contacts, searchTerm, filter, agentFilter, user, commercials, dateFilterType, startDate, endDate]);

    const getStatusBadge = (status: string) => {
        const s = status || 'Prospect';
        switch (s) {
            case 'Prospect': return <span className="badge badge-warning text-uppercase">Prospect</span>;
            case 'Qualification': 
            case 'En Qualification': return <span className="badge badge-info text-uppercase">Qualification</span>;
            case 'RDV': return <span className="badge badge-primary text-uppercase">RDV</span>;
            case 'Visite Terrain': return <span className="badge badge-primary text-uppercase" style={{ backgroundColor: '#c026d3' }}>Visite Terrain</span>;
            case 'Proposition Commerciale': return <span className="badge badge-primary text-uppercase">Proposition</span>;
            case 'Négociation': return <span className="badge badge-info text-uppercase">Négociation</span>;
            case 'Réservation': return <span className="badge badge-secondary text-uppercase">Réservation</span>;
            case 'Contrat': return <span className="badge badge-success text-uppercase">Contrat</span>;
            case 'Paiement': return <span className="badge badge-success text-uppercase">Paiement</span>;
            case 'Transfert de dossier technique':
            case 'Transfert dossier tech': return <span className="badge badge-warning text-uppercase">Transfert Tech</span>;
            case 'Suivi Chantier': return <span className="badge badge-warning text-uppercase">Chantier</span>;
            case 'Livraison Client': return <span className="badge badge-success text-uppercase">Livré</span>;
            case 'Fidélisation': return <span className="badge badge-primary text-uppercase">Fidélisation</span>;
            default: return <span className="badge badge-secondary text-uppercase">{s}</span>;
        }
    };

    const openAdd = () => { 
        setEditContact(null); 
        const initialForm = { ...emptyForm };
        
        // Auto-sélection du service pour manager
        if (user?.role === 'manager' && user.service) {
            initialForm.service = (user.service === 'gestion' ? 'gestion_immobiliere' : user.service) as any;
        }
        
        setForm(initialForm); 
        setShowModal(true); 
    };
    const openEdit = (c: CrmContact) => { setEditContact(c); setForm({ ...c }); setShowModal(true); setOpenMenu(null); };

    const handleSave = async () => {
        if (!form.name.trim()) return;

        // Auto-assignation pour le commercial s'il crée lui-même, et forcer vide pour l'assistante.
        const contactData = { ...form };

        // Ajouter le créateur au contact lors de la création
        if (!editContact) {
            contactData.createdBy = user?.name || '';
        }

        if (user?.role === 'commercial') {
            contactData.assignedAgent = user.name;
        } else if (user?.role === 'assistante') {
            contactData.assignedAgent = '';
        }

        try {
            if (editContact && editContact.id) {
                const isNewAssignment = contactData.assignedAgent && contactData.assignedAgent !== editContact.assignedAgent;
                const success = await updateContact(editContact.id, contactData) as any;
                
                if (success) {
                    showToast('Contact mis à jour avec succès');
                    setShowModal(false);

                    // Notification d'assignation
                    if (isNewAssignment) {
                        const targetAgent = commercials.find(c => c.name === contactData.assignedAgent);
                        if (targetAgent) {
                            await addNotif({
                                type: 'prospect',
                                title: 'Nouveau prospect assigné',
                                message: `Le prospect ${contactData.name} vous a été assigné par ${user?.name || 'un administrateur'}.`,
                                assigned_to: targetAgent.id,
                                service: contactData.service
                            });
                        }
                    }
                } else {
                    showToast('Erreur lors de la mise à jour (Vérifiez la base de données)', 'error');
                }
            } else {
                const result = await addContact(contactData);
                if (typeof result === 'object' && result !== null) {
                    showToast('Nouveau prospect créé avec succès !');
                    setShowModal(false);

                    // Notification d'assignation pour nouvelle création
                    if (contactData.assignedAgent) {
                        const targetAgent = commercials.find(c => c.name === contactData.assignedAgent);
                        if (targetAgent) {
                            await addNotif({
                                type: 'prospect',
                                title: 'Nouveau prospect assigné',
                                message: `Le prospect ${contactData.name} vient d'être créé et vous a été assigné par ${user?.name || 'un administrateur'}.`,
                                assigned_to: targetAgent.id,
                                service: contactData.service
                            });
                        }
                    }

                    // Accéder à l'ID en toute sécurité pour redirection éventuelle
                    const newId = (result as CrmContact).id;
                    if (newId) setTimeout(() => navigate(`/prospects/${newId}`), 300);
                } else {
                    const msg = typeof result === 'string' ? result : 'Erreur de création';
                    showToast(`Erreur: ${msg}`, 'error');
                }
            }
        } catch (error) {
            console.error(error);
            showToast('Une erreur inattendue est survenue', 'error');
        }
    };

    const handleDelete = (c: CrmContact) => {
        deleteContact(c.id);
        showToast('Contact supprimé');
        setShowDeleteConfirm(null);
    };

    const handlePropertySelect = (prop: SelectedProperty) => {
        setForm(f => ({ ...f, propertyId: prop.id, propertyTitle: prop.title }));
    };

    return (
        <div className="contacts-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Prospects & Clients</h1>
                    <p className="subtitle">Gérez votre base de contacts et suivez leurs dossiers</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                        <Upload size={18} /> Importer
                    </button>
                    <button className="btn-primary" onClick={openAdd}>
                        <Plus size={18} /> Nouveau Contact
                    </button>
                </div>
            </div>

            <div className="contacts-toolbar card-premium">
                <div className="toolbar-main-row">
                    <div className="search-box">
                        <Search size={18} className="text-muted" />
                        <input type="text" placeholder="Rechercher par nom ou entreprise..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="filters">
                        <div className="filter-group">
                            <Filter size={18} className="text-muted" />
                            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                                <option value="Tous">Tous les prospects</option>
                                <option disabled style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>— Par Température —</option>
                                <option value="temp-hot">Chauds 🔥 (Priorité)</option>
                                <option value="temp-warm">Tièdes (En cours)</option>
                                <option value="temp-cold">Froids (À qualifier)</option>
                                <option disabled style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>— Par Statut —</option>
                                <option value="Prospect">Statut: Prospects</option>
                                <option value="En Qualification">Statut: Qualification</option>
                                <option value="RDV">Statut: RDV Effectués</option>
                                <option value="Client">Statut: Clients</option>
                                <option value="Projet Livré">Statut: Projets Livrés</option>
                            </select>
                        </div>

                        {/* Filtre par commercial — visible uniquement pour admin / dir_commercial / resp_commercial */}
                        {['admin', 'dir_commercial', 'resp_commercial'].includes(user?.role || '') && supervisedForFilter.length > 0 && (
                            <div className="filter-group">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <select
                                    value={agentFilter}
                                    onChange={(e) => setAgentFilter(e.target.value)}
                                    style={{ minWidth: 160 }}
                                >
                                    <option value="all">Tous les commerciaux</option>
                                    <option value="UNASSIGNED">À dispatcher</option>
                                    {supervisedForFilter.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="toolbar-date-row">
                    <div className="date-filter-group">
                        <Calendar size={16} className="text-muted" />
                        <span className="date-label">Filtrer par :</span>
                        <select 
                            value={dateFilterType} 
                            onChange={(e) => setDateFilterType(e.target.value as any)}
                            className="date-type-select"
                        >
                            <option value="all">Toutes les dates</option>
                            <option value="createdAt">Date d'enregistrement</option>
                            <option value="convertedAt">Date de vente (Client)</option>
                        </select>
                    </div>

                    {dateFilterType !== 'all' && (
                        <div className="date-range-inputs">
                            <div className="range-input">
                                <span>Du</span>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="range-input">
                                <span>Au</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="quick-periods">
                                <button onClick={() => setQuickPeriod('today')}>Aujourd'hui</button>
                                <button onClick={() => setQuickPeriod('week')}>Cette semaine</button>
                                <button onClick={() => setQuickPeriod('month')}>Ce mois</button>
                                <button className="clear-date" onClick={() => { setDateFilterType('all'); setStartDate(''); setEndDate(''); }}>Effacer</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="table-responsive-v2">
                <table className="contacts-table">
                    <thead>
                        <tr>
                            <th>Prospect / Client</th>
                            <th>Contact</th>
                            <th>Localisation</th>
                            <th>Service & Projet</th>
                            <th>Agent assigné</th>
                            <th>Statut & Score</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((contact: CrmContact) => (
                            <tr key={contact.id} className="contact-row clickable" onClick={() => navigate(`/prospects/${contact.id}`)}>
                                <td>
                                    <div className="user-profile-cell">
                                        <div>
                                            <div className="font-medium text-main">{contact.name}</div>
                                            <div className="text-xs text-muted">
                                                {contact.convertedAt ? (
                                                    <span className="text-success">Vendu le {new Date(contact.convertedAt).toLocaleDateString('fr-FR')}</span>
                                                ) : (
                                                    <span>Inscrit le {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted">{contact.company}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="contact-links">
                                        <span className="icon-link"><Phone size={14} /> {contact.phone}</span>
                                        <span className="icon-link"><Mail size={14} /> {contact.email}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="icon-text text-sm">
                                        <MapPin size={14} className="text-muted" />
                                        <span>{contact.address}{contact.country ? `, ${contact.country}` : ''}</span>
                                    </div>
                                </td>
                                <td>
                                    {contact.service ? (
                                        <div className="service-pill-v2">
                                            <div className="main-label">{SERVICE_LABELS[contact.service]}</div>
                                            {contact.propertyTitle && (
                                                <div className="sub-label">{contact.propertyTitle}</div>
                                            )}
                                        </div>
                                    ) : <span className="text-sm text-muted">—</span>}
                                </td>
                                <td>
                                    {contact.assignedAgent ? (() => {
                                        const theme = getAgentColor(contact.assignedAgent);
                                        return (
                                            <div className="agent-pill-v2" style={{ background: theme.bg, color: theme.text }}>
                                                <div className="pill-avatar">{contact.assignedAgent.charAt(0)}</div>
                                                {contact.assignedAgent}
                                            </div>
                                        );
                                    })() : (
                                        <div className="agent-pill-v2 unassigned">
                                            À dispatcher
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                        {getStatusBadge(contact.status)}
                                        {(() => {
                                            const score = calculateLeadScore(contact);
                                            const scoreClass = score >= 35 ? 'score-hot' : score >= 16 ? 'score-warm' : 'score-cold';
                                            return (
                                                <span className={`lead-score-badge ${scoreClass}`}>
                                                    {score} PTS {score >= 35 && '🔥'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </td>
                                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                    <div className="action-menu-wrap">
                                        <button className="btn-icon" onClick={() => setOpenMenu(openMenu === contact.id ? null : contact.id)}>⋮</button>
                                        {openMenu === contact.id && (
                                            <div className="action-dropdown">
                                                <button onClick={() => { navigate(`/prospects/${contact.id}`); setOpenMenu(null); }}><Eye size={14} /> Voir</button>
                                                {user?.role !== 'resp_commercial' && (
                                                    <button onClick={() => { navigate(`/prospects/${contact.id}?action=interaction`); setOpenMenu(null); }}><MessageSquare size={14} /> Interaction</button>
                                                )}
                                                {['admin', 'dir_commercial', 'commercial'].includes(user?.role || '') && (
                                                    <button onClick={() => openEdit(contact)}><Edit2 size={14} /> Modifier</button>
                                                )}
                                                {['admin', 'dir_commercial'].includes(user?.role || '') && (
                                                    <button className="danger" onClick={() => { setShowDeleteConfirm(contact); setOpenMenu(null); }}><Trash2 size={14} /> Supprimer</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className="empty-state">Aucun contact trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ---- Modale Nouveau / Modifier Contact ---- */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editContact ? 'Modifier le contact' : 'Nouveau Contact'} size="lg">
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Nom complet *</label>
                        <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Moussa Diop" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Entreprise / Profil</label>
                        <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Particulier, SCAC..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Téléphone</label>
                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Adresse</label>
                        <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Ex: 12 Avenue Senghor, Almadies" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Pays</label>
                        <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Ex: Sénégal, France..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Statut CRM</label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            {ALL_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Canal d'acquisition</label>
                        <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                            <option value="">— Sélectionner —</option>
                            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group col-2" style={{ display: 'flex', gap: '24px', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', marginTop: '8px' }}>
                        <label className="flex items-center gap-2 cursor-pointer" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={form.budgetConfirmed} onChange={e => setForm({ ...form, budgetConfirmed: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                            Budget Confirmé (+20 pts)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={form.isReactive} onChange={e => setForm({ ...form, isReactive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                            Prospect Réactif (+10 pts)
                        </label>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'dir_commercial') && (
                        <div className="form-group">
                            <label className="form-label">Commercial affecté</label>
                            <select 
                                className="form-select" 
                                value={form.assignedAgent || ''} 
                                onChange={e => setForm({ ...form, assignedAgent: e.target.value })}
                            >
                                <option value="">— Non assigné —</option>
                                {availableAgents.map(a => (
                                    <option key={a.id} value={a.name}>
                                        {a.name} ({a.service || 'Sans service'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="form-group col-2">
                        <label className="form-label">Notes Internes</label>
                        <textarea 
                            className="form-textarea" 
                            style={{ minHeight: '80px', fontSize: '0.88rem' }}
                            value={form.notes || ''} 
                            onChange={e => setForm({ ...form, notes: e.target.value })} 
                            placeholder="Observations, commentaires sur le prospect..."
                        />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Service demandé</label>
                        <ServiceSelector
                            value={form.service}
                            onChange={service => setForm({ ...form, service, propertyId: undefined, propertyTitle: undefined })}
                        />
                    </div>
                    {form.service && (
                        <div className="form-group col-2">
                            <label className="form-label">
                                {form.service === 'foncier' ? 'Terrain associé' : form.service === 'construction' ? 'Modèle de villa' : 'Bien immobilier'}
                                {form.propertyTitle && (
                                    <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--primary)', fontSize: '0.78rem' }}>
                                        ✓ {form.propertyTitle}
                                    </span>
                                )}
                            </label>
                            <PropertyPicker service={form.service} selectedId={form.propertyId} onSelect={handlePropertySelect} />
                        </div>
                    )}
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSave}>{editContact ? 'Enregistrer' : 'Créer le contact'}</button>
                </div>
            </Modal>

            {/* ---- Confirmation suppression ---- */}
            <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Supprimer le contact" size="sm">
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Voulez-vous vraiment supprimer <strong>{showDeleteConfirm?.name}</strong> ? Cette action est irréversible.
                </p>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Annuler</button>
                    <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>
                        Supprimer
                    </button>
                </div>
            </Modal>

            {/* ---- Modale Importation CSV ---- */}
            <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportData([]); }} title="Importer des prospects (CSV)" size="lg">
                {!importData.length ? (
                    <div className="import-dropzone" style={{ border: '2px dashed var(--border-color)', padding: '40px', borderRadius: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.01)' }}>
                        <Upload size={48} style={{ color: 'var(--primary)', marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ marginBottom: '8px' }}>Sélectionnez votre fichier CSV pour Construction</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
                            Colonnes recommandées : <br />
                            <strong>Nom, Téléphone, Commercial, Statut, Date, Note Interne</strong>
                        </p>
                        <input 
                            type="file" 
                            accept=".csv" 
                            id="csv-upload" 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange} 
                        />
                        <label htmlFor="csv-upload" className="btn-primary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                            Choisir un fichier
                        </label>
                    </div>
                ) : (
                    <div className="import-preview">
                        <p style={{ marginBottom: '16px' }}><strong>{importData.length}</strong> prospects détectés. Voici un aperçu :</p>
                        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '16px' }}>
                            <table className="contacts-table" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th>Nom</th>
                                        <th>Émail / Téléphone</th>
                                        <th>Statut</th>
                                        <th>Commercial</th>
                                        <th>Service</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importData.slice(0, 5).map((row, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{row.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.company}</div>
                                            </td>
                                            <td>
                                                <div>{row.email}</div>
                                                <div>{row.phone}</div>
                                            </td>
                                            <td>{getStatusBadge(row.status)}</td>
                                            <td>{row.assignedAgent || '—'}</td>
                                            <td>{row.service ? SERVICE_LABELS[row.service] : '—'}</td>
                                        </tr>
                                    ))}
                                    {importData.length > 5 && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                                                ... et {importData.length - 5} autres lignes
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="alert alert-info" style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            💡 Les prospects seront importés avec leurs statuts d'origine (ou <strong>Prospect</strong> par défaut) et la source <strong>Importation</strong>.
                        </div>
                        <div className="form-actions">
                            <button className="btn-secondary" onClick={() => setImportData([])} disabled={isImporting}>Changer de fichier</button>
                            <button 
                                className="btn-primary" 
                                onClick={processImport} 
                                disabled={isImporting}
                                style={{ minWidth: '150px' }}
                            >
                                {isImporting ? 'Importation en cours...' : `Confirmer l'import (${importData.length})`}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <style>{`
                .contacts-toolbar {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                }
                .toolbar-main-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }
                .toolbar-main-row .search-box { flex: 1; min-width: 300px; }
                .toolbar-main-row .filters { display: flex; gap: 1rem; flex-wrap: wrap; }

                .toolbar-date-row {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(0,0,0,0.05);
                    flex-wrap: wrap;
                }
                .date-filter-group {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--text-main);
                    font-weight: 600;
                    font-size: 0.9rem;
                }
                .date-label { color: var(--text-muted); font-weight: 500; }
                .date-type-select {
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 0.4rem 0.75rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: white;
                    color: var(--primary);
                }

                .date-range-inputs {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .range-input {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .range-input input {
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    padding: 0.35rem 0.6rem;
                    font-size: 0.85rem;
                    font-weight: 500;
                }

                .quick-periods {
                    display: flex;
                    gap: 0.5rem;
                }
                .quick-periods button {
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 0.35rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .quick-periods button:hover {
                    background: var(--primary-light);
                    color: var(--primary);
                    border-color: var(--primary);
                }
                .quick-periods button.clear-date {
                    background: #fee2e2;
                    color: #dc2626;
                    border-color: #fecaca;
                }
                .quick-periods button.clear-date:hover {
                    background: #f87171;
                    color: white;
                }

                @media (max-width: 768px) {
                    .toolbar-main-row .search-box { min-width: 100%; }
                    .toolbar-date-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
                }
            `}</style>
        </div>
    );
};

export default ContactsList;
