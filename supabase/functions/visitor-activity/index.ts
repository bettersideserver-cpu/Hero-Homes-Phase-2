import { handleActivity } from './handler.mjs';

Deno.serve(request => handleActivity(request, {
  url: Deno.env.get('SUPABASE_URL'),
  key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  origins: (Deno.env.get('ALLOWED_ORIGINS') || 'https://www.herohomesphase2.com,https://herohomesphase2.com').split(',').map(value => value.trim()).filter(Boolean),
}));
