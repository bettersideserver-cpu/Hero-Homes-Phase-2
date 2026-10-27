# Visitor IP setup

The admin now shows the connection IP in Visitor Details → View sessions, alongside a Check location link. The link opens IPinfo for a manual approximate-location lookup. No location API token or paid lookup integration is required. IP is recorded per session; old visits show Unknown.

The code is ready but IP collection remains disabled until the server setup below is complete. Existing visitor tracking continues normally.

1. In the Hero Homes Supabase SQL Editor, run map/IPX/admin/sql/visitor-location.sql after the existing analytics setup.
2. Deploy supabase/functions/visitor-activity (both index.ts and handler.mjs). From this project directory with the Supabase CLI:

```powershell
supabase login
supabase functions deploy visitor-activity --project-ref lgsuzidpqnqgyqucrotx --no-verify-jwt
```

3. Production origins https://www.herohomesphase2.com and https://herohomesphase2.com are already configured. For a test domain, set the Supabase function secret ALLOWED_ORIGINS to a comma-separated list containing the test origin and both production origins. Include https://, with no path or trailing slash. Supabase supplies its server credentials automatically; never copy the service-role key into website code.
4. Set VISITOR_LOCATION_ENABLED = true in map/IPX/admin/js/config.js and upload the updated website files, including privacy.html.
5. Visit the hosted map in a new tab. In Admin → Visitor Details → View sessions, verify the IP and open Check location. IP location is approximate and may reflect a VPN or mobile network. The first connection IP is retained for each session.

The public analytics endpoint uses origin filtering, which does not guarantee bot-free data. It obtains IP from Supabase forwarding headers, not a browser-supplied JSON field. Confirm the captured IP against your test connection before launch.

Deleting the visitor also deletes the sessions containing their IP. The privacy notice explains IP collection. No OTP, CAPTCHA or automatic third-party geolocation is included.

If setup is incomplete, leave VISITOR_LOCATION_ENABLED false. No live database changes or deployments have been performed by these local edits.
