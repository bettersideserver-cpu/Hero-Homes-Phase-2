import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const sql = readFileSync(path.join(root, 'map/IPX/admin/sql/visitor-analytics.sql'), 'utf8');
const trackerSource = readFileSync(path.join(root, 'map/IPX/JS/HeroHomesAnalytics.js'), 'utf8');
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };

test('Supabase migration: profiles, idempotent timing, journeys and access controls', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated;
    -- The original installed profile schema must upgrade without losing IDs.
    create table public.visitor_profiles (
      id uuid primary key default gen_random_uuid(), phone text not null unique check (phone ~ '^[0-9]{10}$'),
      name text not null, email text not null default '', city text not null default '',
      first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
      total_sessions bigint not null default 0, total_page_views bigint not null default 0
    );
    insert into public.visitor_profiles (id, phone, name) values ('e84137d1-16db-4a26-a247-81c82e9ab746', '9000000001', 'Existing Visitor');
    create table public.visitors(id integer, name text, mobile text, email text, city text, created_at timestamptz);
    insert into public.visitors values (1, 'Existing Visitor', '+91 9000000001', '', 'Test City', now());`);
  await db.exec(sql);
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int as n from visitor_profiles')).rows[0].n, 1);
  assert.equal((await db.query('select id, is_registered from visitor_profiles')).rows[0].id, 'e84137d1-16db-4a26-a247-81c82e9ab746');
  assert.equal((await db.query('select is_registered from visitor_profiles')).rows[0].is_registered, true);
  const started = new Date(Date.now() - 60000).toISOString();
  const event = { id: randomUUID(), session_id: randomUUID(), phone: '9000000001', name: 'Visitor A',
    city: 'Test City', email: '', page_key: 'map/index.html', page_name: 'Master Plan',
    page_url: 'http://localhost/map/index.html', previous_page: '', entered_at: started,
    last_seen_at: new Date(Date.now() - 30000).toISOString(), left_at: null, duration_seconds: 30 };
  const send = value => db.query('select public.record_visitor_activity($1::jsonb)', [JSON.stringify(value)]);
  await send(event);
  await send(event);
  assert.equal((await db.query('select total_sessions from visitor_profiles')).rows[0].total_sessions, 1);
  assert.equal((await db.query('select total_page_views from visitor_profiles')).rows[0].total_page_views, 1);
  await send({ ...event, last_seen_at: new Date().toISOString(), duration_seconds: 50 });
  await send({ ...event, duration_seconds: 10 });
  assert.equal((await db.query('select duration_seconds from visitor_sessions')).rows[0].duration_seconds, 50);
  await send({ ...event, id: randomUUID(), previous_page: 'Master Plan', duration_seconds: 5 });
  assert.deepEqual((await db.query('select visit_number from visitor_page_views order by visit_number')).rows.map(row => row.visit_number), [1, 2]);
  assert.equal((await db.query('select duration_seconds from visitor_sessions')).rows[0].duration_seconds, 55);
  await send({ ...event, id: randomUUID(), session_id: randomUUID(), duration_seconds: 0 });
  await assert.rejects(send({ ...event, phone: '9000000002' }), /Session does not match visitor/);
  assert.equal((await db.query('select count(*)::int as n from visitor_profiles')).rows[0].n, 1);
  await send({ ...event, id: randomUUID(), session_id: randomUUID(), phone: '9000000002', duration_seconds: 0 });
  assert.equal((await db.query('select count(*)::int as n from visitor_profiles')).rows[0].n, 2);
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from visitor_profiles'), /permission denied/);
  await assert.rejects(db.query('select * from visitor_sessions'), /permission denied/);
  await assert.rejects(db.query('select * from visitor_page_views'), /permission denied/);
  await assert.rejects(db.query('select visitor_analytics_summary()'), /permission denied/);
  await send(event);
  await db.exec('set role authenticated');
  const summary = (await db.query('select visitor_analytics_summary() as metrics')).rows[0].metrics;
  assert.equal(summary.visitors, 2);
  assert.equal(summary.returning_visitors, 1);
  assert.equal(summary.sessions, 3);
  assert.equal(summary.page_views, 4);
  assert.equal(summary.average_session_seconds, 18);
  await assert.rejects(db.query('delete from visitor_profiles'), /permission denied/);
});

function tracker(storage = {}, options = {}) {
  const dom = new JSDOM(options.html || `<body><button class="tour-pill" onclick="goToRoom('lobby', this)">Lobby</button></body>`, {
    url: options.url || 'http://localhost/Hero%20Homes/map/IPX/Subpages/Tower-B/360/Typical.html?tower=12A&floor=10&unit=2',
    runScripts: 'outside-only'
  });
  const window = dom.window;
  const calls = [], intervals = [];
  let time = Date.now(), visible = 'visible', offline = false;
  window.Date.now = () => time;
  Object.defineProperty(window.document, 'visibilityState', { get: () => visible });
  Object.defineProperty(window.navigator, 'onLine', { get: () => !offline });
  window.setInterval = callback => { intervals.push(callback); return intervals.length; };
  window.console.warn = () => {};
  window.fetch = async (_url, request) => {
    if (options.fail?.()) throw new Error('offline');
    calls.push(JSON.parse(request.body).p_event);
    assert.equal(request.headers.apikey, 'test-publishable-key');
    assert.equal(request.headers.Authorization, undefined);
    return { ok: true };
  };
  for (const [key, value] of Object.entries(storage)) window.sessionStorage.setItem(key, value);
  const source = trackerSource.replace(/^import .*;\r?\n/, "const SUPABASE_URL = 'http://local-supabase'; const SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';\n")
    .replace('import.meta.url', "'http://localhost/Hero%20Homes/map/IPX/JS/HeroHomesAnalytics.js'");
  window.eval(source);
  return { dom, window, calls,
    advance(ms) { time += ms; },
    tick() { intervals.forEach(callback => callback()); },
    visibility(value) { visible = value; window.document.dispatchEvent(new window.Event('visibilitychange')); },
    identify(phone = '9000000001', name = 'Visitor A') {
      window.sessionStorage.setItem('heroHomesVisitor', JSON.stringify({ fullName: name, mobile: phone, city: 'Test City' }));
      window.dispatchEvent(new window.Event('hero-homes:visitor-ready'));
    },
    storage() { return Object.fromEntries(Object.keys(window.sessionStorage).map(key => [key, window.sessionStorage.getItem(key)])); }
  };
}

test('Tracker: identity, visible time, both balcony sides and session timeout', async t => {
  const browser = tracker(); t.after(() => browser.dom.window.close());
  await settle();
  const anonymous = browser.calls.at(-1);
  assert.equal(anonymous.name, anonymous.visitor_id);
  assert.equal(anonymous.phone, '');
  browser.identify(); await settle();
  const initial = browser.calls.at(-1);
  assert.equal(initial.visitor_id, anonymous.visitor_id);
  assert.equal(initial.session_id, anonymous.session_id);
  assert.equal(initial.id, anonymous.id);
  assert.equal(initial.page_name, 'Tower 12A · Floor 10 · Unit 2 · Lobby');
  browser.advance(15000); browser.tick(); await settle();
  assert.equal(browser.calls.at(-1).duration_seconds, 15);
  browser.advance(5000); browser.visibility('hidden'); await settle();
  assert.equal(browser.calls.at(-1).duration_seconds, 20);
  browser.advance(60000); browser.visibility('visible');
  browser.advance(10000); browser.tick(); await settle();
  assert.equal(browser.calls.at(-1).duration_seconds, 30);
  assert.equal(browser.calls.at(-1).id, initial.id);
  browser.window.HeroHomesAnalytics.trackRoom('balcony', { balconyType: 'F', balconyFloor: 10 }); await settle();
  assert.match(browser.calls.at(-1).page_name, /Garden View Balcony/);
  assert.match(browser.calls.at(-1).page_key, /balconyType=F/);
  browser.window.HeroHomesAnalytics.trackRoom('balcony', { balconyType: 'B', balconyFloor: 15 }); await settle();
  const back = browser.calls.at(-1);
  assert.match(back.page_name, /Back Balcony.*15/);
  assert.match(back.previous_page, /Garden View Balcony/);
  assert.equal(back.session_id, initial.session_id);
  browser.identify('9000000002', 'Visitor A'); await settle();
  assert.notEqual(browser.calls.at(-1).session_id, initial.session_id);
  assert.notEqual(browser.calls.at(-1).visitor_id, initial.visitor_id);
  assert.equal(browser.calls.at(-1).previous_page, '');
  const secondSession = browser.calls.at(-1).session_id;
  const secondVisitor = browser.calls.at(-1).visitor_id;
  browser.visibility('hidden'); browser.advance(31 * 60000); browser.visibility('visible'); await settle();
  assert.notEqual(browser.calls.at(-1).session_id, secondSession);
  assert.equal(browser.calls.at(-1).visitor_id, secondVisitor);
});

test('Tracker: navigation resumes a session and retries offline events without changing their IDs', async t => {
  let fail = true;
  const first = tracker({}, { fail: () => fail }); t.after(() => first.dom.window.close());
  first.identify(); await settle();
  const queued = JSON.parse(first.window.sessionStorage.getItem('heroHomesAnalyticsQueue'));
  assert.equal(queued.length, 1);
  first.advance(10000); first.window.dispatchEvent(new first.window.Event('pagehide')); await settle();
  const next = tracker(first.storage(), { url: 'http://localhost/Hero%20Homes/map/index.html?email=private@example.com' });
  t.after(() => next.dom.window.close());
  await settle();
  assert.equal(next.calls[0].id, queued[0].id);
  assert.equal(next.calls[0].duration_seconds, 10);
  assert.equal(next.calls.at(-1).session_id, queued[0].session_id);
  assert.match(next.calls.at(-1).previous_page, /Lobby/);
  assert.equal(next.calls.at(-1).page_key, 'map/index.html');
  assert.ok(!next.calls.at(-1).page_url.includes('private'));
  assert.deepEqual(JSON.parse(next.window.sessionStorage.getItem('heroHomesAnalyticsQueue')), []);
});

test('Anonymous map journey becomes registered under the same database ID, including delayed retries', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec('create role anon; create role authenticated;');
  await db.exec(sql);
  const first = tracker({}, { url: 'http://localhost/Hero%20Homes/map/index%20copy.html' });
  t.after(() => first.dom.window.close());
  await settle();
  const anonymous = first.calls[0];
  assert.equal(anonymous.page_name, 'Master Plan');
  assert.equal(anonymous.previous_page, '');
  const send = event => db.query('select record_visitor_activity($1::jsonb)', [JSON.stringify(event)]);
  await db.exec('set role anon');
  await send(anonymous);
  await db.exec('reset role');
  assert.deepEqual((await db.query('select id, name, phone, is_registered from visitor_profiles')).rows[0],
    { id: anonymous.visitor_id, name: anonymous.visitor_id, phone: null, is_registered: false });
  const next = tracker(first.storage()); t.after(() => next.dom.window.close());
  await settle();
  const tour = next.calls.at(-1);
  assert.equal(tour.visitor_id, anonymous.visitor_id);
  assert.equal(tour.session_id, anonymous.session_id);
  assert.equal(tour.previous_page, 'Master Plan');
  await send(tour);
  next.identify(); await settle();
  const registered = next.calls.at(-1);
  assert.equal(registered.id, tour.id);
  assert.equal(registered.session_id, anonymous.session_id);
  assert.equal(registered.visitor_id, anonymous.visitor_id);
  await send(registered);
  await send(registered);
  // A later anonymous heartbeat must not demote the already registered profile.
  await send({ ...tour, last_seen_at: new Date(Date.now() + 1000).toISOString() });
  await send(anonymous);
  const row = (await db.query('select * from visitor_profiles')).rows[0];
  assert.equal(row.id, anonymous.visitor_id);
  assert.equal(row.name, 'Visitor A');
  assert.equal(row.phone, '9000000001');
  assert.equal(row.is_registered, true);
  assert.equal(row.total_sessions, 1);
  assert.equal(row.total_page_views, 2);
  const session = (await db.query('select * from visitor_sessions')).rows[0];
  assert.equal(session.landing_page, 'Master Plan');
  assert.equal(session.visitor_id, anonymous.visitor_id);
  assert.equal((await db.query('select count(*)::int as n from visitor_page_views where visitor_id = $1', [row.id])).rows[0].n, 2);
  // Separate browsers do not accidentally combine histories even with the same phone.
  await send({ ...registered, visitor_id: randomUUID(), session_id: randomUUID(), id: randomUUID() });
  const unregisteredId = randomUUID();
  await send({ ...anonymous, visitor_id: unregisteredId, session_id: randomUUID(), id: randomUUID() });
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int as n from visitor_profiles')).rows[0].n, 3);
  assert.equal((await db.query('select is_registered from visitor_profiles where id = $1', [unregisteredId])).rows[0].is_registered, false);
  await assert.rejects(send({ ...anonymous, phone: '123' }), /Invalid visitor activity/);
});

test('Home and admin never create an identity or flush stored analytics', async t => {
  for (const route of ['index.html', '', 'map/IPX/admin/index.html']) {
    const browser = tracker({ heroHomesAnalyticsQueue: JSON.stringify([{ id: 'pending' }]) },
      { url: `http://localhost/Hero%20Homes/${route}` });
    t.after(() => browser.dom.window.close());
    browser.identify(); browser.tick(); browser.window.dispatchEvent(new browser.window.Event('pagehide'));
    await settle();
    assert.equal(browser.calls.length, 0);
    assert.equal(browser.window.sessionStorage.getItem('heroHomesAnalyticsVisitorId'), null);
    assert.equal(browser.window.sessionStorage.getItem('heroHomesAnalyticsSession'), null);
  }
});

