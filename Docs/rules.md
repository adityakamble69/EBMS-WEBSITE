# rules.md — What to do / what to avoid

Applies to any human or AI contributor touching this codebase (frontend HTML/CSS/JS or Apps Script backend).

---

## ✅ Always do

1. **Server-side auth on every non-public route.** Call `verifyToken(token)` or `checkPermission(token, [roles])` at the top of every handler — never trust that the frontend hid a button.
2. **Whitelist new employee-facing actions explicitly.** Add the action name to `EMPLOYEE_ALLOWED_GET_ACTIONS` / `EMPLOYEE_ALLOWED_POST_ACTIONS` in `appscript_main.gs`. Default is fail-closed (403) — this is intentional, don't "fix" a 403 by loosening the router instead of the whitelist.
3. **Scope by branch** with `canAccessBranch(session, targetBranchId)` for any non-super_admin/hr role that shouldn't see all branches.
4. **Format every date/time field before sending it in a response.** Use `formatDateOnly()` for date-only columns and `formatTimeOnly()` for time-only columns, applied in the final `Object.assign()`/`.map()` right before `sendSuccess()`. Never let a raw Sheets `Date` object hit `JSON.stringify()`.
5. **Generate IDs with `generateId(prefix)`** (`appscript_generateid_fix.gs`). If you add a new sheet/entity, add its prefix to `ID_PREFIX_SHEET_MAP`.
6. **Strip passwords before sending any user/employee object to the frontend** — `delete clone.password` pattern, used consistently in `appscript_auth.gs` / `appscript_employees.gs`. Apply the same pattern to any new sensitive field.
7. **Make sheet-schema changes additive and idempotent.** Follow the `addColumnIfMissing()` pattern (`appscript_instructions.gs`) or the `migrateNotificationsAddColumns()` pattern (`appscript_notifications.gs`) — check for existing columns/format before writing, never assume a fresh sheet.
8. **Fire-and-forget side effects** (activity logging, notifications) must never throw and break the primary transaction — wrap in try/catch with a silent fail, matching `logActivity()` / `notifyUser()`.
9. **Keep `README.md` in sync** — new sheet columns, new API actions, new roles/permissions, new pages all get an entry there. It is the single source of truth for schema + API surface; `architecture.md` intentionally doesn't duplicate it.
10. **Use the existing CSS variable system** (`--bg-*`, `--accent*`, `--text-*`, `--radius-*`, `--shadow-*` in `style.css`) for any new UI — don't hardcode hex colors in new markup. See `design.md`.
11. **One handler per action, named `handle<Verb><Noun>`**, matching the existing convention (`handleGetEmployees`, `handleAddTaskRoute`, `handleApproveLeave`, etc.) — keeps `doGet`/`doPost` switch statements scannable.
12. **Update `memory.md`** at the end of any working session — what changed, what file, what's next.

---

## 🚫 Never do

1. **Never introduce a second `generateId()` function.** There is exactly one, in `appscript_generateid_fix.gs`. Duplicate function names across `.gs` files silently shadow each other in Apps Script — this caused a historical bug (see that file's header comment).
2. **Never reintroduce a `users` sheet.** It was deliberately removed. Admin logins live in `admin_users`; employee logins live directly on `employees`. Don't "simplify" by merging them back.
3. **Never trust `body.emp_id` / `e.parameter.emp_id` as identity proof** for a token-based (non-self-punch) route — always resolve the acting employee from `session.employee_id`, and only let admin roles pass an explicit `emp_id` to act on someone else's behalf.
4. **Never expose the `password` field** in any GET response, log, or notification message.
5. **Never do destructive sheet operations** (`clearContents()`, `deleteSheet()`) outside of an explicit, clearly-labelled, one-time migration function that's safe to re-run (idempotent) — see `migrateSalariesSheetToDetailedModel()` as the reference pattern (checks for new-format header before touching anything).
6. **Never send a raw JS `Date` object in an API response.** This breaks on the frontend due to the pre-1900 Google Sheets timezone quirk documented in `appscript_main.gs` (`formatTimeOnly`/`formatDateOnly` header comments). Always format first.
7. **Never widen the Self-Punch actions list** (`SELF_PUNCH_GET_ACTIONS` / `SELF_PUNCH_POST_ACTIONS`) casually — these are public, tokenless routes. Any new entry there is a new unauthenticated attack surface; the only real protection is the GPS geofence, so think carefully before adding to it.
8. **Never hardcode onboarding/instructional copy in the frontend.** That content belongs in the `instructions` sheet (see `appscript_instructions.gs`) — the whole point of that module is code-free content edits.
9. **Never bypass the branch scoping helpers** by writing ad-hoc `if (session.role !== 'super_admin')` branch filters inline when `canAccessBranch()` already exists — keep the access-control logic centralized so it's auditable in one place.
10. **Never assume Apps Script file paste order matters** for correctness, but also never assume it's *fully* irrelevant — global function name collisions are real; grep before adding a new top-level function name.

---

## ✅ Always do (Phase 11 additions — see `PRD.md` §7)

13. **Resolve codes to names server-side, always.** Any response containing `department_id`, `designation_id`, `branch_id`, etc. must also resolve and include the human-readable name (or replace the code entirely) before it leaves the API — never make the frontend do a second lookup, and never let a raw internal code reach the UI.
14. **Business-tunable numbers live in the `settings` sheet, not in code.** Annual leave count, probation/leave-lock days, monthly targets, and any future "the business will want to change this without a deploy" value must be read via a `getSetting(key)` helper backed by the `settings` sheet — never a hardcoded constant in a `.gs` file or frontend JS.
15. **Enforce time-based business rules server-side.** E.g. the new-employee 30-day leave lock must be checked inside `handleApplyLeave()` itself (`today - joining_date >= NEW_EMPLOYEE_LEAVE_LOCK_DAYS`), not just via a disabled frontend button.
16. **No hard deletes for candidates (and prefer this everywhere else too).** Use status transitions + `is_archived`/`archived_at`/`archived_by` soft-delete fields instead of `sheet.deleteRow()`. HR role must never be given a delete action for candidates; this is a role-permission rule, not just a UI omission.

## 🚫 Never do (Phase 11 additions)

11. **Never confuse the admin-assigned Kanban `tasks` sheet with the employee-authored `daily_tasks` module** (Phase 11) — they have different authorship/permission models (admin-assigned-down vs employee-logged-up-for-approval). Don't merge their schemas or handlers without an explicit decision documented in `PRD.md`.
12. **Never let HR (or any non-super_admin role) delete a candidate record**, physically or via an exposed "delete" action — archive only.

---

## Frontend-specific rules

- No build step, no bundler, no framework — keep it plain HTML/CSS/vanilla JS to match the rest of the project. Don't introduce React/Vue/etc. into this codebase without an explicit, discussed architecture change.
- All pages share `app.js` (`API_URL`, `AppSession`) and `style.css` (design tokens) — link both on any new page rather than duplicating logic/styles inline.
- Use `fetchWithLoader()` (see `app.js`) for the initial data load of a page so the global loading overlay behaves consistently; leave plain `fetch()` for per-button "Saving..." interactions so you don't get a double-overlay.
- Match the existing dark glassmorphism visual language — see `design.md`.
