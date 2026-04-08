const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://zyexctqohuiwiqigpwnt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXhjdHFvaHVpd2lxaWdwd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDUxNTksImV4cCI6MjA4ODg4MTE1OX0.5xHY1SK9emQR6IpysX2pdjMGIUhLrDp9udJ-_srw7oA');

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');
    
    // 1. Fetch one contact with * to see all keys
    const { data: contacts, error: cError } = await supabase.from('contacts').select('*').limit(1);
    if (cError) {
        console.error('Error fetching contacts with *:', cError);
    } else if (contacts && contacts.length > 0) {
        console.log('COLUMN NAMES IN "contacts":', Object.keys(contacts[0]));
        console.log('SAMPLE DATA:', contacts[0]);
    } else {
        console.log('No contacts found in "contacts" table.');
    }

    // 2. Fetch profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.log('PROFILES found:', profiles.map(p => ({ id: p.id, name: p.name, role: p.role })));
    }

    console.log('--- DIAGNOSTIC END ---');
}

diagnose();
