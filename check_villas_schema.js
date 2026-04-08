const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkVillas() {
    const { data, error } = await supabase.from('villas').select('*').limit(1);
    if (error) {
        console.error('Error fetching villas:', error);
    } else if (data && data.length > 0) {
        console.log('COLUMNS:', Object.keys(data[0]));
        console.log('SAMPLE:', data[0]);
    } else {
        console.log('Table is empty or not accessible with anon key');
    }
}
checkVillas();
