<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- EventHub uses a demo access mode (role + sample student chosen in the header, kept in localStorage) instead of real auth; DB tables allow anon access via RLS. Why: the brief requires no login for the college demo — swap to real auth + role table before production.
- Registration rules (capacity, deadline, cancelled events, duplicates) are enforced in the database trigger/unique index, and mirrored in `eventStatus` for display. Why: the DB is the source of truth even with open demo access.
