import { supabase } from './supabase.js';

const $ = id => document.getElementById(id);
let busy = false;

function show(message, error = false) {
  const element = $('msg');
  element.textContent = message;
  element.classList.toggle('error', error);
}

function showView(register) {
  $('loginView').hidden = register;
  $('registerView').hidden = !register;
  show('');
  $(register ? 'name' : 'email').focus();
}

async function submit(form, message, action) {
  if (busy) return;
  busy = true;
  const buttons = document.querySelectorAll('.auth-card button');
  buttons.forEach(button => { button.disabled = true; });
  form.setAttribute('aria-busy', 'true');
  show(message);
  try {
    await action();
  } catch (error) {
    show(error?.message || 'Unable to connect. Please try again.', true);
  } finally {
    busy = false;
    buttons.forEach(button => { button.disabled = false; });
    form.removeAttribute('aria-busy');
  }
}

$('loginForm').onsubmit = async event => {
  event.preventDefault();
  await submit($('loginForm'), 'Signing in...', async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value
    });
    if (error) throw error;
    location.href = 'index.html';
  });
};

$('registerForm').onsubmit = async event => {
  event.preventDefault();
  await submit($('registerForm'), 'Creating user...', async () => {
    const email = $('regEmail').value.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: $('regPassword').value,
      options: { data: { name: $('name').value.trim() } }
    });
    if (error) throw error;
    if (!data?.user) throw new Error('Registration was not completed. Please try again.');

    $('registerForm').reset();
    if (data.session) {
      location.href = 'index.html';
      return;
    }

    $('email').value = email;
    $('password').value = '';
    showView(false);
    // Without a session, email confirmation is still required. Supabase may also
    // return an obscured success for an existing account, so do not promise creation.
    show('Registration submitted. Check your email for a confirmation link before logging in. If you already have an account, use your existing login.');
  });
};

$('showRegister').onclick = () => showView(true);
$('showLogin').onclick = () => showView(false);
