import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSafeMcpResponse, MAX_INLINE_BYTES, MAX_EXPORT_BYTES, type ExportStore } from '../supabase/functions/_shared/response.ts';
const user = '11111111-1111-4111-8111-111111111111';
function mock() {
  const uploads: string[] = []; const removed: string[] = [];
  const store: ExportStore = {
    async upload(path, body) { assert.ok(path.startsWith(`${user}/`)); uploads.push(body); },
    async sign(_path, seconds) { assert.equal(seconds, 900); return 'https://example.com/private?token=test'; },
    async remove(path) { removed.push(path); },
  };
  return { store, uploads, removed };
}
test('small responses stay inline; errors remain errors', async () => {
  const { store, uploads } = mock();
  const r = await formatSafeMcpResponse(store, user, { ok: false, error_code: 'TEST' }, null);
  assert.equal(r.isError, true); assert.equal(uploads.length, 0);
  const boundary = 'x'.repeat(MAX_INLINE_BYTES - 2);
  assert.equal(JSON.parse((await formatSafeMcpResponse(store, user, boundary, null)).content[0].text), boundary);
});
test('UTF-8 size triggers lossless exports and bounded previews', async () => {
  const { store, uploads } = mock();
  const data = ['한'.repeat(6000), 'small'];
  const r = await formatSafeMcpResponse(store, user, data, null);
  assert.equal(JSON.parse(r.content[0].text).offloaded, true);
  assert.deepEqual(JSON.parse(uploads[0]), data);
  assert.ok(Buffer.byteLength(r.content[0].text) < MAX_INLINE_BYTES);
});
test('delivery failure preserves successful mutation outcome and audit ID', async () => {
  const { store, removed } = mock();
  store.sign = async () => { throw new Error('unavailable'); };
  const r = await formatSafeMcpResponse(store, user, { ok: true, audit_id: user, data: 'x'.repeat(20000) }, null);
  const body = JSON.parse(r.content[0].text);
  assert.equal(r.isError, false); assert.equal(body.ok, true); assert.equal(body.audit_id, user);
  assert.equal(body.delivery_error, 'EXPORT_UNAVAILABLE'); assert.equal(removed.length, 1);
});
test('oversized exports do not upload and oversized domain errors retain error flag', async () => {
  const { store, uploads } = mock();
  const r = await formatSafeMcpResponse(store, user, { ok: false, data: 'x'.repeat(MAX_EXPORT_BYTES) }, null);
  assert.equal(r.isError, true); assert.equal(uploads.length, 0);
  assert.equal(JSON.parse(r.content[0].text).delivery_error, 'EXPORT_TOO_LARGE');
});
