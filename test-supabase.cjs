const { createClient } = require('@supabase/supabase-js');

// Hardcoded for diagnostic purposes because dotenv is missing in this env
const supabaseUrl = 'https://zyexctqohuiwiqigpwnt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXhjdHFvaHVpd2lxaWdwd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDUxNTksImV4cCI6MjA4ODg4MTE1OX0.5xHY1SK9emQR6IpysX2pdjMGIUhLrDp9udJ-_srw7oA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---');
  
  // 1. Get column names by fetching one row with all columns
  const { data: sample, error: sError } = await supabase.from('contacts').select('*').limit(1);
  if (sError) {
    console.error('Error fetching sample:', sError);
  } else if (sample && sample.length > 0) {
    console.log('COLUMNS FOUND:', Object.keys(sample[0]));
    console.log('SAMPLE ROW:', sample[0]);
  } else {
    console.log('No rows found in contacts table.');
    
    // Try to see if tables exist at all by listing schemas if possible, or just checking profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.log('Profiles table exists.');
    }
  }

  // 2. Fetch all contacts to see if ANY exist
  const { data: allContacts, error: aError } = await supabase.from('contacts').select('id, name').limit(10);
  if (aError) {
    console.error('Error fetching count:', aError);
  } else {
    console.log('TOTAL CONTACTS (sample of 10):', allContacts);
  }

  console.log('--- DIAGNOSTIC END ---');
}

diagnose();