test('Typical form failure retains anonymous identity; success enriches it and avoids repeat prompts', async t => {
  const gateSource = readFileSync(path.join(root, 'map/IPX/JS/HeroHomesLeadCaptureGlobal.js'), 'utf8');
  const html = '<html data-hero-homes-visitor-gate="on-navigation"><body></body></html>';
  const browser = tracker({}, { html }); t.after(() => browser.dom.window.close());
  await settle();
  const anonymous = browser.calls[0];
  const analyticsFetch = browser.window.fetch;
  let fail = true;
  browser.window.console.error = () => {};
  browser.window.fetch = async (url, request) => {
    if (url.endsWith('/visitors')) return { ok: !fail, status: 503, json: async () => ({ message: 'Test outage' }) };
    return analyticsFetch(url, request);
  };
  browser.window.eval(gateSource); await settle();
  const document = browser.window.document;
  assert.equal(document.getElementById('hhRequiredVisitorGate'), null);
  let resumed = false;
  assert.equal(browser.window.HeroHomesRequireVisitor(() => { resumed = true; }), false);
  assert.ok(document.getElementById('hhRequiredVisitorGate').classList.contains('open'));
  for (const [id, value] of Object.entries({ hhReqName: 'Test Visitor', hhReqPhone: '9000000001', hhReqEmail: 'test@example.com', hhReqCity: 'Test City' })) {
    document.getElementById(id).value = value;
  }
  const submit = () => document.getElementById('hhRequiredVisitorForm').dispatchEvent(new browser.window.Event('submit', { cancelable: true }));
  submit(); await settle();
  assert.equal(browser.window.sessionStorage.getItem('heroHomesVisitor'), null);
  assert.match(document.getElementById('hhReqError').textContent, /Could not submit/);
  assert.ok(document.getElementById('hhRequiredVisitorGate').classList.contains('open'));
  fail = false; submit(); await settle();
  assert.equal(resumed, true);
  const registered = browser.calls.at(-1);
  assert.equal(registered.name, 'Test Visitor');
  assert.equal(registered.visitor_id, anonymous.visitor_id);
  assert.equal(registered.session_id, anonymous.session_id);
  assert.equal(registered.id, anonymous.id);
  assert.ok(!document.getElementById('hhRequiredVisitorGate').classList.contains('open'));
  const next = tracker(browser.storage(), { html }); t.after(() => next.dom.window.close());
  next.window.eval(gateSource); await settle();
  assert.equal(next.window.document.getElementById('hhRequiredVisitorGate'), null);
  assert.equal(next.calls.at(-1).visitor_id, anonymous.visitor_id);
});

