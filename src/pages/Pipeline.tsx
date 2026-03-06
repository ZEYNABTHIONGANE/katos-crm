import { useState } from 'react';
import { Plus, MoreVertical, Phone, Calendar, ArrowRight, Trash2, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import '../components/Modal.css';
import './Pipeline.css';

// ---------- Types ----------
type CardType = {
    id: string; name: string; company: string; phone: string;
    zone: string; budget: string; since: string;
};

type ColumnType = {
    id: string; title: string; color: string; icon: string; cards: CardType[];
};

type PipelineType = { [key: string]: ColumnType };

const columnOrder = ['nouveau', 'qualification', 'rdv', 'client', 'livre'];

const initialPipeline: PipelineType = {
    nouveau: {
        id: 'nouveau', title: 'Nouveau Prospect', color: '#64748b', icon: '🔵', cards: [
            { id: 'c1', name: 'Awa Ndiaye', company: 'Particulier', phone: '+221 76 987 65 43', zone: 'Almadies', budget: 'NC', since: '03 Mar 2026' },
            { id: 'c2', name: 'Ibou Sy', company: 'Promoteur XYZ', phone: '+221 77 000 11 22', zone: 'Dakar Centre', budget: 'NC', since: '05 Mar 2026' },
        ]
    },
    qualification: {
        id: 'qualification', title: 'En Qualification', color: '#E96C2E', icon: '🟠', cards: [
            { id: 'c3', name: 'Cheikh Fall', company: 'BTP Construction', phone: '+221 77 555 11 22', zone: 'Diamniadio', budget: '25M FCFA', since: '27 Fév 2026' },
        ]
    },
    rdv: {
        id: 'rdv', title: 'RDV / Visite Terrain', color: '#F59E0B', icon: '🟡', cards: [
            { id: 'c4', name: 'Fatou Sow', company: 'Particulier', phone: '+221 78 444 99 88', zone: 'Mermoz', budget: '15M FCFA', since: '20 Fév 2026' },
        ]
    },
    client: {
        id: 'client', title: 'Client Actif', color: '#2B2E83', icon: '🔷', cards: [
            { id: 'c5', name: 'Moussa Diop', company: 'SCAC Sénégal', phone: '+221 77 123 45 67', zone: 'Dakar Plateau', budget: '80M FCFA', since: '12 Jan 2026' },
            { id: 'c6', name: 'Groupe ABC', company: 'Groupe ABC', phone: '+221 33 800 00 00', zone: 'Dakar', budget: '120M FCFA', since: '05 Fév 2026' },
        ]
    },
    livre: {
        id: 'livre', title: 'Projet Livré', color: '#10B981', icon: '✅', cards: [
            { id: 'c7', name: 'Ibou Thiam', company: 'Particulier', phone: '+221 70 111 22 33', zone: 'Saly', budget: '45M FCFA', since: '10 Jan 2026' },
        ]
    },
};

const emptyForm = { name: '', company: 'Particulier', phone: '', zone: '', budget: '' };

// ---------- Composant Carte ----------
const KanbanCard = ({
    card, colId, colColor, onMove, onDelete
}: {
    card: CardType; colId: string; colColor: string;
    onMove: (cardId: string, fromCol: string, toCol: string) => void;
    onDelete: (cardId: string, colId: string) => void;
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const curIdx = columnOrder.indexOf(colId);
    const nextCol = columnOrder[curIdx + 1];

    return (
        <div className="kanban-card">
            <div className="kcard-header">
                <div className="kcard-avatar">{card.name.charAt(0)}</div>
                <div className="kcard-info">
                    <span className="kcard-name">{card.name}</span>
                    <span className="kcard-company">{card.company}</span>
                </div>
                <div className="kcard-menu-wrap">
                    <button className="btn-icon-sm" onClick={() => setMenuOpen(!menuOpen)}>
                        <MoreVertical size={15} />
                    </button>
                    {menuOpen && (
                        <div className="kcard-dropdown">
                            {nextCol && (
                                <button onClick={() => { onMove(card.id, colId, nextCol); setMenuOpen(false); }}>
                                    <ArrowRight size={13} /> Avancer l'étape
                                </button>
                            )}
                            <button onClick={() => setMenuOpen(false)}>
                                <Calendar size={13} /> Planifier RDV
                            </button>
                            <button onClick={() => setMenuOpen(false)}>
                                <Phone size={13} /> Enregistrer appel
                            </button>
                            <button className="danger" onClick={() => { onDelete(card.id, colId); setMenuOpen(false); }}>
                                <Trash2 size={13} /> Supprimer
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="kcard-meta">
                <span className="kcard-tag">📍 {card.zone}</span>
                {card.budget !== 'NC' && <span className="kcard-tag kcard-budget">💰 {card.budget}</span>}
            </div>
            <div className="kcard-footer">
                <span className="kcard-since">Ajouté le {card.since}</span>
                {nextCol && (
                    <button
                        className="kcard-advance-btn"
                        style={{ borderColor: colColor, color: colColor }}
                        onClick={() => onMove(card.id, colId, nextCol)}
                        title="Avancer à l'étape suivante"
                    >
                        <ArrowRight size={13} /> Avancer
                    </button>
                )}
            </div>
        </div>
    );
};

// ---------- Page Pipeline ----------
const Pipeline = () => {
    const [pipeline, setPipeline] = useState<PipelineType>(initialPipeline);
    const [showModal, setShowModal] = useState(false);
    const [targetCol, setTargetCol] = useState('nouveau');
    const [form, setForm] = useState(emptyForm);

    const totalCards = Object.values(pipeline).reduce((acc, col) => acc + col.cards.length, 0);

    const openAdd = (colId: string) => { setTargetCol(colId); setForm(emptyForm); setShowModal(true); };

    const handleSave = () => {
        if (!form.name.trim()) return;
        const newCard: CardType = {
            id: 'c' + Date.now(), since: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...form
        };
        setPipeline(prev => ({
            ...prev,
            [targetCol]: { ...prev[targetCol], cards: [...prev[targetCol].cards, newCard] }
        }));
        setShowModal(false);
    };

    const moveCard = (cardId: string, fromCol: string, toCol: string) => {
        setPipeline(prev => {
            const card = prev[fromCol].cards.find(c => c.id === cardId)!;
            return {
                ...prev,
                [fromCol]: { ...prev[fromCol], cards: prev[fromCol].cards.filter(c => c.id !== cardId) },
                [toCol]: { ...prev[toCol], cards: [...prev[toCol].cards, card] },
            };
        });
    };

    const deleteCard = (cardId: string, colId: string) => {
        setPipeline(prev => ({
            ...prev,
            [colId]: { ...prev[colId], cards: prev[colId].cards.filter(c => c.id !== cardId) }
        }));
    };

    return (
        <div className="pipeline-page">
            <div className="page-header d-flex-between">
                <div>
                    <h1>Pipeline Commercial</h1>
                    <p className="subtitle">{totalCards} dossiers actifs · Suivez chaque prospect à travers les étapes</p>
                </div>
                <button className="btn-primary" onClick={() => openAdd('nouveau')}>
                    <Plus size={18} /> Nouveau Prospect
                </button>
            </div>

            {/* Résumé rapide */}
            <div className="pipeline-summary">
                {columnOrder.map(colId => {
                    const col = pipeline[colId];
                    return (
                        <div key={col.id} className="summary-chip" style={{ borderColor: col.color }}>
                            <span className="summary-count" style={{ color: col.color }}>{col.cards.length}</span>
                            <span className="summary-label">{col.title}</span>
                        </div>
                    );
                })}
            </div>

            {/* Colonnes Kanban */}
            <div className="kanban-board">
                {columnOrder.map(colId => {
                    const col = pipeline[colId];
                    return (
                        <div key={col.id} className="kanban-column">
                            <div className="column-header" style={{ borderTopColor: col.color }}>
                                <div className="column-title">
                                    <span>{col.icon}</span>
                                    <h3>{col.title}</h3>
                                    <span className="column-count" style={{ backgroundColor: col.color }}>{col.cards.length}</span>
                                </div>
                                <button className="btn-icon-sm" title="Ajouter un dossier" onClick={() => openAdd(col.id)}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="column-body">
                                {col.cards.length > 0 ? col.cards.map(card => (
                                    <KanbanCard key={card.id} card={card} colId={col.id} colColor={col.color} onMove={moveCard} onDelete={deleteCard} />
                                )) : (
                                    <div className="empty-column" onClick={() => openAdd(col.id)} style={{ cursor: 'pointer' }}>
                                        <Plus size={16} /> Ajouter un dossier
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ---- Modale Nouveau Prospect ---- */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Ajouter dans "${pipeline[targetCol]?.title}"`} size="md">
                <div className="form-grid">
                    <div className="form-group"><label className="form-label">Nom complet *</label>
                        <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Moussa Diop" /></div>
                    <div className="form-group"><label className="form-label">Entreprise / Profil</label>
                        <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Particulier, SCAC..." /></div>
                    <div className="form-group"><label className="form-label">Téléphone</label>
                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" /></div>
                    <div className="form-group"><label className="form-label">Zone / Localisation</label>
                        <input className="form-input" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="Ex: Almadies, Dakar" /></div>
                    <div className="form-group col-2"><label className="form-label">Budget estimé</label>
                        <input className="form-input" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="Ex: 25M FCFA ou NC si inconnu" /></div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSave}>Ajouter au Pipeline</button>
                </div>
            </Modal>
        </div>
    );
};

export default Pipeline;
