import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../admin/js/config.js';

// A per-tab visitor ID follows the journey before and after registration.
const PROFILE_KEY = 'heroHomesVisitor';
const VISITOR_ID_KEY = 'heroHomesAnalyticsVisitorId';
const SESSION_KEY = 'heroHomesAnalyticsSession';
const QUEUE_KEY = 'heroHomesAnalyticsQueue';
const TIMEOUT = 30 * 60 * 1000;
const rootPath = decodeURIComponent(new URL('../../../', import.meta.url).pathname);
const route = decodeURIComponent(location.pathname).slice(rootPath.length);
// Never record the public home page or admin, even if a cached page loads this script.
const trackable = /^map\//i.test(route) && !/^map\/IPX\/admin(?:\/|$)/i.test(route);
const read = (key, fallback = null) => {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
};
const stored = key => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };
const uuid = () => crypto.randomUUID();
const phoneOf = profile => {
  const digits = String(profile?.mobile || profile?.phone || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};
const iso = time => new Date(time).toISOString();
const cleanUrl = value => {
  try { const url = new URL(value); return url.origin + url.pathname; } catch { return ''; }
};
let queue = read(QUEUE_KEY, []);
if (!Array.isArray(queue)) queue = [];
let session = read(SESSION_KEY);
let visitorId = stored(VISITOR_ID_KEY);
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId)) visitorId = '';
let page = null;
let activeSince = null;
let activeMilliseconds = 0;
let sending = false;
let roomOverride = null;
let warned = false;

function describePage() {
  const route = decodeURIComponent(location.pathname).replace(rootPath, '');
  const params = new URLSearchParams(location.search);
  const isTour = /Typical\.html$/i.test(route);
  const isFloor = /Subpages\/Floor\//i.test(route);
  const isTower = /Subpages\/Tower_[ABC]\.html$/i.test(route);
  const propertyPage = isTour || isFloor || isTower;
  const fileTower = route.match(/Tower-(9|10|11|12|C-12-A)\.html$/i)?.[1]?.replace('C-12-A', '12A');
  const tower = propertyPage ? (params.get('tower') || fileTower || stored('selectedTower') || stored('heroHomesTower')) : '';
  const floor = (isTour || isFloor) ? Number(params.get('floor') || stored('selectedFloor') || stored('heroHomesFloor')) || null : null;
  const unit = isTour ? Number(params.get('unit') || stored('selectedUnit') || stored('heroHomesUnit')) || null : null;
  const room = isTour ? (roomOverride?.room || params.get('room') || 'lobby') : '';
  let label = document.body?.dataset.pageName || document.title || route;
  if (route === 'index.html' || !route) label = 'Home';
  else if (/^map\/index(?: copy)?\.html$/i.test(route)) label = 'Master Plan';
  else if (isTower) label = tower ? `Tower ${tower}` : route.split('/').pop().replace('.html', '').replace('_', ' ');
  else if (isFloor) label = `Tower ${tower} · Floor ${floor || 1}`;
  else if (isTour) {
    const button = [...document.querySelectorAll('.tour-pill')].find(button =>
      (button.getAttribute('onclick') || '').includes(`'${room}'`));
    let roomLabel = button?.textContent.trim() || room.replaceAll('_', ' ');
    if (room === 'balcony') {
      const side = roomOverride?.balconyType || params.get('balconyType') || stored('balconyType') || 'F';
      roomLabel = side === 'B' ? 'Back Balcony' : 'Garden View Balcony';
    }
    label = [tower && `Tower ${tower}`, floor && `Floor ${floor}`, unit && `Unit ${unit}`, roomLabel].filter(Boolean).join(' · ');
  }
  // Keep only property context, never registration values or arbitrary query strings.
  const context = new URLSearchParams();
  if (tower) context.set('tower', tower);
  if (floor) context.set('floor', String(floor));
  if (unit) context.set('unit', String(unit));
  if (room) context.set('room', room);
  if (room === 'balcony') {
    const requested = Number(params.get('balconyFloor') || floor || 1);
    const nearest = [1, 5, 10, 15, 20, 25, 32].reduce((best, value) => Math.abs(value - requested) < Math.abs(best - requested) ? value : best, 1);
    context.set('balconyType', roomOverride?.balconyType || params.get('balconyType') || stored('balconyType') || 'F');
    context.set('balconyFloor', String(roomOverride?.balconyFloor || nearest));
    label += ` · Balcony Floor ${context.get('balconyFloor')}`;
  }
  const suffix = context.size ? '?' + context.toString() : '';
  return { page_key: route + suffix, page_name: label, page_url: location.origin + location.pathname + suffix, tower, floor, unit };
}

