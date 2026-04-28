-- Fix: Add 'marketing' to the role check constraint in the profiles table

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'admin', 
    'dir_commercial', 
    'resp_commercial', 
    'manager', 
    'superviseur', 
    'commercial', 
    'assistante', 
    'conformite', 
    'technicien_terrain', 
    'technicien_chantier', 
    'marketing'
));
