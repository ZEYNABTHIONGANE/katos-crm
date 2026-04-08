import React, { useState } from 'react';
import { MapPin, Maximize2, CheckCircle2, Search, Map, Construction, Building2, ShoppingCart, Key } from 'lucide-react';
import { useLands } from '../api/landApi';
import { useVillas } from '../api/villaApi';
import { useImmobilierBiens } from '../api/immobilierApi';
import type { ServiceType } from './ServiceSelector';

export interface SelectedProperty {
    id: string;
    title: string;
    location: string;
    price: number;
    surface: number;
    serviceType: ServiceType;
    subType?: string; // 'achat' | 'location' for immobilier
}

interface PropertyPickerProps {
    service: ServiceType;
    selectedId?: string;
    onSelect: (property: SelectedProperty) => void;
}

const formatPrice = (price: number) => price.toLocaleString('fr-FR') + ' FCFA';

const PropertyPicker: React.FC<PropertyPickerProps> = ({ service, selectedId, onSelect }) => {
    const [search, setSearch] = useState('');

    const { data: lands = [], isLoading: loadingLands } = useLands(undefined, { enabled: service === 'foncier' });
    const { data: villas = [], isLoading: loadingVillas } = useVillas({ enabled: service === 'construction' });
    const { data: biens = [], isLoading: loadingBiens } = useImmobilierBiens({ enabled: service === 'gestion_immobiliere' });

    const isLoading = loadingLands || loadingVillas || loadingBiens;

    let items: SelectedProperty[] = [];
    if (service === 'foncier') {
        items = lands.map(l => ({
            id: l.id, title: l.title, location: l.location,
            price: l.price, surface: l.surface, serviceType: 'foncier',
            subType: 'terrain'
        }));
    } else if (service === 'construction') {
        items = villas.map(v => ({
            id: v.id, title: v.title, location: v.location,
            price: v.price, surface: v.surface, serviceType: 'construction',
            subType: v.type
        }));
    } else if (service === 'gestion_immobiliere') {
        items = biens.map(b => ({
            id: b.id, title: b.title, location: b.location,
            price: b.price, surface: b.surface, serviceType: 'gestion_immobiliere',
            subType: b.bien_type
        }));
    }

    const filtered = items.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase())
    );

    const serviceLabels: Record<ServiceType, { title: string; icon: React.ReactNode; unit: string }> = {
        foncier: { title: 'Terrains disponibles', icon: <Map size={18} />, unit: '/terrain' },
        construction: { title: 'Modèles de villas', icon: <Construction size={18} />, unit: '/villa' },
        gestion_immobiliere: { title: 'Biens immobiliers', icon: <Building2 size={18} />, unit: '' },
    };

    const { title: sectionTitle, icon: sectionIcon } = serviceLabels[service];

    const subTypeLabel = (subType?: string) => {
        if (!subType) return null;
        if (subType === 'achat') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShoppingCart size={12} /> Achat</span>;
        if (subType === 'location') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Key size={12} /> Location</span>;
        return subType;
    };

    return (
        <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)' }}>{sectionIcon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{sectionTitle}</span>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    className="form-input"
                    style={{ paddingLeft: '2rem', fontSize: '0.82rem', height: '36px' }}
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Chargement...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Aucun produit trouvé.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
                    {filtered.map(item => {
                        const isSelected = selectedId === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelect(item)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.65rem 0.85rem',
                                    border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                    borderRadius: '8px',
                                    background: isSelected ? 'rgba(43,46,131,0.06)' : 'var(--bg-card)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {isSelected && <CheckCircle2 size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                                {!isSelected && <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid var(--border)', flexShrink: 0 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                                        {item.title}
                                        {item.subType && service !== 'foncier' && service !== 'construction' && (
                                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                                                {subTypeLabel(item.subType)}
                                            </span>
                                        )}
                                        {service === 'construction' && item.subType && (
                                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                                                {item.subType}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        <span><MapPin size={10} style={{ display: 'inline', marginRight: 2 }} />{item.location}</span>
                                        <span><Maximize2 size={10} style={{ display: 'inline', marginRight: 2 }} />{item.surface} m²</span>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                    {service === 'gestion_immobiliere' && item.subType === 'location'
                                        ? formatPrice(item.price) + '/mois'
                                        : formatPrice(item.price)
                                    }
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PropertyPicker;
