require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkVillasSchema() {
    console.log(`\n--- Checking table: villas ---`);
    const { data, error } = await supabase.from('villas').select('*').limit(1);
    if (error) {
        console.error(`Error fetching villas:`, error.message);
    } else if (data && data.length > 0) {
        console.log(`Columns found:`, Object.keys(data[0]));
    } else {
        console.log(`No data found in villas.`);
        // Try to insert an empty one to see if it even exists or what errors it gives
        const { error: insertError } = await supabase.from('villas').insert([{}]).select();
        if (insertError) {
            console.log('Insert error hints:', insertError.message);
        }
    }
}

checkVillasSchema();
