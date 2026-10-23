import { isIP } from 'node:net';

// Supabase's gateway supplies X-Forwarded-For. Treat this as approximate analytics,
// never as proof of identity or an authorization signal.
export function clientIP(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return isIP(ip) ? ip : null;
}

export async function handleActivity(request, config, fetcher = fetch) {
  const origin = request.headers.get('origin');
  if (!origin || !config.origins.includes(origin)) return new Response('Origin not allowed', { status: 403 });
  const cors = { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'content-type, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const reply = (status, text = '') => new Response(text || null, { status, headers: cors });
  if (request.method === 'OPTIONS') return reply(204);
  if (request.method !== 'POST') return reply(405);
  if (!config.url || !config.key) return reply(503, 'Server setup incomplete');
  let event;
  try {
    const raw = await request.text();
    if (raw.length > 16000) return reply(413);
    event = JSON.parse(raw).p_event;
    if (!event || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.session_id)) return reply(400, 'Invalid activity');
  } catch { return reply(400, 'Invalid activity'); }
  const headers = { 'Content-Type': 'application/json', apikey: config.key, Authorization: `Bearer ${config.key}` };
  try {
    // Existing SQL validates the activity before recording the network IP.
    const saved = await fetcher(`${config.url}/rest/v1/rpc/record_visitor_activity`, {
      method: 'POST', headers, body: JSON.stringify({ p_event: event }), signal: AbortSignal.timeout(8000),
    });
    if (!saved.ok) return reply(saved.status >= 500 ? 503 : 400, 'Activity could not be recorded');
  } catch { return reply(503, 'Activity temporarily unavailable'); }

  try {
    const sessionUrl = `${config.url}/rest/v1/visitor_sessions?id=eq.${event.session_id}`;
    const ip = clientIP(request);
    // Record the first connection IP once per session, including concurrent requests.
    const claim = await fetcher(`${sessionUrl}&location_checked_at=is.null&select=id`, {
      method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ ip_address: ip, location_checked_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(3000),
    });
    if (!claim.ok) return reply(503, 'IP capture temporarily unavailable');
  } catch {
    // Never expose IPs, API tokens, or visitor registration data in logs/errors.
    return reply(503, 'IP capture temporarily unavailable');
  }
  // Existing ingestion is idempotent, so failed IP writes can be retried safely.
  return reply(204);
}
