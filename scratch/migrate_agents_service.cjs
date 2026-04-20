const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zyexctqohuiwiqigpwnt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXhjdHFvaHVpd2lxaWdwd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDUxNTksImV4cCI6MjA4ODg4MTE1OX0.5xHY1SK9emQR6IpysX2pdjMGIUhLrDp9udJ-_srw7oA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    const roles = ['commercial', 'manager', 'resp_commercial', 'superviseur'];
    
    console.log('--- Migration: Clearing Services for Agents ---');
    
    // 1. Fetch agents to see who we are updating
    const { data: agents, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, role, service')
        .in('role', roles);
        
    if (fetchError) {
        console.error('Error fetching agents:', fetchError.message);
        return;
    }
    
    console.log(`Found ${agents.length} agents to update.`);
    if (agents.length === 0) {
        console.log('No agents found matching the criteria.');
        return;
    }

    // 2. Perform the update
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ service: null })
        .in('role', roles);
        
    if (updateError) {
        console.error('Error during update:', updateError.message);
        console.log('Note: This might be due to RLS policies. If it fails, you might need to run this SQL manually in the Supabase Dashboard.');
        return;
    }
    
    console.log('Migration completed successfully! All agents are now multi-service (service = null).');
}

migrate();
