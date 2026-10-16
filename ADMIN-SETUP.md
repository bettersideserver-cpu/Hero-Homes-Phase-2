# Admin access and visitor deletion

Upload this folder's contents to your website root. Open `https://your-domain.com/admin.html` to reach the existing admin panel. It redirects to the internal dashboard and requires the existing login.

Before using the new Visitor Details delete buttons, run `map/IPX/admin/sql/visitor-delete.sql` in your existing Supabase project's SQL Editor. For a new analytics installation, run `map/IPX/admin/sql/visitor-analytics.sql` instead; it includes these permissions.

In **Visitor Details**, click **Delete** beside a visitor and confirm. This removes that profile, its sessions, and page history. Registration records in **Visitors** are separate; use its existing checkboxes and **Delete Selected** button to remove those records.

Deletion removes currently stored history. A visitor who continues browsing can produce new analytics records.

Use **Delete All Visitor Details** to reset every profile, session, and page view, including visitors outside the current search, filter, or page. Confirm the prompt to proceed. Re-run the updated `map/IPX/admin/sql/visitor-delete.sql` to enable this action on an existing installation. The separate Visitors registration list is still managed with its own deletion controls.

The SQL follows the existing dashboard's access model: authenticated accounts can manage visitor details; anonymous website users cannot delete them.
