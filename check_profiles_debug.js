const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Charger les variables d'env manuellement depuis .env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkProfiles() {
    console.log('--- FETCHING PROFILES ---');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('--- ALL PROFILES ---');
    console.table(profiles.map(p => ({ 
        id: p.id.substring(0,8) + '...', 
        name: p.name, 
        role: p.role, 
        service: p.service 
    })));
}

checkProfiles();
