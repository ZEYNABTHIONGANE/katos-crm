-- Add permissions for Compliance role to access contact information
-- This is necessary for the Compliance Dashboard to show who the dispute is about

-- 1. Ensure everyone can read names/roles from profiles for UI joins
-- Check if policy exists first to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profiles are readable by everyone') THEN
        CREATE POLICY "Profiles are readable by everyone" ON public.profiles
            FOR SELECT USING (true);
    END IF;
END $$;

-- 2. Allow 'conformite' role to read contact names and IDs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Conformite role can read contacts') THEN
        CREATE POLICY "Conformite role can read contacts" ON public.contacts
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND role = 'conformite'
                )
            );
    END IF;
END $$;

-- 3. Ensure Compliance Issues are readable (Double check the existing policy)
-- We add a dedicated one just for conformite to be 100% sure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Conformite can read issues' AND tablename = 'compliance_issues') THEN
        CREATE POLICY "Conformite can read issues" ON public.compliance_issues
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND role = 'conformite'
                )
            );
    END IF;
END $$;
