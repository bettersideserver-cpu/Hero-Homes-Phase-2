# Visitor Details

The existing admin panel now includes **Visitor Details**, using the same Supabase project and login as Apartments, Visitors and Hold Requests. Connection settings remain in `js/config.js`.

## Activate in Supabase

1. Open the existing Hero Homes project in the [Supabase SQL Editor](https://supabase.com/dashboard/project/lgsuzidpqnqgyqucrotx/sql/new).
2. Run the complete contents of `sql/visitor-analytics.sql` once. It is transactional and safe to run again.
3. Deploy the updated Hero Homes website files together (exclude the development-only `tests` folder), then sign in to `admin/index.html` and open **Visitor Details**.
4. Open `map/index.html` or `map/index copy.html` and browse a tower, floor and tour. Before registration, **Visitor Details** shows the visitor's unique ID as their name. Submit the form on a Typical tour to attach their name, phone, email and city to the same ID and journey.

Existing installations must also run this updated SQL before deploying the updated scripts. It allows profiles without phone numbers, adds registration status, and preserves existing profile IDs, sessions and journeys. Run the whole file, including the function updates.

The public key in this project can send analytics once this SQL is installed; it cannot create database tables. No service-role key belongs in the website. If setup has not been run, Visitor Details displays a setup message and download link, and tracking queues events for retry.

## What is recorded

- A unique UUID is assigned as soon as a visitor enters the map area. It is stored in session storage and follows that browser tab across the map, towers, floors and tours. A new browser session gets a new ID; separate browsers are not merged by phone number.
- Until the visitor submits the form, their name in Visitor Details is that UUID. Registration attaches name, normalized phone, email and city to the same profile without starting a new session or losing earlier page views. First/last seen, session count and page-view count are recorded for both kinds of visitor.
- **All visitors**, **Registered users** and **Non-registered users** filters apply to the paginated visitor list and combine with search. Summary cards continue to cover all visitors. Search accepts names, visitor IDs, phones, emails and cities (use the full UUID to find a registered visitor by ID).
- Per-tab sessions continue across pages. Returning after 30 minutes away starts another session for the same visitor ID. Changing the saved registered person, or resetting their registration, starts another visitor identity.
- The landing page, latest/exit page, visible browsing time, ordered page journey and repeat-visit number.
- The 46 public HTML pages in `map/` include the tracker. The top-level `index.html` and all admin pages do not record or send visitor activity, so traffic that only reaches the home page does not appear in Visitor Details. Direct links into the map area start a journey at the linked page.
- The existing registration form opens on `map/IPX/Subpages/9-12-Typical/Typical.html`, `map/IPX/Subpages/Tower-10-12/360/Typical.html` and `map/IPX/Subpages/Tower-B/360/Typical.html`. Neither map landing page prompts for registration. Registered visitors can continue through the other Typical tours without another prompt in that tab.
- The three Typical tours also report room navigation, Garden View Balcony / Back Balcony and balcony floor changes. Visitors who leave before submitting the form remain non-registered.

Durations measure visible time rather than time spent in a background tab. A snapshot is sent every 15 seconds and on navigation/hiding. Browser termination can lose the final seconds. Up to 200 pending page snapshots are retained in session storage and retried in that tab. Closing a tab can discard unsent snapshots.

Existing `visitors` registrations are imported into the profile list as registered visitors, grouped by phone, unless that phone already has a profile. Their old journeys cannot be reconstructed. Historical phone-based profiles remain available; new browser IDs create their own histories, even when the same phone is submitted. Older deployed tracker clients remain compatible during rollout. Demo records in `visitor-analytics-local-profile` are not imported or changed.

## Data and access

New tables: `visitor_profiles`, `visitor_sessions`, `visitor_page_views`.

`record_visitor_activity` is a write-only RPC with validation and idempotent page/session identifiers. Anonymous visitors cannot select, update or delete these tables directly. Logged-in Supabase users can read them, matching the existing dashboard's authentication model. `visitor_analytics_summary` is available only to authenticated users. As with the existing admin, only trusted admins should have Supabase Auth accounts in this project.

The existing `visitors`, `hold_requests`, apartments and statuses are preserved. Lead-capture scripts now announce successful registration to the tracker. The legacy floor hold form shares the same session visitor profile and correctly handles Supabase's empty `return=minimal` response.

The new SQL follows the Supabase guidance for [database function permissions](https://supabase.com/docs/guides/database/functions) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Local verification

From the `Hero Homes/tests` directory run `npm ci`, then `npm test`. In environments that block child processes, use `node --test --test-isolation=none visitor-analytics.test.mjs`. Tests use an isolated PostgreSQL runtime and a DOM fixture; they never write test visitors to the live Supabase project. They cover fresh and existing schema upgrades, migration re-runs, anonymous-to-registered identity, delayed anonymous retries, form failures and success, session/page retries, monotonic timing, access permissions, background time, session timeout, room/balcony tracking, registration filters, UI selection, escaping, empty states and script links.

For a browser preview with clearly fictional data, run `node preview-server.mjs` in that directory and open `http://127.0.0.1:8765/preview/map/IPX/admin/index.html`. This preview substitutes a local Supabase fixture; it does not verify that the live SQL has been installed.
