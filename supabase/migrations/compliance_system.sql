-- Migration for Compliance (Litige et Conformité)

-- Create enum for compliance status if helpful, or use text for simplicity
-- For now, using text as per standard patterns in this CRM

CREATE TABLE IF NOT EXISTS public.compliance_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id INTEGER REFERENCES public.contacts(id) ON DELETE CASCADE,
    signaled_by UUID REFERENCES public.profiles(id),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'nouveau', -- 'nouveau', 'en_cours', 'resolu', 'besoin_admin'
    priority TEXT NOT NULL DEFAULT 'normale', -- 'basse', 'normale', 'haute'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES public.compliance_issues(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    requires_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (Simplified, to be reviewed based on actual DB settings)
ALTER TABLE public.compliance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- Allow read access to admin, dir_commercial and conformite
-- (Assuming conformite role will be added to profiles)
CREATE POLICY "Enable read for authorized roles" ON public.compliance_issues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND role IN ('admin', 'dir_commercial', 'conformite', 'superviseur')
        )
    );

-- Allow signaling for commercials and assistants
CREATE POLICY "Enable insert for commercials/assistants" ON public.compliance_issues
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND role IN ('commercial', 'assistante', 'admin', 'dir_commercial', 'manager')
        )
    );
