-- ============================================================
-- Migration : Politiques RLS pour la table villas
-- ============================================================

-- 1. Lecture autorisée pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select for authenticated" 
ON public.villas FOR SELECT 
TO authenticated 
USING (true);

-- 2. Insertion autorisée pour tout le monde (ou restreindre aux rôles si besoin)
-- Pour plus de sécurité, on autorise l'insertion si l'utilisateur est authentifié
CREATE POLICY "Allow insert for authenticated" 
ON public.villas FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Mise à jour autorisée pour l'agent assigné ou les administrateurs
-- Pour faire simple pour l'instant : tout utilisateur authentifié peut modifier
CREATE POLICY "Allow update for authenticated" 
ON public.villas FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Suppression autorisée pour les utilisateurs authentifiés
CREATE POLICY "Allow delete for authenticated" 
ON public.villas FOR DELETE 
TO authenticated 
USING (true);
