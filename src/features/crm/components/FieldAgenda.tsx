import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { fetchAgentSlots, createFieldSlot, cancelFieldSlot, type FieldSlot } from '../api/fieldApi';
import Modal from '@/components/ui/Modal';
import { useContactStore } from '@/stores/contactStore';

const FieldAgenda = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { contacts } = useContactStore();
    const [slots, setSlots] = useState<FieldSlot[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Déclaration explicite de l'état pour éviter les ReferenceError
    const [viewDate, setViewDate] = useState(new Date());
    const [isCreating, setIsCreating] = useState(false);

    const [newSlot, setNewSlot] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:30',
        visitType: 'terrain' as 'terrain' | 'chantier'
    });

    useEffect(() => {
        console.log('[FieldAgenda] Component mounted with viewDate:', viewDate);
    }, []);

    const loadSlots = async () => {
        if (!user) return;
        const start = new Date(viewDate);
        start.setDate(start.getDate() - 14);
        const end = new Date(viewDate);
        end.setDate(end.getDate() + 14);

        // Si c'est un technicien, on filtre par son ID. Sinon (admin/commercial), on voit tout.
        const isTech = user.role === 'technicien_terrain' || user.role === 'technicien_chantier';
        const agentIdParam = isTech ? user.id : undefined;
        const data = await fetchAgentSlots(agentIdParam as string, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
        setSlots(data);
    };

    useEffect(() => {
        loadSlots();
    }, [user, viewDate]);

    const handleCreateSlot = async () => {
        if (!user) return;
        
        if (!newSlot.startTime || !newSlot.endTime) {
            showToast('Veuillez remplir les heures', 'error');
            return;
        }

        setIsCreating(true);
        try {
            const formattedStartTime = newSlot.startTime.includes(':') && newSlot.startTime.split(':').length === 2 
                ? `${newSlot.startTime}:00` 
                : newSlot.startTime;
            
            const formattedEndTime = newSlot.endTime.includes(':') && newSlot.endTime.split(':').length === 2 
                ? `${newSlot.endTime}:00` 
                : newSlot.endTime;

            const success = await createFieldSlot({
                agentId: user.id,
                agentName: user.name,
                date: newSlot.date,
                startTime: formattedStartTime,
                endTime: formattedEndTime,
                visitType: newSlot.visitType
            });

            if (success) {
                showToast('Disponibilité ajoutée avec succès');
                setShowAddModal(false);
                loadSlots();
            } else {
                showToast('Erreur lors de l\'ajout', 'error');
            }
        } catch (error) {
            console.error('[FieldAgenda] Create error:', error);
            showToast('Une erreur inattendue est survenue', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteSlot = async (id: string, isBooked: boolean) => {
        const confirmMsg = isBooked 
            ? "Ce créneau est déjà réservé. Supprimer ce créneau ANNULERA le rendez-vous et enverra une notification au commercial. Confirmer ?"
            : "Voulez-vous supprimer ce créneau de disponibilité ?";
            
        if (!window.confirm(confirmMsg)) return;

        const success = await cancelFieldSlot(id);
        if (success) {
            showToast(isBooked ? 'Rendez-vous annulé et créneau supprimé' : 'Disponibilité retirée');
            loadSlots();
        }
    };

    const getContactName = (id?: number) => {
        if (!id) return '';
        return contacts.find(c => c.id === id)?.name || `Contact #${id}`;
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const weekDays = [];
    const current = new Date(viewDate);
    // On commence au lundi de la semaine de viewDate
    const dayOfWeek = current.getDay(); // 0 is Sunday
    const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
    const monday = new Date(current.setDate(diff));

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDays.push(d);
    }

    const calculatePosition = (start: string, end: string) => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const top = sh * 60 + sm;
        const height = (eh * 60 + em) - top;
        return { top, height };
    };

    return (
        <div className="field-agenda">
            {/* ── Header (Google Style) ── */}
            <header className="agenda-header">
                <div className="header-left">
                    <h1>Agenda</h1>
                    <div className="nav-controls">
                        <button className="btn-today" onClick={() => setViewDate(new Date())}>Aujourd&apos;hui</button>
                        <div className="nav-arrows">
                            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }}><ChevronLeft size={20} /></button>
                            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    <div className="current-date">
                        {weekDays[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </div>
                </div>
                <div className="header-right">
                    {/* Filtres ou switch de vue ici */}
                </div>
            </header>

            <div className="agenda-body">
                {/* ── Sidebar ── */}
                <aside className="agenda-sidebar">
                    <button className="btn-create" onClick={() => setShowAddModal(true)}>
                        <Plus size={24} color="#ea4335" />
                        <span>Créer</span>
                    </button>

                    <div className="calendar-filters">
                        <h3>Mes Calendriers</h3>
                        <div className="filter-item">
                            <input type="checkbox" defaultChecked />
                            <span>Visites Terrain</span>
                        </div>
                        <div className="filter-item">
                            <input type="checkbox" defaultChecked />
                            <span>Chantiers</span>
                        </div>
                    </div>
                </aside>

                {/* ── Grid Container ── */}
                <div className="agenda-grid-container">
                    <div className="days-header">
                        <div style={{ width: '60px', flexShrink: 0 }} /> {/* Corner space */}
                        {weekDays.map(day => {
                            const isToday = day.toDateString() === new Date().toDateString();
                            return (
                                <div key={day.toISOString()} className={`day-label ${isToday ? 'is-today' : ''}`}>
                                    <span className="day-name">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                                    <span className="day-number">{day.getDate()}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid-body-wrapper" style={{ display: 'flex', flex: 1 }}>
                        <div className="time-column">
                            {hours.map(h => (
                                <div key={h} className="time-slot">
                                    <span>{h === 0 ? '' : `${h}:00`}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid-body" style={{ flex: 1, display: 'flex' }}>
                            {weekDays.map(day => {
                                const dateStr = day.toISOString().split('T')[0];
                                const daySlots = slots.filter(s => s.date === dateStr);
                                
                                return (
                                    <div key={dateStr} className="day-column">
                                        {hours.map(h => <div key={h} className="grid-row" />)}
                                        
                                        {daySlots.map(slot => {
                                            const { top, height } = calculatePosition(slot.startTime, slot.endTime);
                                            return (
                                                <div 
                                                    key={slot.id}
                                                    className={`agenda-event ${slot.visitType} ${slot.isBooked ? 'booked' : ''}`}
                                                    style={{ top: `${top}px`, height: `${height}px` }}
                                                    onClick={() => slot.isBooked && handleDeleteSlot(slot.id, true)}
                                                >
                                                    <span className="event-time">{slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}</span>
                                                    <span className="event-title">
                                                        {slot.isBooked ? `Visite: ${getContactName(slot.bookedFor)}` : 'Disponible'}
                                                    </span>
                                                    <span className="event-agent">{slot.agentName}</span>
                                                    
                                                    {(user?.role === 'admin' || user?.id === slot.agentId) && (
                                                        <button 
                                                            className="delete-small"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id, slot.isBooked); }}
                                                            style={{ position: 'absolute', right: 4, top: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ouvrir un créneau de disponibilité" size="md">
                <div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Date d&apos;intervention</label>
                            <input
                                type="date"
                                className="form-input"
                                value={newSlot.date}
                                onChange={e => setNewSlot({ ...newSlot, date: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Catégorie</label>
                            <select
                                className="form-select"
                                value={newSlot.visitType}
                                onChange={e => setNewSlot({ ...newSlot, visitType: e.target.value as any })}
                            >
                                <option value="terrain">Terrain</option>
                                <option value="chantier">Chantier</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Heure de début</label>
                            <input
                                type="time"
                                className="form-input"
                                value={newSlot.startTime}
                                onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Heure de fin</label>
                            <input
                                type="time"
                                className="form-input"
                                value={newSlot.endTime}
                                onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '24px', paddingBottom: '10px' }}>
                        <button className="btn-secondary" onClick={() => setShowAddModal(false)} disabled={isCreating}>
                            Annuler
                        </button>
                        <button className="btn-primary" onClick={handleCreateSlot} disabled={isCreating}>
                            {isCreating ? 'Ajout...' : 'Ajouter au calendrier'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FieldAgenda;
