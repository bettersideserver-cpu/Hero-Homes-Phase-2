import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../map/IPX/admin/login.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../map/IPX/admin/js/auth.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/, '')
  .replaceAll("location.href", "window.redirectTo");

function page(t, auth = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/map/IPX/admin/login.html', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.supabase = { auth };
  dom.window.eval(source);
  const $ = id => dom.window.document.getElementById(id);
  const submit = id => $(id).onsubmit({ preventDefault() {} });
  const register = () => {
    $('showRegister').click();
    $('name').value = ' Test Admin ';
    $('regEmail').value = 'admin@example.test';
    $('regPassword').value = 'test-password';
  };
  return { window: dom.window, $, submit, register };
}

test('Registration opens and Back to login restores the login form', t => {
  const { window, $ } = page(t);
  $('showRegister').click();
  assert.equal($('registerView').hidden, false);
  assert.equal(window.getComputedStyle($('loginView')).display, 'none');
  $('showLogin').click();
  assert.equal($('loginView').hidden, false);
  assert.equal(window.getComputedStyle($('registerView')).display, 'none');
});

test('Registration sends the name and explains email confirmation', async t => {
  let credentials;
  const { window, $, submit, register } = page(t, {
    async signUp(value) { credentials = value; return { data: { user: { id: 'test-user' }, session: null }, error: null }; }
  });
  register();
  await submit('registerForm');
  assert.equal(credentials.email, 'admin@example.test');
  assert.equal(credentials.password, 'test-password');
  assert.equal(credentials.options.data.name, 'Test Admin');
  assert.match($('msg').textContent, /check your email.*confirmation/i);
  assert.equal($('msg').classList.contains('error'), false);
  assert.equal($('loginView').hidden, false);
  assert.equal($('email').value, 'admin@example.test');
  assert.equal($('regPassword').value, '');
  assert.equal(window.redirectTo, undefined);
});

test('A signup that returns a session opens the dashboard', async t => {
  const { window, submit, register } = page(t, {
    async signUp() { return { data: { user: { id: 'test-user' }, session: { access_token: 'fixture' } }, error: null }; }
  });
  register();
  await submit('registerForm');
  assert.equal(window.redirectTo, 'index.html');
});

test('Signup errors remain visible and keep the form ready for correction', async t => {
  const { $, submit, register } = page(t, {
    async signUp() { return { data: { user: null, session: null }, error: { message: 'Email rate limit exceeded' } }; }
  });
  register();
  await submit('registerForm');
  assert.equal($('msg').textContent, 'Email rate limit exceeded');
  assert.equal($('msg').classList.contains('msg'), true);
  assert.equal($('msg').classList.contains('error'), true);
  assert.equal($('registerView').hidden, false);
  assert.equal($('regEmail').value, 'admin@example.test');
  assert.equal($('regPassword').value, 'test-password');
  assert.equal($('registerForm').querySelector('button').disabled, false);
});

test('Network failures are displayed and registration can be retried', async t => {
  let attempts = 0;
  const { $, submit, register } = page(t, {
    async signUp() {
      attempts++;
      if (attempts === 1) throw new Error('Failed to fetch');
      return { data: { user: { id: 'test-user' }, session: null }, error: null };
    }
  });
  register();
  await submit('registerForm');
  assert.equal($('msg').textContent, 'Failed to fetch');
  assert.equal($('registerForm').querySelector('button').disabled, false);
  await submit('registerForm');
  assert.equal(attempts, 2);
  assert.match($('msg').textContent, /check your email/i);
});

test('A pending signup cannot be submitted twice or switched to login', async t => {
  let resolveSignup;
  let calls = 0;
  const { $, submit, register } = page(t, {
    signUp() { calls++; return new Promise(resolve => { resolveSignup = resolve; }); }
  });
  register();
  const pending = submit('registerForm');
  assert.match($('msg').textContent, /creating user/i);
  assert.equal($('registerForm').querySelector('button').disabled, true);
  assert.equal($('showLogin').disabled, true);
  await submit('registerForm');
  assert.equal(calls, 1);
  resolveSignup({ data: { user: { id: 'test-user' }, session: null }, error: null });
  await pending;
  assert.equal($('showLogin').disabled, false);
});

test('Login displays authentication errors and navigates after a successful retry', async t => {
  let attempts = 0;
  const { window, $, submit } = page(t, {
    async signInWithPassword(credentials) {
      assert.equal(credentials.email, 'admin@example.test');
      assert.equal(credentials.password, 'test-password');
      attempts++;
      return attempts === 1
        ? { data: { session: null }, error: { message: 'Email not confirmed' } }
        : { data: { session: { access_token: 'fixture' } }, error: null };
    }
  });
  $('email').value = 'admin@example.test';
  $('password').value = 'test-password';
  await submit('loginForm');
  assert.equal($('msg').textContent, 'Email not confirmed');
  assert.equal(window.redirectTo, undefined);
  await submit('loginForm');
  assert.equal(window.redirectTo, 'index.html');
});
