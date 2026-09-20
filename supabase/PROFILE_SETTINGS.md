# Profile settings and review removal

Before deploying this change, run `20260920_profile_settings_review_removal.sql`
in the Supabase SQL editor for the same project used by the application. It is
also required after a fresh `schema.sql` installation. Do not run the full schema
again just to install this feature.

The migration adds `profiles.banner_url`, a public `profile-media` bucket with
owner-scoped upload/delete policies, and the transactional `delete_own_review`
function. Images are public profile content; only their owner can upload or
remove files in their folder. No service-role key is needed by these routes.

Visit `/settings/profile` while signed in, or choose Settings from the account
menu. Profile edits save the display name and optional image replacements.

Deleting a review removes its Watched entry by default. The confirmation offers
"Keep this movie in Watched". Favourites and wishlist membership are preserved.
The database function uses the authenticated user's ID, and both changes commit
or roll back together. Missing migration support returns an error instead of
silently performing a partial deletion.

Verify with a test account: upload and remove both images, save a name, view the
public profile, delete a test review with each checkbox setting, and confirm
other users' records are unaffected. Review submissions should close the editor
while the corner alert reports progress; failed saves preserve the draft.
