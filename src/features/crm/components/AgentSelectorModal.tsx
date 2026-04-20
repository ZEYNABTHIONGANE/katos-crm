import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Search, User, Check } from 'lucide-react';
import '@/styles/components/_modal.scss';

interface AgentSelectorModalProps {
    onClose: () => void;
    onSelect: (agentIds: string[]) => void;
    excludeUserId?: string; // Exclure l'utilisateur courant
}

const AgentSelectorModal = ({ onClose, onSelect, excludeUserId }: AgentSelectorModalProps) => {
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            let query = supabase.from('profiles').select('id, name, role').order('name');
            const { data, error } = await query;
            if (error) throw error;
            // Exclure l'utilisateur courant de la liste
            const filtered = (data || []).filter(a => a.id !== excludeUserId);
            setAgents(filtered);
        } catch (err) {
            console.error('Error fetching agents:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAgent = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredAgents = agents.filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase())
    );

    const getRoleLabel = (role: string) => {
        const map: Record<string, string> = {
            admin: 'Administrateur',
            directeur_commercial: 'Directeur Commercial',
            responsable_commercial: 'Responsable Commercial',
            manager: 'Manager',
            commercial: 'Commercial',
            juriste: 'Juriste',
        };
        return map[role] || role;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
                <div className="modal-header">
                    <h3>Nouveau message</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
                        Sélectionnez un ou plusieurs destinataires
                    </p>
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un collaborateur..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {selectedIds.length > 0 && (
                        <div style={{
                            background: 'rgba(43,46,131,0.06)', borderRadius: '10px',
                            padding: '8px 12px', marginBottom: '10px', fontSize: '0.82rem', color: '#2B2E83'
                        }}>
                            {selectedIds.length} destinataire(s) sélectionné(s)
                        </div>
                    )}

                    <div className="agents-list">
                        {isLoading ? (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Chargement...</p>
                        ) : filteredAgents.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Aucun collaborateur trouvé</p>
                        ) : filteredAgents.map(agent => {
                            const isSelected = selectedIds.includes(agent.id);
                            return (
                                <div
                                    key={agent.id}
                                    className={`agent-select-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleAgent(agent.id)}
                                >
                                    <div className="agent-avatar-sm">
                                        {isSelected ? <Check size={18} /> : <User size={18} />}
                                    </div>
                                    <div className="agent-info-sm">
                                        <div className="agent-name">{agent.name}</div>
                                        <div className="agent-role">{getRoleLabel(agent.role)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="modal-footer" style={{
                    padding: '16px 20px', display: 'flex',
                    justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee'
                }}>
                    <button className="btn-secondary" onClick={onClose}>Annuler</button>
                    <button
                        onClick={() => { if (selectedIds.length > 0) onSelect(selectedIds); }}
                        disabled={selectedIds.length === 0}
                        style={{
                            padding: '10px 22px', borderRadius: '10px',
                            background: selectedIds.length === 0 ? '#94a3b8' : '#2B2E83',
                            color: 'white', border: 'none',
                            cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
                        }}
                    >
                        Démarrer la discussion
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentSelectorModal;