test('Visitor Details: totals, profiles, session selection, escaping and empty journeys', async t => {
  const html = readFileSync(path.join(root, 'map/IPX/admin/index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/admin/index.html', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const window = dom.window;
  const data = {
    visitor_profiles: [
      { id: 'v1', name: '<img src=x onerror=alert(1)>', is_registered: true, phone: '9000000001', city: 'Test City', total_sessions: 1, total_page_views: 1 },
      { id: 'v2', name: 'v2', is_registered: false, phone: null, total_sessions: 0, total_page_views: 0 }
    ],
    visitor_sessions: [{ id: 's1', visitor_id: 'v1', started_at: new Date().toISOString(), landing_page: 'Master Plan', exit_page: 'Garden View Balcony', duration_seconds: 80 }],
    visitor_page_views: [{ id: 'p1', session_id: 's1', page_name: 'Garden View Balcony', page_key: 'room=balcony&balconyType=F', duration_seconds: 80, visit_number: 1 }]
  };
  window.supabase = {
    from(table) {
      let rows = [...data[table]], start = 0, end = 24;
      return { select() { return this; }, order() { return this; },
        eq(column, value) { rows = rows.filter(row => row[column] === value); return this; },
        or() { return this; }, range(a, b) { start = a; end = b; return this; },
        then(resolve) { return Promise.resolve({ data: rows.slice(start, end + 1), count: rows.length }).then(resolve); }
      };
    },
    rpc: async () => ({ data: { visitors: 2, returning_visitors: 0, sessions: 1, page_views: 1, average_session_seconds: 80 } })
  };
  const source = readFileSync(path.join(root, 'map/IPX/admin/js/visitor-details.js'), 'utf8').replace(/^import .*;\r?\n/, '').replaceAll('export ', '');
  window.eval(source + '\nwindow.testAnalytics = {initVisitorDetails, loadVisitorDetails};');
  window.testAnalytics.initVisitorDetails();
  await window.testAnalytics.loadVisitorDetails();
  assert.equal(window.document.getElementById('analyticsVisitors').textContent, '2');
  assert.equal(window.document.getElementById('analyticsAverage').textContent, '1m 20s');
  assert.equal(window.document.querySelectorAll('#analyticsVisitorRows img').length, 0);
  assert.match(window.document.getElementById('analyticsJourneyRows').textContent, /Garden View Balcony/);
  window.document.querySelector('[data-analytics-visitor="v2"]').click(); await settle();
  assert.match(window.document.getElementById('analyticsSessionRows').textContent, /No tracked sessions/);
  assert.ok(!window.document.getElementById('analyticsJourneyRows').textContent.includes('Garden View Balcony'));
  const filter = window.document.getElementById('visitorDetailsRegistration');
  filter.value = 'registered'; filter.dispatchEvent(new window.Event('change')); await settle();
  assert.ok(window.document.querySelector('[data-analytics-visitor="v1"]'));
  assert.equal(window.document.querySelector('[data-analytics-visitor="v2"]'), null);
  filter.value = 'non-registered'; filter.dispatchEvent(new window.Event('change')); await settle();
  assert.ok(window.document.querySelector('[data-analytics-visitor="v2"]'));
  assert.equal(window.document.querySelector('[data-analytics-visitor="v1"]'), null);
  assert.match(window.document.getElementById('analyticsVisitorRows').textContent, /v2.*Non-registered/s);
  assert.equal(window.document.getElementById('analyticsVisitors').textContent, '2');
  filter.value = 'all'; filter.dispatchEvent(new window.Event('change')); await settle();
  assert.equal(window.document.querySelectorAll('[data-analytics-visitor]').length, 2);
  data.visitor_profiles = [];
  await window.testAnalytics.loadVisitorDetails();
  assert.match(window.document.getElementById('analyticsSelectedVisitor').textContent, /Select a visitor/);
  window.supabase.rpc = async () => ({ error: { code: 'PGRST202' } });
  await window.testAnalytics.loadVisitorDetails();
  assert.equal(window.document.getElementById('visitorDetailsSetup').hidden, false);
});

test('Map pages include a valid tracker; public home and admin do not track visitors; only Typical pages show the form', () => {
  const walk = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() && entry.name !== 'tests'
    ? walk(path.join(folder, entry.name)) : entry.isFile() && entry.name.endsWith('.html') ? [path.join(folder, entry.name)] : []);
  let tracked = 0;
  for (const file of walk(root)) {
    const html = readFileSync(file, 'utf8');
    const scripts = [...html.matchAll(/<script type="module" src="([^"]*HeroHomesAnalytics\.js)"><\/script>/g)];
    if (file.includes(`${path.sep}admin${path.sep}`) || file === path.join(root, 'index.html')) { assert.equal(scripts.length, 0); continue; }
    assert.equal(scripts.length, 1, file);
    assert.ok(existsSync(path.resolve(path.dirname(file), scripts[0][1])), file);
    assert.equal(html.includes('data-hero-homes-visitor-gate="on-navigation"'), path.basename(file) === 'Typical.html', file);
    tracked++;
  }
  assert.equal(tracked, 46);
});
