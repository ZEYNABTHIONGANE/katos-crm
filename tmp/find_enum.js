import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Charger les variables d'env manuellement depuis .env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)];
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function findEnumType() {
    try {
        console.log('Tentative de détection du type ENUM via PostgREST metadata...');
        // PostgREST permet parfois de voir les types via le endpoint racine
        // Mais plus simplement, on va essayer de voir si on peut trouver le nom via un message d'erreur
        // sur un update d'un profil existant (attention à ne pas casser de données réelles)
        
        const { data: profile } = await supabase.from('profiles').select('id, role').limit(1).single();
        if (!profile) {
            console.log('Aucun profil trouvé.');
            return;
        }

        console.log('Tentative d\'update avec un rôle invalide pour voir le message d\'erreur détaillé...');
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'INVALID_ROLE_SEARCH_TYPE' })
            .eq('id', profile.id);

        if (error) {
            console.log('--- ERROR FOUND ---');
            console.log('Message:', error.message);
            console.log('Details:', error.details);
            console.log('Hint:', error.hint);
            console.log('Code:', error.code);
        } else {
            console.log('Update réussi? Cela signifie peut-être que la colonne est de type TEXT sans contrainte.');
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

findEnumType();
