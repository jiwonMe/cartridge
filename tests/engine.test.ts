import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('engine: rollback, isolation, protected ledger, undo, and billing deduplication', async () => {
  const db = new PGlite();
  const alice = '11111111-1111-4111-8111-111111111111';
  const bob = '22222222-2222-4222-8222-222222222222';
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    for (const file of ['000_cartridge_engine.sql', '001_domain_app.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    await db.exec(`INSERT INTO auth.users VALUES ('${alice}'), ('${bob}');
      INSERT INTO public.work_sets(id,owner_id,title) VALUES ('a','${alice}','A'),('b','${bob}','B');
      SELECT set_config('request.jwt.claim.sub','${alice}',false); SET ROLE authenticated;`);
    async function rpc(sql: string) {
      const r = await db.query<{ result: Record<string, any> }>(`SELECT ${sql} AS result`);
      return r.rows[0].result;
    }
    assert.equal((await db.query('SELECT * FROM work_sets')).rows.length, 1);
    assert.equal((await rpc("rpc_publish_work_set('b','published')")).error_code, 'SET_NOT_FOUND');
    await assert.rejects(db.exec("UPDATE work_sets SET status='published'"), /permission denied/);
    await assert.rejects(db.exec('SELECT cartridge.commit_and_charge(\'x\',\'work_sets\',\'a\',\'{}\',\'{}\',0)'), /permission denied/);
    await assert.rejects(db.exec(`SELECT admin_grant_credits('fake','${alice}',100)`), /permission denied/);
    const published = await rpc("rpc_publish_work_set('a','published')");
    assert.equal(published.ok, true); assert.equal(published.charged_credits, 1);
    assert.equal((await rpc('rpc_cartridge_status()')).credit_balance, 9);
    assert.equal((await rpc("rpc_publish_work_set('a','published')")).error_code, 'NO_STATE_CHANGE');
    const undo = await rpc(`rpc_cartridge_undo('${published.audit_id}')`);
    assert.equal(undo.refunded_credits, 1);
    assert.equal((await rpc(`rpc_cartridge_undo('${published.audit_id}')`)).error_code, 'INVALID_AUDIT_ID');
    assert.equal((await rpc('rpc_cartridge_status()')).credit_balance, 10);
    await db.exec(`RESET ROLE; UPDATE cartridge.entitlements SET credit_balance=0 WHERE user_id='${alice}'; SET ROLE authenticated;`);
    assert.equal((await rpc("rpc_publish_work_set('a','published')")).error_code, 'PAYMENT_REQUIRED');
    assert.equal((await db.query<{ status: string }>("SELECT status FROM work_sets WHERE id='a'")).rows[0].status, 'draft');
    await db.exec(`RESET ROLE; UPDATE cartridge.entitlements SET plan_tier='unlimited' WHERE user_id='${alice}'; SET ROLE authenticated;`);
    const unlimited = await rpc("rpc_publish_work_set('a','published')");
    assert.equal(unlimited.charged_credits, 0);
    await rpc("rpc_publish_work_set('a','review')");
    assert.equal((await rpc(`rpc_cartridge_undo('${unlimited.audit_id}')`)).error_code, 'UNDO_CONFLICT');
    await db.exec(`RESET ROLE; SET ROLE service_role;`);
    assert.equal((await db.query<{ granted: boolean }>(`SELECT admin_grant_credits('cs_1','${alice}',20) AS granted`)).rows[0].granted, true);
    assert.equal((await db.query<{ granted: boolean }>(`SELECT admin_grant_credits('cs_1','${alice}',20) AS granted`)).rows[0].granted, false);
    await db.exec('RESET ROLE; SET ROLE authenticated;');
    assert.equal((await rpc('rpc_cartridge_status()')).credit_balance, 20);
  } finally { await db.close(); }
});
