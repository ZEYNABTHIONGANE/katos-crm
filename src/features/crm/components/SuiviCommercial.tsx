import { useState, useMemo, useEffect } from 'react';
import { 
    Search, User, Download, FileText, 
    Clock, CheckCircle2, 
    TrendingUp,
    Activity, Calendar, Filter, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContactStore, STATUS_PROGRESS, STATUS_TO_COLUMN } from '@/stores/contactStore';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { fetchCommercials } from '../api/contactApi';
import { fetchEvaluations, saveEvaluation, type AgentEvaluation } from '../api/monitoringApi';
import { getSupervisedAgentNames } from '../utils/hierarchyUtils';
import Modal from '@/components/ui/Modal';

// External libs for export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Metadata for stages from Pipeline (replicated for independence or shared if possible)
const STAGE_META: Record<string, { title: string; color: string }> = {
    prospect: { title: 'Prospect', color: '#64748b' },
    qualification: { title: 'Qualification', color: '#E96C2E' },
    rdv: { title: 'RDV', color: '#F59E0B' },
    proposition: { title: 'Proposition Commerciale', color: '#3B82F6' },
    negociation: { title: 'Négociation', color: '#8B5CF6' },
    reservation: { title: 'Réservation', color: '#EC4899' },
    contrat: { title: 'Contrat', color: '#6366F1' },
    paiement: { title: 'Paiement', color: '#14B8A6' },
    transfert_technique: { title: 'Transfert Technique', color: '#F97316' },
    suivi_chantier: { title: 'Suivi Chantier', color: '#FBBF24' },
    livraison: { title: 'Livraison Client', color: '#10B981' },
    fidelisation: { title: 'Fidélisation', color: '#2B2E83' },
    pas_interesse: { title: 'Pas intéressé', color: '#ef4444' },
};

