const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://zyexctqohuiwiqigpwnt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXhjdHFvaHVpd2lxaWdwd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDUxNTksImV4cCI6MjA4ODg4MTE1OX0.5xHY1SK9emQR6IpysX2pdjMGIUhLrDp9udJ-_srw7oA'
);

// Test insert with ONLY safe default columns that we know exist
async function testMinimalInsert() {
    console.log('Trying minimal insert...');
    const { data, error } = await supabase.from('contacts').insert([{
        name: 'Test Minimal ' + Date.now(),
        status: 'Prospect'
    }]).select();
    
    if (error) {
        console.log('Minimal insert failed:', error.code, error.message);
    } else {
        console.log('Minimal insert OK - row columns:', Object.keys(data[0]));
        console.log('Sample row:', JSON.stringify(data[0], null, 2));
        
        // Clean up
        await supabase.from('contacts').delete().eq('id', data[0].id);
        console.log('Test row deleted.');
    }
}

testMinimalInsert();
