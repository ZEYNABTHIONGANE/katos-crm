import { create } from 'zustand';
import * as faqApi from '../features/crm/api/faqApi';

interface FaqStore {
    requests: faqApi.FaqRequest[];
    faqEntries: faqApi.FaqEntry[];
    loading: boolean;
    fetchRequests: (userId: string, role: string) => Promise<void>;
    addRequest: (request: Omit<faqApi.FaqRequest, 'id' | 'status' | 'created_at' | 'updated_at' | 'reply'>) => Promise<boolean>;
    submitReply: (id: string, reply: string) => Promise<boolean>;
    
    // Public FAQ
    fetchPublicEntries: () => Promise<void>;
    addPublicEntry: (entry: Omit<faqApi.FaqEntry, 'id' | 'created_at'>) => Promise<boolean>;
    removePublicEntry: (id: string) => Promise<boolean>;
}

export const useFaqStore = create<FaqStore>()((set) => ({
    requests: [],
    faqEntries: [],
    loading: false,

    fetchRequests: async (userId: string, role: string) => {
        set({ loading: true });
        const data = await faqApi.fetchFaqRequests(userId, role);
        set({ requests: data, loading: false });
    },

    fetchPublicEntries: async () => {
        set({ loading: true });
        const data = await faqApi.fetchFaqEntries();
        set({ faqEntries: data, loading: false });
    },

    addPublicEntry: async (entry: Omit<faqApi.FaqEntry, 'id' | 'created_at'>) => {
        const newEntry = await faqApi.createFaqEntry(entry);
        if (newEntry) {
            set((state) => ({ faqEntries: [newEntry, ...state.faqEntries] }));
            return true;
        }
        return false;
    },

    removePublicEntry: async (id: string) => {
        const success = await faqApi.deleteFaqEntry(id);
        if (success) {
            set((state) => ({ faqEntries: state.faqEntries.filter((e: faqApi.FaqEntry) => e.id !== id) }));
            return true;
        }
        return false;
    },

    addRequest: async (request: Omit<faqApi.FaqRequest, 'id' | 'status' | 'created_at' | 'updated_at' | 'reply'>) => {
        const newRequest = await faqApi.createFaqRequest(request);
        if (newRequest) {
            set((state) => ({ requests: [newRequest, ...state.requests] }));
            return true;
        }
        return false;
    },

    submitReply: async (id: string, reply: string) => {
        const success = await faqApi.replyToFaqRequest(id, reply);
        if (success) {
            set((state) => ({
                requests: state.requests.map((r: faqApi.FaqRequest) => 
                    r.id === id ? { ...r, status: 'answered' as const, reply } : r
                )
            }));
            return true;
        }
        return false;
    }
}));
