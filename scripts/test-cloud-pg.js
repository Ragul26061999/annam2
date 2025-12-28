
const { Client } = require('pg');

async function testCloudPg() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@db.zusheijhebsmjiyyeiqq.supabase.co:5432/postgres'
    });

    try {
        await client.connect();
        console.log('✅ Connected to cloud database');

        const res = await client.query('SELECT current_database();');
        console.log('Current DB:', res.rows[0].current_database);

        await client.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

testCloudPg();
