import React from 'react';
import { Edit2, Trash2, Home, Maximize2 } from 'lucide-react';
import type { Villa } from '../types/land';

interface VillaCardProps {
    villa: Villa;
    onEdit?: (villa: Villa) => void;
    onDelete?: (id: string) => void;
}

const VillaCard: React.FC<VillaCardProps> = ({ villa, onEdit, onDelete }) => {
    return (
        <div className="property-list-item animate-fade-in">
            <div className="item-icon">
                <Home size={24} />
            </div>
            
            <div className="item-main">
                <h3 className="item-title">{villa.title}</h3>
                <div className="item-meta">
                    <span className="meta-val">
                        <Home size={14} /> {villa.type}
                    </span>
                    <span className="meta-val">
                        <Maximize2 size={14} /> {villa.surface} m²
                    </span>
                </div>
            </div>

            <div className="item-price">
                {new Intl.NumberFormat('fr-FR').format(villa.price)} <small>FCFA</small>
            </div>

            <div className="item-status">
                <span className="badge" style={{ 
                    background: 'var(--primary-light)', 
                    color: 'var(--primary)',
                    opacity: villa.status === 'vendu' ? 0.5 : 1
                }}>
                    {villa.status || 'Disponible'}
                </span>
            </div>

            <div className="item-actions">
                {onEdit && (
                    <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); onEdit?.(villa); }} title="Modifier">
                        <Edit2 size={14} />
                    </button>
                )}
                {onDelete && (
                    <button className="btn-icon-sm danger" onClick={(e) => { e.stopPropagation(); onDelete?.(villa.id); }} title="Supprimer">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VillaCard;
