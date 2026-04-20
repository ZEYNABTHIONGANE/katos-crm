
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function listTables() {
    console.log('--- LISTING ALL TABLES ---');
    const { data: tables, error } = await supabase.from('profiles').select('id').limit(1); // dummy
    
    // Pour lister les tables, on peut utiliser une astuce avec query RPC si dispo ou juste essayer des noms probables
    const { data, error: err } = await supabase.rpc('get_tables_list'); 
    
    if (err) {
        console.log('RPC get_tables_list not found, manually checking common names...');
        const tablesToTry = ['messages', 'chat_messages', 'conversations', 'groups', 'notifications'];
        for (const t of tablesToTry) {
            const { error: e } = await supabase.from(t).select('id').limit(1);
            console.log(`Table ${t}: ${e ? 'NOT FOUND' : 'EXISTS'}`);
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables();
