import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MapPin, Maximize2, Calendar,
    FileText, Download, Edit2, ShieldCheck, Map


} from 'lucide-react';
import { useLand, useUpdateLand } from '../api/landApi';
import LandForm from './LandForm';
import type { Land } from '../types/land';

const LandDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = React.useState(false);
    const { data: land, isLoading, error } = useLand(id || '');
    const updateMutation = useUpdateLand();

    if (isLoading) return <div className="p-12 text-center">Chargement des détails...</div>;
    if (error || !land) return <div className="p-12 text-center text-red-500">Terrain introuvable.</div>;

    const handleUpdate = async (data: Partial<Land>) => {
        if (!id) return;
        try {
            await updateMutation.mutateAsync({ id, updates: data });
            setIsEditing(false);
        } catch (err) {
            console.error("Erreur lors de la mise à jour:", err);
        }
    };

    return (
        <div className="contact-detail-page property-details-page">
            {isEditing && (
                <LandForm
                    initialData={land}
                    onSave={handleUpdate}
                    onCancel={() => setIsEditing(false)}
                />
            )}

            <button className="btn-back" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} /> Retour au foncier
            </button>

            <div className="detail-header card-premium">
                <div className="header-info">
                    <div className="avatar-large">
                        <Map size={32} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                    </div>
                    <div className="title-section">
                        <div className="d-flex align-center gap-sm">
                            <h1 style={{ fontWeight: 800 }}>{land.title}</h1>
                            <span className={`status-pill status-${land.status}`}>
                                {land.status.charAt(0).toUpperCase() + land.status.slice(1)}
                            </span>
                        </div>
                        <div className="location-text subtitle">
                            <MapPin size={16} /> {land.location}
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="header-price" style={{ textAlign: 'right', marginRight: '1rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Prix Total</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {land.price.toLocaleString()} <small style={{ fontSize: '0.6em' }}>FCFA</small>
                        </p>
                    </div>
                    <button className="btn-outline" onClick={() => setIsEditing(true)}>
                        <Edit2 size={16} /> Modifier
                    </button>
                </div>
            </div>

            <div className="detail-grid">
                <div className="grid-left">
                    <div className="info-card card-premium">
                        <h3>Fiche Technique</h3>
                        <div className="info-list">
                            <div className="info-item">
                                <FileText className="icon-muted" size={18} />
                                <div>
                                    <span className="info-label">Référence</span>
                                    <span className="info-value">{land.reference}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <ShieldCheck className="icon-muted" size={18} />
                                <div>
                                    <span className="info-label">Nature Juridique</span>
                                    <span className="info-value">{land.legal_nature}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Maximize2 className="icon-muted" size={18} />
                                <div>
                                    <span className="info-label">Surface Totale</span>
                                    <span className="info-value">{land.surface} m²</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Calendar className="icon-muted" size={18} />
                                <div>
                                    <span className="info-label">Date d'enregistrement</span>
                                    <span className="info-value">{new Date(land.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="grid-right">
                    <div className="tabs-container card-premium">
                        <div className="tabs-header">
                            <button className="tab active">Lotissements & Détails</button>
                        </div>
                        <div className="tab-content" style={{ padding: '1.5rem' }}>
                            <div className="description-section">
                                <h4 className="section-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
                                    Description & État des lieux
                                </h4>
                                <p className="notes-text" style={{ borderLeftColor: 'var(--primary-dark)' }}>
                                    {land.description}
                                </p>
                            </div>

                            <div className="lots-section mt-15">
                                <h4 className="section-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
                                    Lots disponibles ({land.lots?.length || 0})
                                </h4>
                                {land.lots && land.lots.length > 0 ? (
                                    <table className="lots-table">
                                        <thead>
                                            <tr>
                                                <th>N° Lot</th>
                                                <th>Surface</th>
                                                <th>Prix</th>
                                                <th>Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {land.lots.map((lot) => (
                                                <tr key={lot.id}>
                                                    <td className="lot-number">{lot.lot_number}</td>
                                                    <td>{lot.surface} m²</td>
                                                    <td>{lot.price.toLocaleString()} FCFA</td>
                                                    <td>
                                                        <span className={`status-pill status-${lot.status}`}>
                                                            {lot.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-muted" style={{ fontStyle: 'italic' }}>Aucun lotissement défini pour ce terrain.</p>
                                )}
                            </div>

                            <div className="documents-section mt-15">
                                <h4 className="section-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
                                    Documents & Pièces Jointes
                                </h4>
                                {land.documents && land.documents.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {land.documents.map((doc) => (
                                            <div key={doc.id} className="doc-item" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                    <FileText size={16} className="text-secondary" />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{doc.name}</span>
                                                </div>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-muted hover-secondary">
                                                    <Download size={16} />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted" style={{ fontStyle: 'italic' }}>Aucun document (plan, titre foncier, etc.) joint.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandDetails;
