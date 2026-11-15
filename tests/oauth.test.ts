import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOAuthClientIds, isOAuthClientAllowed } from '../supabase/functions/_shared/oauth.ts';

test('missing, blank, and comma-only configuration supports provider-issued OAuth clients', () => {
  for (const raw of [undefined, '', '  ', ' , , ']) {
    const ids = parseOAuthClientIds(raw);
    assert.deepEqual(ids, []);
    assert.equal(isOAuthClientAllowed('registered-client', ids), true);
    for (const invalid of [undefined, null, '', '   ', 123, [], {}]) {
      assert.equal(isOAuthClientAllowed(invalid, ids), false);
    }
  }
});
test('an explicit OAuth allowlist limits access even with dynamic registration enabled', () => {
  const ids = parseOAuthClientIds(' client-a,client-b, client-a, ');
  assert.deepEqual(ids, ['client-a', 'client-b']);
  assert.equal(isOAuthClientAllowed('client-a', ids), true);
  assert.equal(isOAuthClientAllowed('client-b', ids), true);
  assert.equal(isOAuthClientAllowed('unlisted-client', ids), false);
  assert.equal(isOAuthClientAllowed(' client-a ', ids), false);
});
