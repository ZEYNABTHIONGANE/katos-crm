-- Correction des droits de suppression sur les notifications
-- A exécuter dans l'éditeur SQL de Supabase

-- 1. Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques de suppression si elles existent
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete any notification" ON public.notifications;

-- 3. Créer la politique pour les utilisateurs classiques (peuvent supprimer ce qui leur est assigné)
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE
    USING (
        auth.uid() = assigned_to 
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 4. Optionnel : Permettre aux managers de supprimer les notifs de leur service
DROP POLICY IF EXISTS "Managers can delete service notifications" ON public.notifications;
CREATE POLICY "Managers can delete service notifications" ON public.notifications
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND role = 'manager'
            AND profiles.service = notifications.service
        )
    );

-- 5. S'assurer que tout le monde peut lire (Select)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.notifications;
CREATE POLICY "Enable read access for all authenticated users" ON public.notifications
    FOR SELECT USING (true);
