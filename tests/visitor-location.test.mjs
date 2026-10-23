import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { handleActivity, clientIP } from '../supabase/functions/visitor-activity/handler.mjs';

const config = { url: 'https://db.test', key: 'server-only', origins: ['https://site.test'] };
const session = 'a84137d1-16db-4a26-a247-81c82e9ab746';
const request = (origin = 'https://site.test') => new Request('https://edge.test', {
  method: 'POST', headers: { origin, 'x-forwarded-for': '8.8.8.8, 10.0.0.1' },
  body: JSON.stringify({ p_event: { session_id: session, ip_address: '1.1.1.1' } }),
});
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

test('Handler records network IP without making any third-party lookup', async () => {
  const calls = [];
  const response = await handleActivity(request(), config, async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return new Response(null, { status: 204 });
    if (calls.length === 2) return json([{ id: session }]);
    return new Response(null, { status: 204 });
  });
  assert.equal(response.status, 204);
  assert.equal(JSON.parse(calls[1].options.body).ip_address, '8.8.8.8');
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url.startsWith('https://db.test/')));
  assert.equal(await response.text(), '');
});

test('Unapproved origins and invalid activities never call the provider', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return new Response(null, { status: 400 }); };
  assert.equal((await handleActivity(request('https://other.test'), config, fetcher)).status, 403);
  assert.equal(calls, 0);
  assert.equal((await handleActivity(request(), config, fetcher)).status, 400);
  assert.equal(calls, 1);
  assert.equal(clientIP(new Request('https://edge.test', { headers: { 'x-forwarded-for': 'invalid' } })), null);
});

test('An already captured session makes no further location lookup', async () => {
  let calls = 0;
  const response = await handleActivity(request(), config, async () => ++calls === 1 ? new Response(null, { status: 204 }) : json([]));
  assert.equal(response.status, 204);
  assert.equal(calls, 2);
});

test('IP write failure returns a retryable response', async () => {
  let calls = 0;
  const response = await handleActivity(request(), config, async () => {
    calls++;
    if (calls === 1) return new Response(null, { status: 204 });
    return new Response(null, { status: 429 });
  });
  assert.equal(response.status, 503);
  assert.equal(calls, 2);
});

test('Location migration preserves admin read access and denies public reads and client updates', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('../map/IPX/admin/sql/visitor-analytics.sql', import.meta.url), 'utf8'));
  const migration = readFileSync(new URL('../map/IPX/admin/sql/visitor-location.sql', import.meta.url), 'utf8');
  await db.exec(migration); await db.exec(migration);
  await db.exec('set role anon');
  await assert.rejects(db.query('select ip_address from visitor_sessions'), /permission denied/);
  await db.exec('set role authenticated');
  await db.query('select ip_address, detected_city, detected_state, detected_country from visitor_sessions');
  await assert.rejects(db.query("update visitor_sessions set detected_city = 'Fake'"), /permission denied/);
});
