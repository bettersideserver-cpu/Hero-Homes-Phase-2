import { supabase } from './supabase.js';

const $ = id => document.getElementById(id);
const PAGE_SIZE = 25;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : '—';
const duration = value => {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return hours ? `${hours}h ${minutes}m ${seconds % 60}s` : minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};
const count = value => Number(value || 0).toLocaleString();
const state = { page: 0, sessionPage: 0, journeyPage: 0, search: '', visitors: [], sessions: [],
  visitor: null, session: null, listRequest: 0, sessionRequest: 0, journeyRequest: 0, busy: false };
const empty = (id, columns, message) => { $(id).innerHTML = `<tr><td colspan="${columns}" class="analytics-empty">${esc(message)}</td></tr>`; };

function pagination(prefix, page, total) {
  $(`${prefix}Previous`).disabled = page === 0;
  $(`${prefix}Next`).disabled = (page + 1) * PAGE_SIZE >= total;
  $(`${prefix}Page`).textContent = total ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${count(total)}` : '0 results';
}

function showError(error) {
  const missing = ['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code);
  $('visitorDetailsMessage').textContent = missing
    ? 'Visitor analytics needs its Supabase setup. Run the supplied setup SQL, then refresh.'
    : `Could not load visitor details. ${error?.message || 'Please try again.'}`;
  $('visitorDetailsMessage').classList.add('error');
  $('visitorDetailsSetup').hidden = !missing;
}

function clearJourney(message = 'Select a session to see its journey.') {
  state.session = null;
  state.journeyRequest++;
  $('analyticsSelectedSession').textContent = 'No session selected';
  empty('analyticsJourneyRows', 7, message);
  pagination('analyticsJourney', 0, 0);
}

function clearSessions() {
  state.visitor = null;
  state.sessions = [];
  state.sessionRequest++;
  $('analyticsSelectedVisitor').textContent = 'Select a visitor to see their sessions.';
  empty('analyticsSessionRows', 7, 'No visitor selected.');
  pagination('analyticsSessions', 0, 0);
  clearJourney();
}

async function loadJourney(session) {
  const request = ++state.journeyRequest;
  state.session = session;
  $('analyticsSelectedSession').textContent = `${date(session.started_at)} · ${session.id}`;
  document.querySelectorAll('[data-analytics-session]').forEach(button => {
    const active = button.dataset.analyticsSession === session.id;
    button.setAttribute('aria-pressed', String(active));
    button.closest('tr').classList.toggle('analytics-selected', active);
  });
  empty('analyticsJourneyRows', 7, 'Loading journey…');
  try {
    const { data, count: total, error } = await supabase.from('visitor_page_views').select('*', { count: 'exact' })
      .eq('session_id', session.id).order('entered_at').order('id')
      .range(state.journeyPage * PAGE_SIZE, (state.journeyPage + 1) * PAGE_SIZE - 1);
    if (request !== state.journeyRequest) return;
    if (error) throw error;
    $('analyticsJourneyRows').innerHTML = (data || []).map((view, index) => `<tr>
      <td>${state.journeyPage * PAGE_SIZE + index + 1}</td><td>${esc(view.previous_page || '—')}</td>
      <td><strong>${esc(view.page_name)}</strong><div class="analytics-url">${esc(view.page_key)}</div></td>
      <td>${date(view.entered_at)}</td><td>${view.left_at ? date(view.left_at) : `Last seen ${date(view.last_seen_at)}`}</td>
      <td>${duration(view.duration_seconds)}</td><td>${count(view.visit_number)}</td></tr>`).join('');
    if (!data?.length) empty('analyticsJourneyRows', 7, 'No page visits recorded for this session.');
    pagination('analyticsJourney', state.journeyPage, total || 0);
  } catch (error) {
    if (request !== state.journeyRequest) return;
    empty('analyticsJourneyRows', 7, 'Could not load this journey. Refresh to try again.');
    showError(error);
  }
}

async function loadSessions(visitor, preserve = false) {
  const request = ++state.sessionRequest;
  const selectedSessionId = preserve ? state.session?.id : null;
  state.visitor = visitor;
  $('analyticsSelectedVisitor').textContent = `${visitor.name} · ${visitor.phone}`;
  document.querySelectorAll('[data-analytics-visitor]').forEach(button => {
    const active = button.dataset.analyticsVisitor === visitor.id;
    button.setAttribute('aria-pressed', String(active));
    button.closest('tr').classList.toggle('analytics-selected', active);
  });
  clearJourney('Loading sessions…');
  empty('analyticsSessionRows', 7, 'Loading sessions…');
  try {
    const { data, count: total, error } = await supabase.from('visitor_sessions').select('*', { count: 'exact' })
      .eq('visitor_id', visitor.id).order('started_at', { ascending: false }).order('id')
      .range(state.sessionPage * PAGE_SIZE, (state.sessionPage + 1) * PAGE_SIZE - 1);
    if (request !== state.sessionRequest) return;
    if (error) throw error;
    state.sessions = data || [];
    $('analyticsSessionRows').innerHTML = state.sessions.map(session => `<tr>
      <td><code title="${esc(session.id)}">${esc(session.id.slice(0, 8))}</code></td>
      <td>${date(session.started_at)}</td><td>${date(session.last_activity)}</td>
      <td>${esc(session.landing_page)}</td><td>${esc(session.exit_page)}</td><td>${duration(session.duration_seconds)}</td>
      <td><button type="button" class="small-btn" data-analytics-session="${esc(session.id)}" aria-pressed="false">View journey</button></td></tr>`).join('');
    pagination('analyticsSessions', state.sessionPage, total || 0);
    const selected = state.sessions.find(session => session.id === selectedSessionId) || state.sessions[0];
    if (selected) {
      if (selected.id !== selectedSessionId) state.journeyPage = 0;
      await loadJourney(selected);
    } else {
      empty('analyticsSessionRows', 7, 'No tracked sessions yet. Journeys appear after this visitor browses the updated website.');
      clearJourney('No tracked sessions for this visitor.');
    }
  } catch (error) {
    if (request !== state.sessionRequest) return;
    empty('analyticsSessionRows', 7, 'Could not load sessions. Refresh to try again.');
    clearJourney();
    showError(error);
  }
}

export async function loadVisitorDetails() {
  const request = ++state.listRequest;
  state.busy = true;
  $('refreshVisitorDetails').disabled = true;
  $('visitorDetailsMessage').classList.remove('error');
  $('visitorDetailsMessage').textContent = 'Loading visitor details…';
  $('visitorDetailsSetup').hidden = true;
  try {
    let query = supabase.from('visitor_profiles').select('*', { count: 'exact' })
      .order('last_seen', { ascending: false }).order('id');
    const search = state.search.replace(/[,()%"\\]/g, '').trim();
    if (search) query = query.or(['name', 'phone', 'email', 'city'].map(column => `${column}.ilike.%${search}%`).join(','));
    const [profiles, summary] = await Promise.all([
      query.range(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE - 1),
      supabase.rpc('visitor_analytics_summary')
    ]);
    if (request !== state.listRequest) return;
    if (profiles.error) throw profiles.error;
    if (summary.error) throw summary.error;
    const metrics = summary.data || {};
    $('analyticsVisitors').textContent = count(metrics.visitors);
    $('analyticsReturning').textContent = count(metrics.returning_visitors);
    $('analyticsSessions').textContent = count(metrics.sessions);
    $('analyticsViews').textContent = count(metrics.page_views);
    $('analyticsAverage').textContent = duration(metrics.average_session_seconds);
    state.visitors = profiles.data || [];
    $('analyticsVisitorRows').innerHTML = state.visitors.map(visitor => `<tr>
      <td><strong>${esc(visitor.name)}</strong></td><td>${esc(visitor.phone)}</td><td>${esc(visitor.email || '—')}</td>
      <td>${esc(visitor.city || '—')}</td><td>${date(visitor.first_seen)}</td><td>${date(visitor.last_seen)}</td>
      <td>${count(visitor.total_sessions)}</td><td>${count(visitor.total_page_views)}</td>
      <td><button type="button" class="small-btn" data-analytics-visitor="${esc(visitor.id)}" aria-pressed="false">View sessions</button></td></tr>`).join('');
    if (!state.visitors.length) empty('analyticsVisitorRows', 9, state.search ? 'No visitors match your search.' : 'No visitors yet. Registered visitors will appear here as they browse.');
    pagination('analyticsVisitors', state.page, profiles.count || 0);
    $('visitorDetailsMessage').textContent = `Updated ${new Date().toLocaleTimeString()} · Refreshes every 30 seconds while this section is open.`;
    const selected = state.visitors.find(visitor => visitor.id === state.visitor?.id) || state.visitors[0];
    if (selected) {
      const preserve = selected.id === state.visitor?.id;
      if (!preserve) state.sessionPage = 0;
      await loadSessions(selected, preserve);
    } else clearSessions();
  } catch (error) {
    if (request !== state.listRequest) return;
    showError(error);
    if (!state.visitors.length) {
      empty('analyticsVisitorRows', 9, 'Visitor details are unavailable. See the message above.');
      clearSessions();
    }
  } finally {
    if (request === state.listRequest) {
      state.busy = false;
      $('refreshVisitorDetails').disabled = false;
    }
  }
}

export function initVisitorDetails() {
  $('refreshVisitorDetails').addEventListener('click', loadVisitorDetails);
  let searchTimer;
  $('visitorDetailsSearch').addEventListener('input', event => {
    state.search = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.page = 0; void loadVisitorDetails(); }, 250);
  });
  $('analyticsVisitorRows').addEventListener('click', event => {
    const button = event.target.closest('[data-analytics-visitor]');
    const visitor = state.visitors.find(row => row.id === button?.dataset.analyticsVisitor);
    if (visitor) { state.sessionPage = 0; state.journeyPage = 0; void loadSessions(visitor); }
  });
  $('analyticsSessionRows').addEventListener('click', event => {
    const button = event.target.closest('[data-analytics-session]');
    const session = state.sessions.find(row => row.id === button?.dataset.analyticsSession);
    if (session) { state.journeyPage = 0; void loadJourney(session); }
  });
  for (const [prefix, field, reload] of [
    ['analyticsVisitors', 'page', loadVisitorDetails],
    ['analyticsSessions', 'sessionPage', () => state.visitor && loadSessions(state.visitor)],
    ['analyticsJourney', 'journeyPage', () => state.session && loadJourney(state.session)]
  ]) {
    for (const [direction, change] of [['Previous', -1], ['Next', 1]]) {
      $(`${prefix}${direction}`).addEventListener('click', () => { state[field] = Math.max(0, state[field] + change); void reload(); });
    }
  }
  setInterval(() => {
    if (!state.busy && document.visibilityState === 'visible' && $('visitorDetails').classList.contains('active')) void loadVisitorDetails();
  }, 30000);
}
