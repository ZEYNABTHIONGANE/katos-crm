import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)];
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function findEnumName() {
    try {
        // On ne peut pas facilement interroger pg_type via l'API anonyme.
        // Mais on peut essayer de mettre à jour un profil avec un rôle inexistant
        // et voir si le message d'erreur mentionne le type.
        
        console.log('Tentative de mise à jour avec un rôle invalide pour forcer une erreur de type...');
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
        if (!profiles || profiles.length === 0) {
            console.log('Aucun profil trouvé pour le test.');
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ role: 'ROLE_TEST_INEXISTANT' })
            .eq('id', profiles[0].id);

        if (error) {
            console.log('--- ERREUR DÉTECTÉE ---');
            console.log('Message:', error.message);
            console.log('Détails:', error.details);
            console.log('Indice (Hint):', error.hint);
        } else {
            console.log('Pas d\'erreur? Cela suggère que la colonne est peut-être de type TEXT sans contrainte ENUM.');
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

findEnumName();
