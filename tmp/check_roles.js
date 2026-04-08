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

async function checkRoles() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .limit(50);
        
        if (error) {
            console.error('Error:', error);
            return;
        }
        
        const roles = [...new Set(data.map(p => p.role))];
        console.log('Current roles in database:', roles);
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkRoles();
