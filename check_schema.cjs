
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('--- CHECKING PROFILES SCHEMA ---');
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'profiles' });
    
    if (error) {
        // Probablement RPC non défini, on tente une approche par query directe si permise
        const { data: cols, error: err2 } = await supabase.from('profiles').select('*').limit(1);
        if (err2) {
            console.error('Error fetching profiles:', err2);
        } else {
            console.log('Columns found:', Object.keys(cols[0] || {}));
        }
    } else {
        console.log('Schema:', data);
    }
}

checkSchema();
