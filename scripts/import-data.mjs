#!/usr/bin/env node
/**
 * Import data from OLD Supabase project to NEW Supabase project.
 * Reads data via REST API from old project, inserts via REST API to new project.
 * Handles pagination and batching automatically.
 */
import { createClient } from '@supabase/supabase-js';

// OLD project (source)
const OLD_URL = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgyMjQ0MCwiZXhwIjoyMDY3Mzk4NDQwfQ.tyoOnzK81Tnwu9XfGPo-rHdETorAdq3jbQUg_24HFIM';

// NEW project (target)
const NEW_URL = 'https://ecqzxsauoyvbadrtfiwe.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcXp4c2F1b3l2YmFkcnRmaXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkxMzcxOSwiZXhwIjoyMDg2NDg5NzE5fQ.42yfTIkCydnLwQQK6CzLjeo9yDxK3ONqGFHrtii-b4s';

const oldSupa = createClient(OLD_URL, OLD_KEY);
const newSupa = createClient(NEW_URL, NEW_KEY);

// Fetch all rows from old project (paginated)
async function fetchAll(table) {
  let all = [], offset = 0;
  while (true) {
    const { data, error } = await oldSupa.from(table).select('*').range(offset, offset + 999);
    if (error) throw new Error(`fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

// Insert rows into new project via REST API (batched, ignore duplicates)
async function insertRows(table, rows) {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  
  let inserted = 0;
  const errors = [];
  const BATCH = 100;
  
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': NEW_KEY,
        'Authorization': `Bearer ${NEW_KEY}`,
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    
    if (!res.ok) {
      const text = await res.text();
      errors.push(`batch ${i}: ${text.substring(0, 150)}`);
    } else {
      inserted += batch.length;
    }
  }
  return { inserted, errors };
}

// Only outpatient_queue remaining (columns now fixed)
const TABLES = [
  'outpatient_queue',
];

async function main() {
  const t0 = Date.now();
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  Import Data: Old Project → New Project          ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`Source: ${OLD_URL}`);
  console.log(`Target: ${NEW_URL}\n`);

  let totalRows = 0, tablesOk = 0, allErrors = [];

  for (let i = 0; i < TABLES.length; i++) {
    const table = TABLES[i];
    process.stdout.write(`  [${String(i+1).padStart(3)}/${TABLES.length}] ${table.padEnd(40)}`);

    let rows;
    try {
      rows = await fetchAll(table);
    } catch (e) {
      console.log(`FETCH ERR: ${e.message}`);
      allErrors.push({ table, msg: e.message });
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log('(empty)');
      continue;
    }

    const { inserted, errors } = await insertRows(table, rows);
    if (errors.length > 0) {
      console.log(`${inserted}/${rows.length} rows (${errors.length} batch errors)`);
      allErrors.push({ table, msg: errors[0] });
    } else {
      console.log(`✓ ${inserted} rows`);
    }
    totalRows += inserted;
    if (inserted > 0) tablesOk++;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log();
  console.log('════════════════════════════════════════════════════');
  console.log(`  Done in ${elapsed}s | ${tablesOk} tables | ${totalRows} rows`);
  if (allErrors.length > 0) {
    console.log(`  ${allErrors.length} tables had errors:`);
    for (const e of allErrors) console.log(`    - ${e.table}: ${e.msg}`);
  }
  console.log('════════════════════════════════════════════════════');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
