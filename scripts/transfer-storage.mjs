#!/usr/bin/env node
/**
 * Transfer storage buckets and files from OLD to NEW Supabase project.
 */
import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgyMjQ0MCwiZXhwIjoyMDY3Mzk4NDQwfQ.tyoOnzK81Tnwu9XfGPo-rHdETorAdq3jbQUg_24HFIM';

const NEW_URL = 'https://ecqzxsauoyvbadrtfiwe.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcXp4c2F1b3l2YmFkcnRmaXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkxMzcxOSwiZXhwIjoyMDg2NDg5NzE5fQ.42yfTIkCydnLwQQK6CzLjeo9yDxK3ONqGFHrtii-b4s';

const oldSupa = createClient(OLD_URL, OLD_KEY);
const newSupa = createClient(NEW_URL, NEW_KEY);

// Bucket configs from old project
const BUCKETS = [
  { id: 'patient-documents', public: true, fileSizeLimit: null, allowedMimeTypes: null },
  { id: 'discharge-attachments', public: true, fileSizeLimit: 10485760, allowedMimeTypes: ['application/pdf','image/jpeg','image/png','image/gif','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  { id: 'lab-xray-attachments', public: true, fileSizeLimit: 20971520, allowedMimeTypes: ['application/pdf','image/jpeg','image/png','image/gif','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/dicom','image/tiff'] },
  { id: 'doctor-documents', public: false, fileSizeLimit: null, allowedMimeTypes: null },
  { id: 'diagnostic-files', public: true, fileSizeLimit: null, allowedMimeTypes: null },
  { id: 'prescription-images', public: true, fileSizeLimit: 5242880, allowedMimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] },
  { id: 'purchase-documents', public: true, fileSizeLimit: 5242880, allowedMimeTypes: ['image/jpeg','image/png','image/gif','image/webp','application/pdf'] },
];

async function listRecursive(supaClient, bucket, prefix) {
  const { data, error } = await supaClient.storage.from(bucket).list(prefix || '', { limit: 500 });
  if (error || !data) return [];
  let files = [];
  for (const item of data) {
    const path = prefix ? prefix + '/' + item.name : item.name;
    if (item.id === null) {
      const sub = await listRecursive(supaClient, bucket, path);
      files.push(...sub);
    } else {
      files.push(path);
    }
  }
  return files;
}

async function main() {
  const t0 = Date.now();
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  Transfer Storage: Old → New Project             ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Step 1: Create buckets on new project
  console.log('--- Creating buckets ---');
  for (const b of BUCKETS) {
    const opts = { public: b.public };
    if (b.fileSizeLimit) opts.fileSizeLimit = b.fileSizeLimit;
    if (b.allowedMimeTypes) opts.allowedMimeTypes = b.allowedMimeTypes;
    
    const { data, error } = await newSupa.storage.createBucket(b.id, opts);
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ${b.id}: already exists ✓`);
      } else {
        console.log(`  ${b.id}: ERROR - ${error.message}`);
      }
    } else {
      console.log(`  ${b.id}: created ✓ (public: ${b.public})`);
    }
  }

  // Step 2: Transfer files
  console.log('\n--- Transferring files ---');
  let totalFiles = 0, totalErrors = 0;

  for (const b of BUCKETS) {
    const files = await listRecursive(oldSupa, b.id);
    if (files.length === 0) {
      console.log(`  ${b.id}: (no files)`);
      continue;
    }
    console.log(`  ${b.id}: ${files.length} files`);

    for (const filePath of files) {
      process.stdout.write(`    ${filePath}…`);

      // Download from old
      const { data: blob, error: dlErr } = await oldSupa.storage.from(b.id).download(filePath);
      if (dlErr) {
        console.log(` DOWNLOAD ERR: ${dlErr.message}`);
        totalErrors++;
        continue;
      }

      // Convert Blob to Buffer
      const buffer = Buffer.from(await blob.arrayBuffer());

      // Upload to new
      const { data: upData, error: upErr } = await newSupa.storage.from(b.id).upload(filePath, buffer, {
        contentType: blob.type || 'application/octet-stream',
        upsert: true,
      });

      if (upErr) {
        console.log(` UPLOAD ERR: ${upErr.message}`);
        totalErrors++;
      } else {
        console.log(` ✓ (${(buffer.length / 1024).toFixed(1)} KB)`);
        totalFiles++;
      }
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log();
  console.log('════════════════════════════════════════════════════');
  console.log(`  Done in ${elapsed}s | ${totalFiles} files transferred | ${totalErrors} errors`);
  console.log('════════════════════════════════════════════════════');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
