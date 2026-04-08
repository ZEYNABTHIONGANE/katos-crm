const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)];
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Columns in profiles:', Object.keys(data[0]));
    } else {
        console.log('No data in profiles table.');
    }
}

checkSchema();
