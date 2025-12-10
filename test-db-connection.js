const { Client } = require('pg');

async function testDBConnection() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to Supabase PostgreSQL database');
    
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);
    
    await client.end();
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    return false;
  }
}

testDBConnection();