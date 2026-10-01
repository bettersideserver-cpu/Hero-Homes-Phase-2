# Visitor Details

The existing admin panel now includes **Visitor Details**, using the same Supabase project and login as Apartments, Visitors and Hold Requests. Connection settings remain in `js/config.js`.

## Activate in Supabase

1. Open the existing Hero Homes project in the [Supabase SQL Editor](https://supabase.com/dashboard/project/lgsuzidpqnqgyqucrotx/sql/new).
2. Run the complete contents of `sql/visitor-analytics.sql` once. It is transactional and safe to run again.
3. Deploy the updated Hero Homes website files together (exclude the development-only `tests` folder), then sign in to `admin/index.html` and open **Visitor Details**.
4. Register through the existing visitor form and browse a tower, floor and tour. Click **Refresh** in Visitor Details to see the profile, session and journey.

The public key in this project can send analytics once this SQL is installed; it cannot create database tables. No service-role key belongs in the website. If setup has not been run, Visitor Details displays a setup message and download link, and tracking queues events for retry.

## What is recorded

- One profile per normalized Indian phone number. A `+91` prefix and the matching 10-digit number identify the same visitor.
- Name, phone, email, city, first/last seen, session count and page-view count.
- Per-tab sessions continue across pages. Changing the visitor or returning after 30 minutes away starts another session.
- The landing page, latest/exit page, visible browsing time, ordered page journey and repeat-visit number.
- All 47 public HTML pages include the tracker. The three Typical tours also report room navigation, Garden View Balcony / Back Balcony and balcony floor changes.
- Tracking starts when a registered visitor profile is available. The existing registration form provides this identity; analytics does not add another form or record unidentified visitors.

Durations measure visible time rather than time spent in a background tab. A snapshot is sent every 15 seconds and on navigation/hiding. Browser termination can lose the final seconds. Up to 200 pending page snapshots are retained in session storage and retried in that tab. Closing a tab can discard unsent snapshots.

Existing `visitors` registrations are imported into the profile list by the setup SQL, grouped by phone. Their old journeys cannot be reconstructed: they show zero tracked sessions until the visitor browses the updated site. Demo records in `visitor-analytics-local-profile` are not imported or changed.

## Data and access

New tables: `visitor_profiles`, `visitor_sessions`, `visitor_page_views`.

`record_visitor_activity` is a write-only RPC with validation and idempotent page/session identifiers. Anonymous visitors cannot select, update or delete these tables directly. Logged-in Supabase users can read them, matching the existing dashboard's authentication model. `visitor_analytics_summary` is available only to authenticated users. As with the existing admin, only trusted admins should have Supabase Auth accounts in this project.

The existing `visitors`, `hold_requests`, apartments and statuses are preserved. Lead-capture scripts now announce successful registration to the tracker. The legacy floor hold form shares the same session visitor profile and correctly handles Supabase's empty `return=minimal` response.

The new SQL follows the Supabase guidance for [database function permissions](https://supabase.com/docs/guides/database/functions) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Local verification

From the `Hero Homes/tests` directory run `npm ci`, then `npm test`. Tests use an isolated PostgreSQL runtime and a DOM fixture; they never write test visitors to the live Supabase project. They cover schema installation, migration re-runs, identity, session/page retries, monotonic timing, access permissions, background time, session timeout, room/balcony tracking, UI selection, escaping, empty states and script links.

For a browser preview with clearly fictional data, run `node preview-server.mjs` in that directory and open `http://127.0.0.1:8765/preview/map/IPX/admin/index.html`. This preview substitutes a local Supabase fixture; it does not verify that the live SQL has been installed.
