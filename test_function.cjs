const fs = require('fs');

// Détection des variables d'env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const url = `${env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
const key = env.VITE_SUPABASE_ANON_KEY;

async function testFunction() {
    console.log(`--- TEST DIRECT EDGE FUNCTION ---`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'apikey': key
            },
            body: JSON.stringify({
                action: 'create',
                userData: {
                    name: 'Test Agent',
                    email: `test_agent_${Math.floor(Math.random() * 1000)}@test.com`,
                    password: 'Password123!',
                    role: 'commercial'
                }
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`Response body:`, text);
        
        try {
            const json = JSON.parse(text);
            if (json.error) {
                console.log(`\nMESSAGE D'ERREUR DÉTECTÉ: ${json.error}`);
            }
        } catch (e) {
            console.log(`La réponse n'est pas au format JSON.`);
        }

    } catch (err) {
        console.error(`Erreur lors de l'appel fetch:`, err);
    }
}

testFunction();
