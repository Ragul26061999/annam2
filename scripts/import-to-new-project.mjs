#!/usr/bin/env node
/**
 * Import migration SQL data to new Supabase project
 * Reads erph_complete_migration.sql and executes all INSERT statements
 * against the new Supabase project via the SQL API.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_FILE = path.resolve(__dirname, '..', '..', 'erph_complete_migration.sql');

// NEW project credentials
const PROJECT_URL = 'https://ecqzxsauoyvbadrtfiwe.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcXp4c2F1b3l2YmFkcnRmaXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTM3MjkxOSwiZXhwIjoyMDU0OTQ4OTE5fQ.PLACEHOLDER';

// We'll use the Supabase REST SQL endpoint
async function execSQL(query) {
  // Try the pg endpoint first
  const res = await fetch(`${PROJECT_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query }),
  });
  return res;
}

// Use the Supabase client to insert data directly
import { createClient } from '@supabase/supabase-js';

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  Import Data to New Supabase Project             ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  // Read the SQL file
  console.log(`Reading ${SQL_FILE}...`);
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');

  // Extract all INSERT statements (they may span multiple lines)
  // Each INSERT block ends with "ON CONFLICT DO NOTHING;"
  const insertBlocks = [];
  const lines = sql.split('\n');
  let currentBlock = '';
  let inInsert = false;

  for (const line of lines) {
    if (line.startsWith('INSERT INTO')) {
      inInsert = true;
      currentBlock = line;
    } else if (inInsert) {
      currentBlock += '\n' + line;
      if (line.trim() === 'ON CONFLICT DO NOTHING;') {
        insertBlocks.push(currentBlock);
        currentBlock = '';
        inInsert = false;
      }
    }
  }

  console.log(`Found ${insertBlocks.length} INSERT blocks to execute.`);

  // We need the service role key for the NEW project
  // Let's get it from the annam-scube MCP or use direct SQL execution
  // Since we can't call MCP from here, we'll output the SQL blocks
  // and use a different approach - write individual SQL files

  // Actually, let's use the Supabase JS client to insert data table by table
  // by parsing the INSERT statements

  // Parse each INSERT block to extract table name, columns, and values
  let totalRows = 0;
  let successBlocks = 0;
  let failedBlocks = 0;

  // Write all insert blocks to a single file that can be copy-pasted
  const outputFile = path.resolve(__dirname, '..', '..', 'erph_data_only.sql');
  const out = fs.createWriteStream(outputFile);
  
  out.write('-- Data-only migration for new Supabase project\n');
  out.write('-- Execute this in the SQL Editor of the new project\n');
  out.write(`-- Generated: ${new Date().toISOString()}\n\n`);

  for (const block of insertBlocks) {
    out.write(block + '\n\n');
    // Count rows (each line with leading parenthesis is a row)
    const rowCount = (block.match(/^\s*\(/gm) || []).length;
    totalRows += rowCount;
  }

  out.end();
  await new Promise(r => out.on('finish', r));

  const sizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ Wrote ${insertBlocks.length} INSERT blocks (${totalRows} rows) to:`);
  console.log(`  ${outputFile} (${sizeMB} MB)`);
  console.log('\nThis file contains ONLY the INSERT statements.');
  console.log('You can execute it in the Supabase SQL Editor.');

  // Also split into smaller chunks for easier execution
  const chunkDir = path.resolve(__dirname, '..', '..', 'migration_chunks');
  if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir);

  // Group inserts by table
  const tableInserts = new Map();
  for (const block of insertBlocks) {
    const match = block.match(/INSERT INTO public\."([^"]+)"/);
    if (match) {
      const table = match[1];
      if (!tableInserts.has(table)) tableInserts.set(table, []);
      tableInserts.get(table).push(block);
    }
  }

  let chunkIndex = 0;
  for (const [table, blocks] of tableInserts) {
    chunkIndex++;
    const chunkFile = path.join(chunkDir, `${String(chunkIndex).padStart(3, '0')}_${table}.sql`);
    const content = blocks.join('\n\n');
    fs.writeFileSync(chunkFile, content);
    const rows = (content.match(/^\s*\(/gm) || []).length;
    console.log(`  [${chunkIndex}] ${table}: ${rows} rows`);
  }

  console.log(`\n✓ Also split into ${chunkIndex} per-table files in: ${chunkDir}/`);
}

main().catch(e => { console.error('✗ Failed:', e.message); process.exit(1); });
