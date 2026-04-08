import { supabase } from '@/lib/supabaseClient';

export interface FaqRequest {
    id: string;
    sender_id: string;
    sender_name: string;
    receiver_id: string;
    subject: string;
    message: string;
    reply: string | null;
    status: 'pending' | 'answered';
    created_at: string;
    updated_at: string;
}

export interface FaqEntry {
    id: string;
    question: string;
    answer: string;
    category: 'admin' | 'finance' | 'technique' | 'client' | 'general';
    created_at?: string;
}

export const fetchFaqRequests = async (userId: string, role: string): Promise<FaqRequest[]> => {
    let query = supabase.from('faq_requests').select('*');
    
    // Si c'est un commercial, il voit ses propres questions envoyées
    // Si c'est un manager, il voit les questions qui lui sont adressées (receiver_id)
    // Si c'est un rôle de direction (admin, dir_com, resp_com), il voit TOUT pour enrichir la FAQ
    if (role === 'commercial') {
        query = query.eq('sender_id', userId);
    } else if (role === 'manager') {
        query = query.eq('receiver_id', userId);
    } 
    // Pour ['resp_commercial', 'superviseur', 'dir_commercial', 'admin'], 
    // on ne filtre pas pour qu'ils voient l'ensemble des questions.
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
        console.error('[faqApi] Error fetching requests:', error);
        return [];
    }
    
    return data || [];
};

export const createFaqRequest = async (request: Omit<FaqRequest, 'id' | 'status' | 'created_at' | 'updated_at' | 'reply'>): Promise<FaqRequest | null> => {
    const { data, error } = await supabase
        .from('faq_requests')
        .insert([{
            ...request,
            status: 'pending'
        }])
        .select()
        .single();
        
    if (error) {
        console.error('[faqApi] Error creating request:', error);
        return null;
    }
    
    return data;
};

export const replyToFaqRequest = async (requestId: string, reply: string): Promise<boolean> => {
    const { error } = await supabase
        .from('faq_requests')
        .update({
            reply,
            status: 'answered',
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
        
    if (error) {
        console.error('[faqApi] Error replying to request:', error);
        return false;
    }
    
    return true;
};

// -- Public FAQ Entries --

export const fetchFaqEntries = async (): Promise<FaqEntry[]> => {
    const { data, error } = await supabase
        .from('faq_entries')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error('[faqApi] Error fetching FAQ entries:', error);
        return [];
    }
    
    return data || [];
};

export const createFaqEntry = async (entry: Omit<FaqEntry, 'id' | 'created_at'>): Promise<FaqEntry | null> => {
    const { data, error } = await supabase
        .from('faq_entries')
        .insert([entry])
        .select()
        .single();
        
    if (error) {
        console.error('[faqApi] Error creating FAQ entry:', error);
        return null;
    }
    
    return data;
};

export const deleteFaqEntry = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('faq_entries')
        .delete()
        .eq('id', id);
        
    if (error) {
        console.error('[faqApi] Error deleting FAQ entry:', error);
        return false;
    }
    
    return true;
};

