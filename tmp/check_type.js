import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Charger les variables d'env manuellement depuis .env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkColType() {
    try {
        // ESSAYER d'interroger information_schema pour le type de la colonne role
        // Remarque : PostgREST ne permet pas d'interroger directement information_schema
        // sauf si on utilise une astuce via une vue ou un RPC.
        // Mais on peut essayer de forcer une erreur pour voir le type attendu.
        
        console.log('Tentative d\'insertion d\'un rôle invalide pour forcer une erreur de type...');
        const { error } = await supabase
            .from('profiles')
            .insert({ role: 'INVALID_ROLE_FORCE_ERROR' });
        
        if (error) {
            console.error('Error MESSAGE:', error.message);
            console.error('Error DETAILS:', error.details);
            console.error('Error CODE:', error.code);
            console.error('Error HINT:', error.hint);
        } else {
            console.log('Pas d\'erreur? Peut-être que le rôle est texte.');
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkColType();
