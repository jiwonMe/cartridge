import { createClient } from '@supabase/supabase-js';

// Run through a trusted scheduler. Never delete Storage metadata via SQL.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = db.storage.from('cartridge-exports');
const cutoff = Date.now() - 24 * 60 * 60 * 1000;
const candidates: string[] = [];
async function scan(prefix: string) {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error('Export listing failed');
    for (const entry of data) {
      if (!prefix && !entry.id && /^[0-9a-f-]{36}$/i.test(entry.name)) await scan(entry.name);
      else if (prefix && entry.id && entry.created_at && Date.parse(entry.created_at) < cutoff) candidates.push(`${prefix}/${entry.name}`);
    }
    if (data.length < 100) break;
  }
}
await scan('');
if (process.argv.includes('--apply')) {
  for (let i = 0; i < candidates.length; i += 100) {
    const { error } = await bucket.remove(candidates.slice(i, i + 100));
    if (error) throw new Error('Export deletion failed');
  }
}
console.log(`${candidates.length} exports older than 24 hours ${process.argv.includes('--apply') ? 'deleted' : 'eligible for deletion (dry run)'}.`);
