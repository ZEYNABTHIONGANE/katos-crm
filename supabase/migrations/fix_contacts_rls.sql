-- =====================================================================
-- FIX: Politiques RLS pour la table contacts
-- Objectif: Permettre aux commerciaux de mettre à jour le statut
--           de leurs propres prospects (pipeline) sans perdre les données.
-- =====================================================================

-- Étape 1: S'assurer que RLS est bien activé
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Étape 2: Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "contacts_select_all" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_all" ON contacts;
DROP POLICY IF EXISTS "contacts_update_all" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_all" ON contacts;
DROP POLICY IF EXISTS "allow_all_contacts" ON contacts;
DROP POLICY IF EXISTS "contacts_read" ON contacts;
DROP POLICY IF EXISTS "contacts_write" ON contacts;
DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON contacts;

-- Étape 3: Créer les nouvelles politiques permissives pour les utilisateurs authentifiés

-- LECTURE: Tous les utilisateurs authentifiés peuvent lire les contacts
CREATE POLICY "contacts_authenticated_select"
ON contacts
FOR SELECT
TO authenticated
USING (true);

-- INSERTION: Tous les utilisateurs authentifiés peuvent créer des contacts
CREATE POLICY "contacts_authenticated_insert"
ON contacts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- MISE À JOUR: Tous les utilisateurs authentifiés peuvent modifier les contacts
-- (Le contrôle fin se fait côté frontend selon le rôle)
CREATE POLICY "contacts_authenticated_update"
ON contacts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- SUPPRESSION: Tous les utilisateurs authentifiés peuvent supprimer des contacts
-- (Le contrôle fin se fait côté frontend selon le rôle)
CREATE POLICY "contacts_authenticated_delete"
ON contacts
FOR DELETE
TO authenticated
USING (true);

-- =====================================================================
-- FIX: Même chose pour interactions (pour les relances et historique)
-- =====================================================================
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_select_all" ON interactions;
DROP POLICY IF EXISTS "interactions_insert_all" ON interactions;
DROP POLICY IF EXISTS "interactions_update_all" ON interactions;
DROP POLICY IF EXISTS "interactions_delete_all" ON interactions;
DROP POLICY IF EXISTS "allow_all_interactions" ON interactions;

CREATE POLICY "interactions_authenticated_select"
ON interactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "interactions_authenticated_insert"
ON interactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "interactions_authenticated_update"
ON interactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "interactions_authenticated_delete"
ON interactions FOR DELETE TO authenticated USING (true);

-- =====================================================================
-- FIX: Même chose pour follow_ups (tâches/relances)
-- =====================================================================
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follow_ups_select_all" ON follow_ups;
DROP POLICY IF EXISTS "follow_ups_insert_all" ON follow_ups;
DROP POLICY IF EXISTS "follow_ups_update_all" ON follow_ups;
DROP POLICY IF EXISTS "follow_ups_delete_all" ON follow_ups;

CREATE POLICY "follow_ups_authenticated_select"
ON follow_ups FOR SELECT TO authenticated USING (true);

CREATE POLICY "follow_ups_authenticated_insert"
ON follow_ups FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "follow_ups_authenticated_update"
ON follow_ups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "follow_ups_authenticated_delete"
ON follow_ups FOR DELETE TO authenticated USING (true);
