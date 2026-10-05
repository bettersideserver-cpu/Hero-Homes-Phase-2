// Fictional browser-preview data. This file is never imported by the real dashboard.
const now = Date.now();
const at = minutes => new Date(now - minutes * 60000).toISOString();
const records = {
  status_categories: [{ id: 1, name: 'Available', color: '#22c55e', active: true }],
  apartments: [], visitors: [], hold_requests: [],
  visitor_profiles: [
    { id: 'v1', name: 'Demo Visitor A', is_registered: true, phone: '9000000001', email: 'visitor-a@example.com', city: 'Chandigarh', first_seen: at(3000), last_seen: at(1), total_sessions: 2, total_page_views: 6 },
    { id: '82d954ee-82cb-47f6-a16e-bf98cb081e75', name: '82d954ee-82cb-47f6-a16e-bf98cb081e75', is_registered: false, phone: null, email: '', city: '', first_seen: at(60), last_seen: at(50), total_sessions: 1, total_page_views: 2 },
    { id: 'v3', name: 'Demo Registration Only', is_registered: true, phone: '9000000003', email: '', city: 'Ludhiana', first_seen: at(150), last_seen: at(150), total_sessions: 0, total_page_views: 0 }
  ],
  visitor_sessions: [
    { id: 'session-a-2', visitor_id: 'v1', started_at: at(12), last_activity: at(1), landing_page: 'Master Plan', exit_page: 'Tower 9 · Garden View Balcony', duration_seconds: 420 },
    { id: 'session-a-1', visitor_id: 'v1', started_at: at(3000), last_activity: at(2995), landing_page: 'Master Plan', exit_page: 'Tower 10 · Floor 12', duration_seconds: 300 },
    { id: 'session-b-1', visitor_id: '82d954ee-82cb-47f6-a16e-bf98cb081e75', started_at: at(60), last_activity: at(50), landing_page: 'Master Plan', exit_page: 'Tower 12A', duration_seconds: 600 }
  ],
  visitor_page_views: [
    { id: 'p1', session_id: 'session-a-2', page_name: 'Master Plan', page_key: 'map/index.html', previous_page: '', entered_at: at(12), left_at: at(11), duration_seconds: 60, visit_number: 2 },
    { id: 'p2', session_id: 'session-a-2', page_name: 'Tower 9 · Floor 12', page_key: 'Tower-9.html?tower=9&floor=12', previous_page: 'Master Plan', entered_at: at(11), left_at: at(9), duration_seconds: 120, visit_number: 1 },
    { id: 'p3', session_id: 'session-a-2', page_name: 'Tower 9 · Back Balcony', page_key: 'Typical.html?room=balcony&balconyType=B&balconyFloor=10', previous_page: 'Tower 9 · Floor 12', entered_at: at(9), left_at: at(7), duration_seconds: 120, visit_number: 1 },
    { id: 'p4', session_id: 'session-a-2', page_name: 'Tower 9 · Garden View Balcony', page_key: 'Typical.html?room=balcony&balconyType=F&balconyFloor=10', previous_page: 'Tower 9 · Back Balcony', entered_at: at(7), last_seen_at: at(1), duration_seconds: 120, visit_number: 1 }
  ]
};
export const supabase = {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'fixture-only' } } } }), signOut: async () => ({}) },
  rpc: async () => ({ data: { visitors: 3, returning_visitors: 1, sessions: 3, page_views: 8, average_session_seconds: 440 } }),
  from(table) {
    let rows = [...(records[table] || [])], start = 0, end = Infinity;
    return {
      select() { return this; }, order() { return this; },
      eq(column, value) { rows = rows.filter(row => row[column] === value); return this; },
      or(filter) {
        const term = filter.split('.ilike.%')[1]?.split('%')[0]?.toLowerCase() || '';
        rows = rows.filter(row => ['id', 'name', 'phone', 'email', 'city'].some(key => String(row[key] || '').toLowerCase().includes(term)));
        return this;
      },
      range(from, to) { start = from; end = to; return this; },
      then(resolve) { return Promise.resolve({ data: rows.slice(start, end + 1), count: rows.length, error: null }).then(resolve); }
    };
  }
};
