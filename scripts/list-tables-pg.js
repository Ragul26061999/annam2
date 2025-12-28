
const { Client } = require('pg');

async function listTables() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@127.0.0.1:54325/postgres'
    });

    try {
        await client.connect();
        console.log('✅ Connected to local database');

        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        console.log('\n📋 Database Table List:');
        res.rows.forEach(row => {
            console.log(`- ${row.table_name}`);
        });

    } catch (err) {
        console.error('❌ Error listing tables:', err.message);
    } finally {
        await client.end();
    }
}

listTables();
