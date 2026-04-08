import React from 'react';
import { MapPin, Maximize2, Edit2, Trash2, Map, FileText } from 'lucide-react';
import type { Land } from '../types/land';

interface LandCardProps {
    land: Land;
    onEdit?: (land: Land) => void;
    onDelete?: (id: string) => void;
}

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
    disponible: { color: 'var(--success)', label: 'Disponible' },
    reserve:    { color: 'var(--warning)', label: 'Réservé' },
    vendu:      { color: 'var(--text-muted)', label: 'Vendu' },
};

const LandCard: React.FC<LandCardProps> = ({ land, onEdit, onDelete }) => {
    const st = STATUS_STYLES[land.status] || STATUS_STYLES.disponible;

    return (
        <div className="property-list-item animate-fade-in">
            <div className="item-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Map size={24} />
            </div>
            
            <div className="item-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="item-title">{land.title}</h3>
                    <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '0.65rem', 
                        background: 'var(--bg-app)', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        color: 'var(--text-muted)',
                        fontWeight: 600
                    }}>
                        <FileText size={10} /> {land.reference}
                    </span>
                </div>
                <div className="item-meta">
                    <span className="meta-val">
                        <MapPin size={14} /> {land.location}
                    </span>
                    <span className="meta-val">
                        <Maximize2 size={14} /> {land.surface} m²
                    </span>
                    {land.legal_nature && (
                        <span className="meta-val">
                            Nature: {land.legal_nature}
                        </span>
                    )}
                </div>
            </div>

            <div className="item-price">
                {new Intl.NumberFormat('fr-FR').format(land.price)} <small>FCFA</small>
            </div>

            <div className="item-status">
                <span className="badge" style={{ 
                    border: `1px solid ${st.color}`,
                    color: st.color,
                    background: 'transparent'
                }}>
                    {st.label}
                </span>
            </div>

            <div className="item-actions">
                {onEdit && (
                    <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); onEdit?.(land); }} title="Modifier">
                        <Edit2 size={14} />
                    </button>
                )}
                {onDelete && (
                    <button className="btn-icon-sm danger" onClick={(e) => { e.stopPropagation(); onDelete?.(land.id); }} title="Supprimer">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default LandCard;
