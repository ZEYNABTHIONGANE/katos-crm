import React from 'react';
import { MapPin, Maximize2, ChevronRight, Map, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Land } from '../types/land';

interface LandCardProps {
    land: Land;
}

const LandCard: React.FC<LandCardProps> = ({ land }) => {
    const navigate = useNavigate();
    const statusColors = {
        disponible: 'status-disponible',
        vendu: 'status-vendu',
        reserve: 'status-reserve'
    };

    const handleCardClick = () => {
        navigate(`/foncier/${land.id}`);
    };

    return (
        <div className="property-card card-foncier" onClick={handleCardClick}>
            <div className="property-image">
                {land.image_url ? (
                    <img src={land.image_url} alt={land.title} />
                ) : (
                    <div className="property-placeholder">
                        <Map size={40} />
                    </div>
                )}
                <div className={`property-status-badge ${statusColors[land.status]}`}>
                    {land.status === 'vendu' ? 'Vendu' :
                        land.status === 'reserve' ? 'Réservé' : 'Disponible'}
                </div>
            </div>

            <div className="property-content">
                <div className="property-title">{land.title}</div>

                <div className="property-meta">
                    <div className="meta-item">
                        <MapPin size={14} />
                        <span>{land.location}</span>
                    </div>
                    <div className="meta-item">
                        <Maximize2 size={14} />
                        <span>{land.surface} m²</span>
                    </div>
                    {land.assignedAgent && (
                        <div className="meta-item agent-tag">
                            <User size={14} />
                            <span>{land.assignedAgent}</span>
                        </div>
                    )}
                </div>

                <div className="property-price-row">
                    <div className="price-tag">
                        <span>{land.price.toLocaleString()}</span>
                        <small>FCFA</small>
                    </div>
                    <button className="details-btn">
                        Détails <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandCard;
