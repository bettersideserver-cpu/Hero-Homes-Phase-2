Hero Homes dynamic apartment status

1. Run HERO_HOMES_PUBLIC_STATUS_REFRESH.sql in Supabase SQL Editor.
2. Replace the Subpages folder with this one.
3. Floor selection now uses data-name (for example 9_Floor_10), not the SVG id.
4. Floor pages read ?floor=10 and poll the public Supabase view every 3 seconds.
5. Public view exposes only tower/floor/unit/status/status_color.
