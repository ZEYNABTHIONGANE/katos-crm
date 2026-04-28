import React, { useState, useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useContactStore, type CrmContact } from '@/stores/contactStore';
import { useToast } from '@/app/providers/ToastProvider';
import { Search, Plus, Upload } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const SOURCE_OPTIONS = [
    'Site web', 'Facebook', 'Instagram', 'TikTok', 'LinkedIn', 
    'WhatsApp', 'SMS', 'Email', 'Appel (Apporteur)', 'Appel (Prospection)', 
    'Terrain', 'Recommandation', 'Bouche à oreille', 'Autre'
];

const getAgentColor = (name: string) => {
    if (!name) return { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' };
    const colors = [
        { bg: 'rgba(43, 46, 131, 0.1)', text: '#2B2E83' }, 
        { bg: 'rgba(233, 108, 46, 0.1)', text: '#E96C2E' }, 
        { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' }, 
        { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366F1' }, 
        { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const MarketingProspects = () => {
    const { user } = useAuth();
    const { contacts, addContact, addContactsBulk } = useContactStore();
    const { showToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [dispatchFilter, setDispatchFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [form, setForm] = useState<Partial<CrmContact> & { type?: 'particulier' | 'entreprise' }>({
        name: '', company: '', email: '', phone: '',
        status: 'Prospect', source: '', notes: '', type: 'particulier'
    });

    const tableContacts = useMemo(() => {
        return contacts
            .filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(c => {
                if (dateFilter && (!c.createdAt || !c.createdAt.startsWith(dateFilter))) return false;
                if (dispatchFilter === 'dispatched' && !c.assignedAgent) return false;
                if (dispatchFilter === 'undispatched' && c.assignedAgent) return false;
                if (sourceFilter !== 'all' && (c.source || '').toLowerCase() !== sourceFilter.toLowerCase()) return false;
                return true;
            })
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [contacts, searchTerm, dateFilter, dispatchFilter, sourceFilter]);


    // --- HANDLERS ---
    const handleAddSubmit = async () => {
        if (!form.name) return;
        try {
            const newContact = {
                ...form,
                company: form.type === 'entreprise' ? form.company : '',
                createdBy: user?.name || 'Marketing',
                assignedAgent: '', // A dispatcher
                createdAt: new Date().toISOString()
            } as any;
            
            await addContact(newContact);
            showToast('Prospect créé avec succès');
            setShowModal(false);
            setForm({ name: '', company: '', email: '', phone: '', status: 'Prospect', source: '', notes: '', type: 'particulier' });
        } catch (err) {
            showToast('Erreur lors de la création', 'error');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;
            const rows = text.split(/\r?\n/).filter(row => row.trim());
            if (rows.length < 2) return;

            const delimiter = (rows[0].match(/;/g) || []).length > (rows[0].match(/,/g) || []).length ? ';' : ',';
            const headers = rows[0].split(delimiter).map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            
            const data = rows.slice(1).map(row => {
                const values = row.split(delimiter);
                const obj: any = {};
                headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
                
                return {
                    name: obj.nom || obj.name || obj.full_name || '',
                    company: obj.entreprise || obj.societe || '',
                    email: obj.email || '',
                    phone: obj.telephone || obj.phone || obj.tel || '',
                    source: obj.source || obj.origine || obj.canal || 'Importation',
                    status: 'Prospect',
                    assignedAgent: '',
                    createdBy: user?.name || 'Marketing',
                    createdAt: new Date().toISOString()
                };
            }).filter(item => item.name);

            setImportData(data);
        };
        reader.readAsText(file);
    };

    const processImport = async () => {
        if (importData.length === 0) return;
        setIsImporting(true);
        try {
            await addContactsBulk(importData);
            showToast(`${importData.length} prospects importés !`);
            setShowImportModal(false);
            setImportData([]);
        } catch (err) {
            showToast('Erreur import', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="marketing-dashboard">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Registre Global des Prospects</h1>
                    <p className="subtitle">Consultez tous les contacts et importez de nouveaux leads</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                        <Upload size={18} /> Importer Prospects
                    </button>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Ajouter Manuellement
                    </button>
                </div>
            </div>

            <div className="card-premium" style={{ marginTop: '1.5rem' }}>
                <div className="d-flex-between flex-wrap gap-3" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-soft)', background: 'rgba(248, 250, 252, 0.4)' }}>
                    <h3 style={{ margin: 0, minWidth: 'max-content' }}>Tous les contacts générés</h3>
                    <div className="d-flex gap-2 items-center flex-wrap" style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '0.2rem', background: '#ffffff', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                            <input type="date" className="form-input" style={{ border: 'none', background: 'transparent', width: 'auto', padding: '0.4rem 0.6rem', outline: 'none' }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} title="Filtrer par date" />
                            <div style={{ width: '1px', background: 'var(--border-soft)', margin: '6px 0' }}></div>
                            <select className="form-select" style={{ border: 'none', background: 'transparent', width: 'auto', padding: '0.4rem 0.6rem', outline: 'none', cursor: 'pointer' }} value={dispatchFilter} onChange={e => setDispatchFilter(e.target.value)}>
                                <option value="all">Tous (Dispatching)</option>
                                <option value="dispatched">Assignés</option>
                                <option value="undispatched">À dispatcher</option>
                            </select>
                            <div style={{ width: '1px', background: 'var(--border-soft)', margin: '6px 0' }}></div>
                            <select className="form-select" style={{ border: 'none', background: 'transparent', width: 'auto', padding: '0.4rem 0.6rem', outline: 'none', cursor: 'pointer', maxWidth: '160px', textOverflow: 'ellipsis' }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                                <option value="all">Toutes les sources</option>
                                {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        {(dateFilter || dispatchFilter !== 'all' || sourceFilter !== 'all') && (
                            <button className="btn-secondary" style={{ padding: '0.5rem 0.8rem', background: '#fff', border: '1px solid var(--border-color)' }} onClick={() => {setDateFilter(''); setDispatchFilter('all'); setSourceFilter('all');}}>
                                Réinitialiser
                            </button>
                        )}
                        <div className="search-box" style={{ background: '#fff', border: '1px solid var(--border-color)' }}>
                            <Search size={18} className="text-muted" />
                            <input type="text" placeholder="Rechercher un prospect..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>
                
                <div className="table-responsive-v2" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    <table className="contacts-table">
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-app)', zIndex: 10 }}>
                            <tr>
                                <th>Date d'ajout</th>
                                <th>Nom complet</th>
                                <th>Coordonnées</th>
                                <th>Source / Canal</th>
                                <th>Agent Assigné</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableContacts.map(c => (
                                <tr key={c.id}>
                                    <td>{new Date(c.createdAt || 0).toLocaleDateString('fr-FR')}</td>
                                    <td>
                                        <div className="font-medium text-main">{c.name}</div>
                                        {c.company && <div className="text-xs text-muted">{c.company}</div>}
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column gap-1">
                                            <span className="text-sm">{c.phone || '—'}</span>
                                            {c.email && <span className="text-xs text-muted">{c.email}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-info" style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>{c.source || 'Inconnu'}</span>
                                    </td>
                                    <td>
                                        {c.assignedAgent ? (() => {
                                            const theme = getAgentColor(c.assignedAgent);
                                            return <span style={{ padding: '4px 10px', borderRadius: '12px', background: theme.bg, color: theme.text, fontSize: '0.75rem', fontWeight: 600 }}>{c.assignedAgent}</span>;
                                        })() : (
                                            <span className="text-danger font-medium">À dispatcher</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {tableContacts.length === 0 && (
                                <tr><td colSpan={6} className="empty-state" style={{ padding: '3rem' }}>Aucun prospect trouvé.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALS */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Ajouter un prospect" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Type de prospect</label>
                        <div className="d-flex gap-4">
                            <label className="d-flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="type" checked={form.type === 'particulier'} onChange={() => setForm({...form, type: 'particulier'})} /> Particulier
                            </label>
                            <label className="d-flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="type" checked={form.type === 'entreprise'} onChange={() => setForm({...form, type: 'entreprise'})} /> Entreprise
                            </label>
                        </div>
                    </div>
                    {form.type === 'entreprise' && (
                        <div className="form-group col-2">
                            <label className="form-label">Nom de l'entreprise *</label>
                            <input className="form-input" value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Ex: Katos Immobilier" />
                        </div>
                    )}
                    <div className="form-group col-2">
                        <label className="form-label">Nom complet du contact *</label>
                        <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Jean Dupont" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Téléphone</label>
                        <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Canal d'acquisition (Source) *</label>
                        <select className="form-select" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                            <option value="">Sélectionnez un canal</option>
                            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group col-2">
                        <label className="form-label">Note / Description (Optionnel)</label>
                        <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Détails supplémentaires..." />
                    </div>
                </div>
                <div className="form-actions mt-15">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleAddSubmit} disabled={!form.name}>Enregistrer le prospect</button>
                </div>
            </Modal>

            <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Importer des prospects (CSV)" size="md">
                <div className="form-grid">
                    <div className="form-group col-2">
                        <label className="form-label">Sélectionnez le fichier CSV</label>
                        <input type="file" accept=".csv" onChange={handleFileChange} className="form-input" style={{ padding: '0.5rem' }} />
                    </div>
                    {importData.length > 0 && (
                        <div className="col-2 alert" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                            <p className="font-medium mb-0">{importData.length} prospects détectés prêts à être importés.</p>
                        </div>
                    )}
                </div>
                <div className="form-actions mt-15">
                    <button className="btn-secondary" onClick={() => setShowImportModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={processImport} disabled={importData.length === 0 || isImporting}>
                        {isImporting ? 'Importation...' : 'Lancer l\'importation'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default MarketingProspects;
