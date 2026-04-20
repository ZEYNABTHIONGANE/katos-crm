
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkProfiles() {
    console.log("Checking profiles table...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("Columns found:", Object.keys(data[0] || {}));
    }
}

checkProfiles();
