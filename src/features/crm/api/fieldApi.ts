import { supabase } from '@/lib/supabaseClient';

export interface FieldSlot {
    id: string;
    agentId: string;
    agentName: string;
    date: string; // ISO yyyy-mm-dd
    startTime: string; // HH:mm:ss
    endTime: string; // HH:mm:ss
    isBooked: boolean;
    bookedFor?: number; // Contact ID
    visitType?: 'terrain' | 'chantier';
}

/**
 * Récupère les créneaux d'un agent spécifique sur une période
 */
export const fetchAgentSlots = async (agentId: string, startDate: string, endDate: string): Promise<FieldSlot[]> => {
    const { data, error } = await supabase
        .from('field_slots')
        .select('*')
        .eq('agent_id', agentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        console.error('[fieldApi] fetchAgentSlots error:', error);
        return [];
    }

    return (data || []).map(s => ({
        id: s.id,
        agentId: s.agent_id,
        agentName: s.agent_name,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        isBooked: s.is_booked,
        bookedFor: s.booked_for,
        visitType: s.visit_type
    }));
};

/**
 * Récupère TOUS les créneaux disponibles pour une date (pour les commerciaux)
 */
export const fetchAvailableSlots = async (date: string, type?: 'terrain' | 'chantier'): Promise<FieldSlot[]> => {
    let query = supabase
        .from('field_slots')
        .select('*')
        .eq('date', date)
        .eq('is_booked', false);
    
    if (type) {
        query = query.eq('visit_type', type);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
        console.error('[fieldApi] fetchAvailableSlots error:', error);
        return [];
    }

    return (data || []).map(s => ({
        id: s.id,
        agentId: s.agent_id,
        agentName: s.agent_name,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        isBooked: s.is_booked,
        bookedFor: s.booked_for,
        visitType: s.visit_type
    }));
};

/**
 * Crée un nouveau créneau de disponibilité
 */
export const createFieldSlot = async (slot: Omit<FieldSlot, 'id' | 'isBooked'>) => {
    const { data, error } = await supabase
        .from('field_slots')
        .insert([{
            agent_id: slot.agentId,
            agent_name: slot.agentName,
            date: slot.date,
            start_time: slot.startTime,
            end_time: slot.endTime,
            visit_type: slot.visitType,
            is_booked: false
        }])
        .select()
        .single();

    if (error) {
        console.error('[fieldApi] createFieldSlot error:', error);
        return null;
    }
    return data;
};

/**
 * Marque un créneau comme réservé
 */
export const bookFieldSlot = async (slotId: string, contactId: number) => {
    const { error } = await supabase
        .from('field_slots')
        .update({ is_booked: true, booked_for: contactId })
        .eq('id', slotId);

    if (error) {
        console.error('[fieldApi] bookFieldSlot error:', error);
        return false;
    }
    return true;
};

/**
 * Annule (supprime) un créneau non réservé ou libère un créneau réservé
 */
export const cancelFieldSlot = async (slotId: string) => {
    const { error } = await supabase
        .from('field_slots')
        .delete()
        .eq('id', slotId)
        .eq('is_booked', false); // Protection : on ne supprime pas un créneau déjà réservé via l'agenda simple

    if (error) {
        console.error('[fieldApi] cancelFieldSlot error:', error);
        return false;
    }
    return true;
};