function enqueue(event) {
  const existing = queue.findIndex(item => item.id === event.id);
  if (existing < 0) queue.push(event); else queue[existing] = event;
  queue = queue.slice(-200);
  write(QUEUE_KEY, queue);
}

async function send(event, keepalive = false) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_visitor_activity`, {
    method: 'POST', keepalive,
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ p_event: event })
  });
  if (!response.ok) throw new Error(`Analytics request failed (${response.status})`);
  // A heartbeat may have replaced the queued snapshot while this request was in flight.
  queue = queue.filter(item => item.id !== event.id || JSON.stringify(item) !== JSON.stringify(event));
  write(QUEUE_KEY, queue);
}

async function flush() {
  if (!trackable || sending || !navigator.onLine || !queue.length) return;
  sending = true;
  try {
    while (queue.length) await send(queue[0]);
    warned = false;
  } catch {
    if (!warned) console.warn('Hero Homes analytics is queued and will retry. Check the Supabase analytics setup if this persists.');
    warned = true;
  } finally { sending = false; }
}

function snapshot(left = false) {
  if (!page) return null;
  const now = Date.now();
  if (activeSince !== null) {
    activeMilliseconds += Math.max(0, now - activeSince);
    activeSince = document.visibilityState === 'visible' && !left ? now : null;
  }
  const event = { ...page, last_seen_at: iso(now), left_at: left ? iso(now) : null,
    duration_seconds: Math.floor(activeMilliseconds / 1000) };
  session.lastActivity = now;
  write(SESSION_KEY, session);
  enqueue(event);
  return event;
}

function track() {
  if (!trackable) return;
  const profile = read(PROFILE_KEY);
  const name = String(profile?.fullName || profile?.name || '').trim().slice(0, 160);
  const registered = /^\d{10}$/.test(phoneOf(profile)) && !!name;
  const phone = registered ? phoneOf(profile) : '';
  // A different registered person (or an explicit reset) gets a new identity.
  const changedVisitor = !!session?.phone && session.phone !== phone;
  if (!visitorId || changedVisitor) {
    visitorId = uuid();
    try { sessionStorage.setItem(VISITOR_ID_KEY, visitorId); } catch { /* Keep the in-memory ID. */ }
  }
  const now = Date.now();
  const description = describePage();
  const identity = { visitor_id: visitorId, phone, name: registered ? name : visitorId,
    email: registered ? String(profile.email || '').slice(0, 254) : '',
    city: registered ? String(profile.city || '').slice(0, 160) : '' };
  const expired = !session || session.visitorId !== visitorId || now - session.lastActivity > TIMEOUT;
  if (!expired && page?.page_key === description.page_key) {
    if (page.phone !== phone || page.name !== identity.name || page.email !== identity.email || page.city !== identity.city) {
      // Enrich the current page/session in place so registration preserves the journey.
      Object.assign(page, identity);
      session.phone = phone;
      snapshot();
      void flush();
    }
    return;
  }
  if (page) snapshot(true);
  if (expired) session = { id: uuid(), visitorId, phone, lastActivity: now, previousPage: '' };
  session.phone = phone;
  page = { ...description, ...identity, id: uuid(), session_id: session.id,
    previous_page: session.previousPage || '', referrer: cleanUrl(document.referrer), entered_at: iso(now) };
  session.previousPage = description.page_name;
  session.lastActivity = now;
  write(SESSION_KEY, session);
  activeMilliseconds = 0;
  activeSince = document.visibilityState === 'visible' ? now : null;
  snapshot();
  void flush();
}

window.HeroHomesAnalytics = {
  trackRoom(room, details = {}) {
    roomOverride = { room, ...details };
    track();
  },
  identify: track
};
window.addEventListener('hero-homes:visitor-ready', track);
window.addEventListener('online', () => { track(); void flush(); });
window.addEventListener('pageshow', () => {
  track();
  if (page && document.visibilityState === 'visible') activeSince = Date.now();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const event = snapshot();
    if (event) void send(event, true).catch(() => {});
  } else {
    track();
    if (page) activeSince = Date.now();
    void flush();
  }
});
window.addEventListener('pagehide', () => {
  const event = snapshot(true);
  if (event) void send(event, true).catch(() => {});
});
setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  track();
  snapshot();
  void flush();
}, 15000);
track();
void flush();