const SuiviCommercial = () => {
    const { user } = useAuth();
    const { contacts, interactions } = useContactStore();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // -- State --
    const [period, setPeriod] = useState('ce-mois');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [commercialFilter, setCommercialFilter] = useState('all');
    const [stageFilter, setStageFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewTab, setViewTab] = useState<'table' | 'flux'>('table');
    
    const [commercials, setCommercials] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([]);
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [evalNote, setEvalNote] = useState('');
    const [isSavingEval, setIsSavingEval] = useState(false);

    // -- Init --
    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const [agentsData, evalsData] = await Promise.all([
                fetchCommercials(),
                fetchEvaluations()
            ]);
            setCommercials(agentsData);
            setEvaluations(evalsData);
        };
        load();
    }, [user]);

    // -- Period Calculation --
    useEffect(() => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        if (period === 'aujourdhui') {
            start.setHours(0, 0, 0, 0);
        } else if (period === 'cette-semaine') {
            const day = now.getDay() || 7;
            start.setDate(now.getDate() - day + 1);
            start.setHours(0, 0, 0, 0);
        } else if (period === 'ce-mois') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'trimestre') {
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
        } else if (period === 'annee') {
            start = new Date(now.getFullYear(), 0, 1);
        } else if (period === 'tout') {
            start = new Date(2020, 0, 1);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, [period]);

    // -- Hierarchy Filtering --
    const supervisedCommercials = useMemo(() => {
        const names = getSupervisedAgentNames(user, commercials);

        if (names === null) {
            // Admin / Dir Commercial : voir tous les commerciaux distincts
            const set = new Set<string>();
            contacts.forEach(c => { if (c.assignedAgent) set.add(c.assignedAgent); });
            return Array.from(set).sort();
        }

        // Pour un Responsable Commercial : ne montrer QUE ses commerciaux attribués
        // (exclure son propre nom — il supervise, il ne vend pas directement)
        if (user?.role === 'resp_commercial') {
            return names.filter(n => n !== user.name).sort();
        }

        return names.sort();
    }, [commercials, user, contacts]);

    // -- Pipeline Progress Data (Active Deals) --
    const activeDeals = useMemo(() => {
        const supervisedLower = supervisedCommercials?.map(n => n.toLowerCase()) || [];
        const normalizedCommercialFilter = commercialFilter.toLowerCase().trim();
        
        let list = contacts.filter(c => {
            // 1. Filtrage hiérarchique
            const agentName = (c.assignedAgent || '').trim().toLowerCase();
            
            if (supervisedCommercials !== null) {
                if (!agentName) return false; 
                if (!supervisedLower.includes(agentName)) return false;
            }
            
            // 2. Filtrage par commercial sélectionné
            if (commercialFilter !== 'all') {
                if (agentName !== normalizedCommercialFilter) return false;
            }

            // 3. Filtrage par étape
            if (stageFilter !== 'all') {
                const colId = STATUS_TO_COLUMN[c.status] || 'prospect';
                if (colId !== stageFilter) return false;
            }

            // 4. Filtrage par période (basé sur l'activité récente)
            if (period !== 'tout') {
                const hasActivityInPeriod = interactions.some(i => 
                    i.contactId === c.id && 
                    i.date >= startDate && 
                    i.date <= endDate
                );
                if (!hasActivityInPeriod) return false;
            }

            // 5. Recherche intelligente multi-termes
            if (searchQuery) {
                const terms = searchQuery.toLowerCase().trim().split(/\s+/);
                const searchableText = `${c.name} ${c.company || ''} ${c.assignedAgent || ''} ${c.service || ''} ${c.status || ''}`.toLowerCase();
                
                // Tous les mots-clés doivent être présents
                const matches = terms.every(term => searchableText.includes(term));
                if (!matches) return false;
            }

            return true;
        });

        return list.map(c => {
            const colId = STATUS_TO_COLUMN[c.status] || 'prospect';
            const progress = STATUS_PROGRESS[colId] || 0;
            
            const lastSteps = interactions
                .filter(i => i.contactId === c.id && i.type === 'pipeline_step')
                .sort((a, b) => new Date(b.date + 'T' + (b.heure || '00:00')).getTime() - new Date(a.date + 'T' + (a.heure || '00:00')).getTime());
            
            const lastStep = lastSteps[0];

            return {
                ...c,
                progress,
                lastStepNote: lastStep?.description || 'Aucune note d\'étape.',
                lastStepDate: lastStep?.date
            };
        }).sort((a, b) => b.progress - a.progress);
    }, [contacts, interactions, commercialFilter, stageFilter, searchQuery, supervisedCommercials, period, startDate, endDate]);

    // -- Pipeline Steps Feed (Activity Log) --
    const pipelineFeed = useMemo(() => {
        const normalizedCommercialFilter = commercialFilter.toLowerCase().trim();
        
        return interactions
            .filter(i => i.type === 'pipeline_step')
            .filter(i => {
                const supervisedLower = supervisedCommercials?.map(n => n.toLowerCase()) || [];
                const agentName = (i.agent || '').trim().toLowerCase();
                
                // 1. Filtrage hiérarchique
                if (supervisedCommercials !== null && !supervisedLower.includes(agentName)) return false;
                
                // 2. Filtrage par commercial sélectionné
                if (commercialFilter !== 'all') {
                    if (agentName !== normalizedCommercialFilter) return false;
                }

                // 3. Filtrage par période
                if (i.date < startDate || i.date > endDate) return false;
                
                // 4. Recherche intelligente multi-termes
                if (searchQuery) {
                    const terms = searchQuery.toLowerCase().trim().split(/\s+/);
                    const contact = contacts.find(c => c.id === i.contactId);
                    const searchableText = `${contact?.name || ''} ${i.agent || ''} ${i.title || ''} ${i.description || ''}`.toLowerCase();
                    
                    return terms.every(term => searchableText.includes(term));
                }
                return true;
            })
            .sort((a, b) => new Date(b.date + 'T' + (b.heure || '00:00')).getTime() - new Date(a.date + 'T' + (a.heure || '00:00')).getTime());
    }, [interactions, supervisedCommercials, commercialFilter, startDate, endDate, searchQuery, contacts]);

    // -- KPI Stats --
    const stats = useMemo(() => {
        const total = activeDeals.length;
        const avg = total > 0 ? Math.round(activeDeals.reduce((s, d) => s + d.progress, 0) / total) : 0;
        const advanced = activeDeals.filter(d => d.progress >= 50).length;
        const wins = activeDeals.filter(d => d.progress === 100).length;
        return { total, avg, advanced, wins };
    }, [activeDeals]);

    // -- Distribution Stats (For Director/Admin) --
    const distribution = useMemo(() => {
        if (supervisedCommercials !== null) return null; // Only for high-level
        const counts: Record<string, number> = {};
        contacts.forEach(c => {
            const key = c.assignedAgent || 'Non assigné';
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [contacts, supervisedCommercials]);

    // -- Evaluation Logic --
    const currentEvaluation = useMemo(() => {
        if (commercialFilter === 'all') return null;
        return evaluations.find(e => e.agent_name === commercialFilter && e.evaluation_date === startDate);
    }, [evaluations, commercialFilter, startDate]);

    const handleSaveEval = async () => {
        if (commercialFilter === 'all' || !evalNote.trim()) return;
        setIsSavingEval(true);
        try {
            const success = await saveEvaluation({
                agent_name: commercialFilter,
                manager_id: user?.id || '',
                evaluation_date: startDate,
                evaluation_note: evalNote.trim()
            });
            if (success) {
                showToast('Évaluation enregistrée');
                const updated = await fetchEvaluations();
                setEvaluations(updated);
                setShowEvalModal(false);
                setEvalNote('');
            }
        } finally {
            setIsSavingEval(false);
        }
    };

    // -- Exports --
    const exportExcel = () => {
        const data = activeDeals.map(d => ({
            Commercial: d.assignedAgent,
            Prospect: d.name,
            Service: d.service || '—',
            Étape: d.status,
            Progression: `${d.progress}%`,
            'Dernière Note': d.lastStepNote
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pipeline");
        XLSX.writeFile(wb, `Suivi_Commercial_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportPDF = () => {
        const doc = new jsPDF() as any;
        doc.setFontSize(18);
        doc.setTextColor(43, 46, 131);
        doc.text("RAPPORT DE SUIVI PIPELINE COMMERCIAL", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Période : ${startDate} au ${endDate} | Filtre : ${commercialFilter}`, 105, 28, { align: 'center' });

        const tableData = activeDeals.map(d => [
            d.assignedAgent, d.name, d.status, `${d.progress}%`, d.lastStepNote.substring(0, 60)
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Commercial', 'Prospect', 'Étape', '%', 'Dernière Note']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [43, 46, 131] },
        });
        doc.save(`Suivi_Commercial_${commercialFilter}.pdf`);
    };

    return (
        <div className="suivi-commercial-page">
            <div className="page-header">
                <div>
                    <h1>Tableau de Pilotage Commercial</h1>
                    <p className="subtitle">Suivi stratégique de la progression du pipeline</p>
                </div>
                <div className="header-actions">
                    <button className="btn-outline btn-sm" onClick={exportExcel}><Download size={16} /> Excel</button>
                    <button className="btn-primary btn-sm" onClick={exportPDF}><FileText size={16} /> PDF</button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="monitoring-filters card-premium mb-20">
                <div className="filter-grid-advanced">
                    <div className="filter-item">
                        <label>Période</label>
                        <div className="input-with-icon">
                            <Filter size={14} />
                            <select value={period} onChange={e => setPeriod(e.target.value)}>
                                <option value="aujourdhui">Aujourd'hui</option>
                                <option value="cette-semaine">Cette semaine</option>
                                <option value="ce-mois">Ce mois-ci</option>
                                <option value="trimestre">Trimestre en cours</option>
                                <option value="annee">Année 2026</option>
                                <option value="tout">Toutes les données</option>
                                <option value="custom">Personnalisé</option>
                            </select>
                        </div>
                    </div>
                    {period === 'custom' && (
                        <>
                            <div className="filter-item">
                                <label>Du</label>
                                <div className="input-with-icon">
                                    <Calendar size={14} />
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="filter-item">
                                <label>Au</label>
                                <div className="input-with-icon">
                                    <Calendar size={14} />
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                        </>
                    )}
                    <div className="filter-item">
                        <label>Commercial</label>
                        <div className="input-with-icon">
                            <User size={14} />
                            <select value={commercialFilter} onChange={e => setCommercialFilter(e.target.value)}>
                                <option value="all">Tous les commerciaux</option>
                                {supervisedCommercials?.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="filter-item">
                        <label>Étape Pipeline</label>
                        <div className="input-with-icon">
                            <Filter size={14} />
                            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
                                <option value="all">Toutes les étapes</option>
                                {Object.entries(STAGE_META).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="filter-item search-box-v2">
                        <label>Recherche Client</label>
                        <div className="input-with-icon">
                            <Search size={14} />
                            <input type="text" placeholder="Nom du client..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribution Summary (Only for Director/Admin to see "where the others are") */}
            {distribution && (
                <div className="distribution-card card-premium mb-20">
                    <div className="card-header-v2" style={{ border: 'none', paddingBottom: '0.5rem' }}>
                        <h3 className="d-flex align-center gap-sm" style={{ fontSize: '0.9rem' }}>
                            <Filter size={16} /> Répartition Globale des Dossiers ({contacts.length})
                        </h3>
                    </div>
                    <div className="dist-scroll">
                        {distribution.map(([name, count]) => (
                            <div key={name} className="dist-item">
                                <span className={name === 'Non assigné' ? 'text-orange font-bold' : 'text-slate'}>{name}</span>
                                <span className="dist-badge">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* KPI Row */}
            <div className="stats-grid mb-20">
                <div className="stat-card-v2 grad-blue">
                    <TrendingUp size={22} className="stat-icon" />
                    <div className="stat-body">
                        <span className="stat-label">Dossiers Actifs</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                </div>
                <div className="stat-card-v2 grad-purple">
                    <Activity size={22} className="stat-icon" />
                    <div className="stat-body">
                        <span className="stat-label">Progression Moyenne</span>
                        <span className="stat-value">{stats.avg}%</span>
                    </div>
                </div>
                <div className="stat-card-v2 grad-orange">
                    <Clock size={22} className="stat-icon" />
                    <div className="stat-body">
                        <span className="stat-label">Dossiers Avancés</span>
                        <span className="stat-value">{stats.advanced}</span>
                    </div>
                </div>
                <div className="stat-card-v2 grad-green">
                    <CheckCircle2 size={22} className="stat-icon" />
                    <div className="stat-body">
                        <span className="stat-label">Objectifs Atteints</span>
                        <span className="stat-value">{stats.wins}</span>
                    </div>
                </div>
            </div>

            {/* Manager Evaluation Display (Only if 1 commercial selected) */}
            {commercialFilter !== 'all' && (
                <div className="evaluation-banner card-premium mb-20" style={{ borderLeft: '4px solid var(--primary)', padding: '1rem' }}>
                    <div className="d-flex justify-between align-center mb-10">
                        <h3 className="d-flex align-center gap-sm" style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                            <FileText size={18} className="text-primary" /> Evaluation Performance - {commercialFilter}
                        </h3>
                        <button className="btn-outline btn-sm" style={{ fontWeight: 700 }} onClick={() => {
                            setEvalNote(currentEvaluation?.evaluation_note || '');
                            setShowEvalModal(true);
                        }}>
                            {currentEvaluation ? 'Modifier la note' : 'Ajouter une note'}
                        </button>
                    </div>
                    {currentEvaluation ? (
                        <div>
                            <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 500 }}>
                                "{currentEvaluation.evaluation_note}"
                            </p>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Note enregistrée le {new Date(currentEvaluation.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    ) : (
                        <p className="text-muted text-sm">Aucune évaluation enregistrée pour ce commercial sur cette période.</p>
                    )}
                </div>
            )}

            {/* Tab Switcher */}
            <div className="tab-switcher mb-20">
                <button className={`tab-btn ${viewTab === 'table' ? 'active' : ''}`} onClick={() => setViewTab('table')}>
                    <TrendingUp size={18} /> État des Dossiers
                </button>
                <button className={`tab-btn ${viewTab === 'flux' ? 'active' : ''}`} onClick={() => setViewTab('flux')}>
                    <Activity size={18} /> Flux des Mouvements
                </button>
            </div>

            {/* Dashboard Content */}
            <div className="dashboard-content">
                {/* View 1: Progress Table */}
                {viewTab === 'table' && (
                    <div className="card-premium h-full" style={{ padding: 0 }}>
                        <div className="card-header-v2">
                            <h3 className="d-flex align-center gap-sm"><TrendingUp size={18} /> État d'Avancement des Dossiers</h3>
                        </div>
                        <div className="table-responsive-v2">
                            <table className="suivi-table">
                                <thead>
                                    <tr>
                                        <th>Prospect</th>
                                        <th>Commercial</th>
                                        <th>Étape Pipeline</th>
                                        <th>Progression</th>
                                        <th>Dernière Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeDeals.map(d => (
                                        <tr key={d.id} className="clickable" onClick={() => navigate(`/prospects/${d.id}`)}>
                                            <td>
                                                <div className="client-cell">
                                                    <div className="client-avatar">{d.name.charAt(0)}</div>
                                                    <div>
                                                        <div className="client-name">{d.name}</div>
                                                        <div className="client-svc">{d.service}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="commercial-name">{d.assignedAgent}</span></td>
                                            <td>
                                                <div className="stage-badge" style={{ 
                                                    backgroundColor: STAGE_META[STATUS_TO_COLUMN[d.status] || 'prospect']?.color + '15',
                                                    color: STAGE_META[STATUS_TO_COLUMN[d.status] || 'prospect']?.color
                                                }}>
                                                    {d.status}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="progress-cell">
                                                    <div className="progress-bar-bg">
                                                        <div className="progress-bar-fill" style={{ width: `${d.progress}%`, backgroundColor: d.progress === 100 ? '#10b981' : 'var(--primary)' }} />
                                                    </div>
                                                    <span className="progress-text">{d.progress}%</span>
                                                </div>
                                            </td>
                                            <td><p className="last-note-text" title={d.lastStepNote}>{d.lastStepNote}</p></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* View 2: Activity Feed */}
                {viewTab === 'flux' && (
                    <div className="card-premium h-full" style={{ padding: 0 }}>
                        <div className="card-header-v2">
                            <h3 className="d-flex align-center gap-sm"><Activity size={18} /> Historique des Mouvements</h3>
                        </div>
                        <div className="feed-container-v2">
                            {pipelineFeed.map(item => {
                                const contact = contacts.find(c => c.id === item.contactId);
                                const stageName = item.title.split(': ').pop() || '';
                                const stage = STAGE_META[STATUS_TO_COLUMN[stageName] || 'prospect'];
                                
                                return (
                                    <div key={item.id} className="feed-item-v2">
                                        <div className="feed-v2-meta">
                                            <div className="feed-v2-time">
                                                <Calendar size={12} /> {new Date(item.date).toLocaleDateString()} à {item.heure}
                                            </div>
                                            <div className="feed-v2-commercial"><User size={12} /> {item.agent}</div>
                                        </div>
                                        <div className="feed-v2-main">
                                            <div className="feed-v2-badge" style={{ backgroundColor: stage?.color }}>{stageName}</div>
                                            <div className="feed-v2-content">
                                                <div className="feed-v2-client" onClick={() => navigate(`/prospects/${item.contactId}`)}>
                                                    <strong>{contact?.name}</strong> <ChevronRight size={14} />
                                                </div>
                                                <p className="feed-v2-note">{item.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {pipelineFeed.length === 0 && (
                                <div className="empty-feed">Aucun mouvement détecté sur cette période.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Styles for new layout */}
            <style>{`
                .filter-grid-advanced {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 1.5rem;
                    align-items: flex-end;
                }
                .filter-item label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .input-with-icon {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    background: #f8fafc;
                    padding: 0.6rem 0.8rem;
                    border-radius: 8px;
                    border: 1px solid #94a3b8;
                    transition: all 0.2s;
                }
                .input-with-icon:focus-within {
                    border-color: var(--primary);
                    background: white;
                    box-shadow: 0 0 0 3px rgba(43, 46, 131, 0.05);
                }
                .input-with-icon svg { color: #0f172a !important; stroke-width: 2.5; }
                .input-with-icon input, .input-with-icon select {
                    border: none;
                    background: transparent;
                    width: 100%;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #0f172a;
                    outline: none;
                }
                
                .tab-switcher {
                    display: flex;
                    gap: 1rem;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 2px;
                }
                .tab-btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    background: transparent;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    position: relative;
                    transition: all 0.2s;
                }
                .tab-btn.active { color: var(--primary); }
                .tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: var(--primary);
                    border-radius: 3px;
                }
                .tab-btn:hover:not(.active) { color: #334155; background: #f8fafc; border-radius: 8px 8px 0 0; }

                .card-header-v2 {
                    padding: 1.25rem;
                    border-bottom: 1px solid #f1f5f9;
                    background: #fcfdfe;
                }
                .card-header-v2 h3 { margin: 0; font-size: 1rem; color: var(--primary); }

                .suivi-table { width: 100%; border-collapse: collapse; }
                .suivi-table th { text-align: left; padding: 1rem; font-size: 0.75rem; color: #1e293b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 700; }
                .suivi-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

                .client-cell { display: flex; align-items: center; gap: 0.75rem; }
                .client-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; }
                .client-name { font-weight: 600; font-size: 0.85rem; color: #0f172a; }
                .client-svc { font-size: 0.7rem; color: #64748b; }

                .stage-badge { padding: 0.35rem 0.8rem; border-radius: 100px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
                
                .progress-cell { display: flex; align-items: center; gap: 0.75rem; }
                .progress-bar-bg { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; position: relative; }
                .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
                .progress-text { font-size: 0.8rem; font-weight: 800; color: #0f172a; }

                .last-note-text { font-size: 0.8rem; color: #334155; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }

                /* Feed V2 Styles */
                .feed-container-v2 { padding: 1.5rem; display: grid; gap: 1rem; }
                .feed-item-v2 { 
                    background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s;
                }
                .feed-item-v2:hover { border-color: var(--primary); box-shadow: 0 4px 12px rgba(43, 46, 131, 0.08); }
                .feed-v2-meta { display: flex; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.5rem; }
                .feed-v2-time, .feed-v2-commercial { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
                .feed-v2-commercial { color: var(--primary); font-weight: 600; }
                .feed-v2-main { display: flex; gap: 1rem; align-items: flex-start; }
                .feed-v2-badge { 
                    padding: 0.4rem 0.8rem; border-radius: 8px; color: white; font-size: 0.75rem; 
                    font-weight: 700; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .feed-v2-content { flex: 1; }
                .feed-v2-client { 
                    font-size: 0.9rem; color: #0f172a; margin-bottom: 0.4rem; cursor: pointer;
                    display: flex; align-items: center; gap: 0.4rem;
                }
                .feed-v2-client:hover { color: var(--primary); }
                .feed-v2-note { font-size: 0.85rem; color: #334155; line-height: 1.5; margin: 0; }
                
                .empty-feed { padding: 4rem; text-align: center; color: #94a3b8; font-size: 0.9rem; font-style: italic; }

                .distribution-card { background: #fcfdfe; }
                .dist-scroll { 
                    display: flex; gap: 1.5rem; overflow-x: auto; padding: 1rem; 
                    scrollbar-width: thin;
                }
                .dist-item { 
                    display: flex; flex-direction: column; align-items: center; 
                    gap: 0.4rem; min-width: 100px; padding: 0.5rem;
                    border-radius: 8px; background: white; border: 1px solid #f1f5f9;
                }
                .dist-item span { font-size: 0.75rem; white-space: nowrap; }
                .dist-badge { 
                    background: var(--primary); color: white; padding: 0.2rem 0.6rem; 
                    border-radius: 100px; font-weight: 700; font-size: 0.8rem !important;
                }
                .text-orange { color: #f97316; }
                .font-bold { font-weight: 700; }
                .text-slate { color: #475569; font-weight: 600; }
            `}</style>
            
            {/* Evaluations Modal */}
            <Modal isOpen={showEvalModal} onClose={() => setShowEvalModal(false)} title={`Évaluation Commercial : ${commercialFilter}`} size="md">
                <div className="form-group">
                    <label className="form-label">Note de performance (hebdomadaire/mensuelle)</label>
                    <textarea 
                        className="form-textarea" rows={6}
                        placeholder="Rédigez votre évaluation ici..."
                        value={evalNote}
                        onChange={e => setEvalNote(e.target.value)}
                    />
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowEvalModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSaveEval} disabled={isSavingEval}>{isSavingEval ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
            </Modal>
        </div>
    );
};

export default SuiviCommercial;
