require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkContacts() {
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(3);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkContacts();
