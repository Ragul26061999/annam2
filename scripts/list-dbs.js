
const { Client } = require('pg');

async function listDatabases() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@127.0.0.1:54325/postgres'
    });

    try {
        await client.connect();
        console.log('✅ Connected to local Postgres server');

        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');

        console.log('\n📋 Database Project List (Postgres Databases):');
        res.rows.forEach(row => {
            console.log(`- ${row.datname}`);
        });

    } catch (err) {
        console.error('❌ Error listing databases:', err.message);
    } finally {
        await client.end();
    }
}

listDatabases();
