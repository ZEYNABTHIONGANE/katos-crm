
const { createClient } = require('@supabase/supabase-client');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debug() {
    const { data: contacts } = await supabase.from('contacts').select('assignedagent').limit(50);
    const { data: profiles } = await supabase.from('profiles').select('name, role');

    console.log('--- Unique Assigned Agents in Contacts table ---');
    const uniqueAssigned = [...new Set(contacts.map(c => c.assignedagent))];
    uniqueAssigned.forEach(name => console.log(`"${name}" (length: ${name?.length})`));

    console.log('\n--- Names in Profiles table ---');
    profiles.forEach(p => console.log(`"${p.name}" (role: ${p.role}, length: ${p.name?.length})`));
}

debug();
