import { Map, Construction, Building2 } from 'lucide-react';

export type ServiceType = 'foncier' | 'construction' | 'gestion_immobiliere';

interface ServiceOption {
    id: ServiceType;
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
    bg: string;
}

const SERVICES: ServiceOption[] = [
    {
        id: 'foncier',
        icon: <Map size={24} />,
        label: 'Foncier',
        description: 'Achat de terrain',
        color: '#E96C2E',
        bg: 'rgba(233,108,46,0.08)',
    },
    {
        id: 'construction',
        icon: <Construction size={24} />,
        label: 'Construction',
        description: 'Construction d\'une villa',
        color: '#2B2E83',
        bg: 'rgba(43,46,131,0.08)',
    },
    {
        id: 'gestion_immobiliere',
        icon: <Building2 size={24} />,
        label: 'Gestion Immobilière',
        description: 'Achat ou location de bien',
        color: '#10B981',
        bg: 'rgba(16,185,129,0.08)',
    },
];

interface ServiceSelectorProps {
    value?: ServiceType;
    onChange: (service: ServiceType) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({ value, onChange }) => {
    return (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            {SERVICES.map((s) => {
                const isSelected = value === s.id;
                return (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onChange(s.id)}
                        style={{
                            flex: '1 1 100px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.85rem 0.5rem',
                            border: `2px solid ${isSelected ? s.color : 'var(--border)'}`,
                            borderRadius: '10px',
                            background: isSelected ? s.bg : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? `0 0 0 3px ${s.color}22` : 'none',
                        }}
                    >
                        <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? s.color : 'var(--text-main)' }}>
                            {s.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            {s.description}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default ServiceSelector;
export { SERVICES };
