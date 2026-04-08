require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    for (const table of ['contacts', 'interactions', 'visits', 'follow_ups', 'profiles']) {
        console.log(`\n--- Checking table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns found:`, Object.keys(data[0]));
        } else {
            console.log(`No data found in ${table}.`);
        }
    }
}

checkSchema();
