const { createClient } = require('@supabase/supabase-js');

// Manually using the credentials from .env
const VITE_SUPABASE_URL = "https://zyexctqohuiwiqigpwnt.supabase.co";
const VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXhjdHFvaHVpd2lxaWdwd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDUxNTksImV4cCI6MjA4ODg4MTE1OX0.5xHY1SK9emQR6IpysX2pdjMGIUhLrDp9udJ-_srw7oA";

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('--- Checking contacts table ---');
    const { data, error } = await supabase.from('contacts').select('*').limit(2);
    if (error) {
        console.error('Error fetching data:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        console.log('Sample data (first row):', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found in contacts table.');
    }
}

checkSchema();
