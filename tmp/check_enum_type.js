import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)];
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkEnum() {
    try {
        console.log('--- RECHERCHE DU TYPE ENUM ---');
        // On récupère un profile existant
        const { data: profile, error: fetchErr } = await supabase.from('profiles').select('id, role').limit(1).single();
        if (fetchErr || !profile) {
            console.log('Erreur lors de la récupération du profil:', fetchErr?.message || 'Aucun profil trouvé');
            return;
        }

        console.log('Profil trouvé, rôle actuel:', profile.role);

        // On tente une mise à jour avec une valeur bidon
        console.log('Envoi d\'une mise à jour invalide...');
        const { error: updateErr } = await supabase
            .from('profiles')
            .update({ role: 'VALEUR_INVALIDE_POUR_DETECTION' })
            .eq('id', profile.id);

        if (updateErr) {
            console.log('ERREUR CAPTURÉE !');
            console.log('Message:', updateErr.message);
            console.log('Détails:', updateErr.details);
            console.log('Indice (Hint):', updateErr.hint);
        } else {
            console.log('Succès? Si la mise à jour a réussi avec une valeur bidon, c\'est que la colonne est de type TEXT.');
        }
    } catch (e) {
        console.error('Exception:', e.message);
    }
}

checkEnum();
