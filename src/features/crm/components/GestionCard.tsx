import React from 'react';
import { MapPin, Maximize2, Edit2, Trash2, Home, Key, User, UserCheck } from 'lucide-react';
import type { ImmobilierBien } from '../types/land';

interface GestionCardProps {
    bien: ImmobilierBien;
    onEdit?: (bien: ImmobilierBien) => void;
    onDelete?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
    disponible: 'var(--success)',
    reserve: 'var(--warning)',
    loue: 'var(--primary)',
    vendu: 'var(--text-muted)',
};

const STATUS_LABELS: Record<string, string> = {
    disponible: 'Disponible',
    reserve: 'Réservé',
    loue: 'Loué',
    vendu: 'Vendu',
};

const GestionCard: React.FC<GestionCardProps> = ({ bien, onEdit, onDelete }) => {
    const isLocation = bien.bien_type === 'location';

    return (
        <div className="property-list-item animate-fade-in">
            <div className="item-icon" style={{ 
                background: isLocation ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                color: isLocation ? '#3b82f6' : '#8b5cf6'
            }}>
                {isLocation ? <Key size={24} /> : <Home size={24} />}
            </div>
            
            <div className="item-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="item-title">{bien.title}</h3>
                    <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: isLocation ? '#3b82f622' : '#8b5cf622',
                        color: isLocation ? '#3b82f6' : '#8b5cf6',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                    }}>
                        {isLocation ? 'Location' : 'Vente'}
                    </span>
                </div>
                <div className="item-meta">
                    <span className="meta-val">
                        <MapPin size={14} /> {bien.location}
                    </span>
                    <span className="meta-val">
                        <Maximize2 size={14} /> {bien.surface} m²
                    </span>
                    {bien.owner_name && (
                        <span className="meta-val" title="Propriétaire">
                            <User size={14} /> {bien.owner_name}
                        </span>
                    )}
                    {bien.assignedAgent && (
                        <span className="meta-val" style={{ color: 'var(--primary)' }} title="Agent responsable">
                            <UserCheck size={14} /> {bien.assignedAgent}
                        </span>
                    )}
                </div>
                {bien.description && (
                    <p className="property-card-desc" style={{ marginTop: 4, WebkitLineClamp: 1 }}>
                        {bien.description}
                    </p>
                )}
            </div>

            <div className="item-price">
                {new Intl.NumberFormat('fr-FR').format(bien.price)}{' '}
                <small>FCFA{isLocation ? '/mois' : ''}</small>
            </div>

            <div className="item-status">
                <span className="badge" style={{ 
                    border: `1px solid ${STATUS_COLORS[bien.status] || 'var(--border-color)'}`,
                    color: STATUS_COLORS[bien.status] || 'var(--text-main)',
                    background: 'transparent'
                }}>
                    {STATUS_LABELS[bien.status] || bien.status}
                </span>
            </div>

            <div className="item-actions">
                {onEdit && (
                    <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); onEdit?.(bien); }} title="Modifier">
                        <Edit2 size={14} />
                    </button>
                )}
                {onDelete && (
                    <button className="btn-icon-sm danger" onClick={(e) => { e.stopPropagation(); onDelete?.(bien.id); }} title="Supprimer">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default GestionCard;
