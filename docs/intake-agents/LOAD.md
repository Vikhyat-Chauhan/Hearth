# Phase D — Load the Spec into the Template

1. Set `APP_NAME` in `package.json`.
2. Populate `CLAUDE.md`: description, Backlog (P0→P1→P2), Tech Stack (or keep defaults),
   and any domain rules.
   - **DB line:** wait until `docs/DB_FORK.md` agent has written the DB decision to `CLAUDE.md`
     before filling that section. Do the non-DB fields first; add the DB line last.
