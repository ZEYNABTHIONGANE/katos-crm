import { useState, useEffect } from 'react';
import { Plus, Trash2, User, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
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

    const weekDays = [];
    const current = new Date(viewDate);
    
    for (let i = 0; i < 6; i++) {
        weekDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return (
        <div className="field-agenda">
            <div className="page-header d-flex-between">
                <div>
                    <h1>{user?.role?.startsWith('technicien') ? 'Mon Agenda' : 'Agenda des Techniciens'}</h1>
                    <p className="subtitle">
                        {user?.role?.startsWith('technicien') 
                            ? 'Gérez vos créneaux de disponibilité pour les visites clients.' 
                            : 'Consultez les disponibilités de tous les techniciens terrain.'}
                    </p>
                </div>
                <div className="d-flex gap-2 items-center">
                    <div className="card-premium" style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }}
                            className="btn-ghost"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)' }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', padding: '0 0.5rem', whiteSpace: 'nowrap' }}>
                            Semaine du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </span>
                        <button
                            onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }}
                            className="btn-ghost"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)' }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ display: (user?.role && user.role.startsWith('technicien')) || user?.role === 'admin' ? 'flex' : 'none' }}>
                        <Plus size={18} /> Ouvrir un créneau
                    </button>
                </div>
            </div>

            <div className="agenda-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    {weekDays.map(day => {
                        const dateStr = day.toISOString().split('T')[0];
                        const daySlots = slots.filter(s => s.date === dateStr);
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        return (
                            <div key={dateStr} className={`card-premium min-h-[500px] flex flex-col p-0 overflow-hidden transition-all duration-300 ${isToday ? 'ring-2 ring-katos-orange ring-offset-2' : 'hover:border-katos-blue'}`}>
                                <div className={`p-5 text-center border-b-2 transition-colors ${isToday ? 'bg-orange-50 border-katos-orange' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className={`text-xs uppercase font-extrabold tracking-widest mb-1 ${isToday ? 'text-katos-orange' : 'text-gray-400'}`}>
                                        {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                                    </div>
                                    <div className={`text-3xl font-black ${isToday ? 'text-katos-orange' : 'text-katos-blue'}`}>
                                        {day.getDate()}
                                    </div>
                                </div>
                                <div className="p-4 flex-grow space-y-4 overflow-y-auto max-h-[600px] bg-white">
                                    {daySlots.map(slot => (
                                        <div
                                            key={slot.id}
                                            className={`p-4 rounded-xl border-2 relative group transition-all duration-200 ${slot.isBooked
                                                    ? 'bg-blue-50 border-blue-100 text-blue-900 shadow-sm'
                                                    : 'bg-green-50 border-green-100 text-green-900 hover:border-green-300 hover:shadow-md cursor-default'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-extrabold text-sm tracking-tight text-katos-blue">
                                                    {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                                                </span>
                                                {(user?.role === 'admin' || user?.id === slot.agentId) && (
                                                    <button
                                                        onClick={() => handleDeleteSlot(slot.id, slot.isBooked)}
                                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1.5 bg-white rounded-full shadow-sm transition-all"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            {user?.role && !user.role.startsWith('technicien') && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <User size={12} className="text-muted" />
                                                    <span className="text-[10px] font-bold text-katos-blue truncate">{slot.agentName}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${slot.visitType === 'terrain' ? 'bg-orange-100 text-katos-orange' : 'bg-blue-100 text-katos-blue'}`}>
                                                    {slot.visitType === 'terrain' ? 'Terrain' : 'Chantier'}
                                                </span>
                                            </div>
                                            {slot.isBooked ? (
                                                <div className="mt-3 pt-3 border-t border-blue-200/50">
                                                    <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">Réservé par</div>
                                                    <div className="text-xs font-black flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                                        {getContactName(slot.bookedFor)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-bold text-green-500/70 uppercase tracking-tighter">Disponible</div>
                                            )}
                                        </div>
                                    ))}
                                    {daySlots.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 opacity-30 grayscale">
                                            <Clock size={20} className="text-gray-300 mb-2" />
                                            <div className="text-gray-400 text-center font-bold text-[10px] uppercase tracking-widest">Aucun créneau</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ouvrir un créneau de disponibilité" size="md">
                    <div className="modal-body">
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

                            <div className="form-group col-2 mt-4">
                                <div className="bg-katos-blue/5 p-4 rounded-xl border border-katos-blue/10 flex gap-4 items-center">
                                    <div className="w-10 h-10 bg-katos-blue text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <User size={20} />
                                    </div>
                                    <p className="text-sm text-katos-blue font-medium leading-relaxed">
                                        Conseil : Prévoyez des créneaux de <span className="font-black text-katos-orange">1h30</span> pour assurer une marge de trajet et de visite confortable.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
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
