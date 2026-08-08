# memory.md — Working Memory / Session Log

Purpose: a running log so any contributor (human or AI) picking up this project mid-stream knows **what's done, what's in progress, and what file was last touched** — without re-reading the whole codebase.

> Rule: update this file at the **end of every work session**, even a short one. Newest entry on top.

---

## Session log

### [2026-08-08] — §7.8 scope correction: HR targets, not employee targets — full rebuild
**What was done:**
- User caught a real requirement misread in the earlier same-day §7.8 build: monthly admission targets are supposed to be assigned **to HR** ("Admin gives HR a target — get this many admissions this month"), not to individual employees. The original `employee_targets` sheet / `appscript_employee_targets.gs` / `targets_admin.html` build was wrong at the schema level, not just a UI tweak.
- User uploaded the relevant files for context: `appscript_employee_targets.gs` (old, to replace), `targets_admin.html` (old, to replace), `appscript_main.gs` (router/whitelist/SHEETS reference), `appscript_admissions.gs` (`admission_leads` schema — the `achieved_target` computation source), `appscript_settings.gs` (`MONTHLY_ADMISSION_TARGET` default lookup).
- **Rebuilt the module around the corrected model:**
  - New sheet `hr_targets` (`target_id | hr_id | hr_name | target_month | target_year | assigned_target | achieved_target | status | created_by | created_at | updated_at`) — `hr_id` references `admin_users.user_id` where `role === 'hr'`, validated at assign time.
  - New backend `appscript_hr_targets.gs`: `getHrTargets` (GET — `super_admin` sees all with optional `?hr_id=` filter, `hr` sees only their own, enforced in-handler), `assignHrTarget` (POST, **super_admin only** — HR cannot self-assign), `updateHrTarget` (POST, super_admin only), `setupHrTargetsSheet()`, plus a `deactivateLegacyEmployeeTargets()` migration helper (flips old sheet's rows to `inactive` without deleting the sheet — rules.md #5).
  - Rebuilt `targets_admin.html`: HR picker (sourced from `getAdminUsers`, client-filtered to `role === 'hr'`) replaces the old employee picker; assign/edit controls (button, actions column, modal) hidden entirely for `hr` role viewers — they get a read-only banner and see only their own target row(s); `super_admin` retains full assign/edit.
  - New `hr_targets_wiring_patch.md` — exact `appscript_main.gs` edits (SHEETS map swap, `EMPLOYEE_ALLOWED_GET_ACTIONS` line removal, `doGet`/`doPost` switch-case swaps) and the `appscript_generateid_fix.gs` prefix-map swap (`'TG'` → `'HT'`), since neither of those two files was fully available/needed a full rewrite this session — instructions given for applying directly.
- **Flagged, not fixed:** `achieved_target`'s live computation matches `admission_leads.assigned_to` against the target's `hr_id`. This only works if `admission_leads` rows actually get `assigned_to` set to an HR's `user_id`. `admissions.html` (its "Assigned To" field) wasn't part of this session's file set, so it's unconfirmed whether that field currently points at HR users or still lists employees (a leftover assumption from the old model). **This is a blocking dependency for §7.8's real-world correctness**, not just a nice-to-have — documented prominently in the wiring patch, `PRD.md`, `phases.md`, and `README.md`.
- Also flagged: `appscript_reports.gs`'s "target performance" report type (§7.9) was built against the old `employee_targets` schema — needs re-checking against `hr_targets`'s new column names before its numbers can be trusted. Not touched this session.
- Updated `PRD.md` (§7.8 rewritten + priority summary), `phases.md` (Phase 11 bullet rewritten + remaining-work list item updated), `README.md` (§2 schema table, §3 backend files table, §5 API table, §7 frontend pages table, footer date-stamp — all four `employee_targets`/`appscript_employee_targets.gs`/`targets_admin.html` references updated), `architecture.md` (§4's stale `employee_targets` row corrected — it had never been updated since the module was "not yet built").

**File(s) touched:**
- **New:** `appscript_hr_targets.gs`, `targets_admin.html` (full rewrite, same filename), `hr_targets_wiring_patch.md`.
- **Retired (left in place, not deleted):** `appscript_employee_targets.gs`, old `employee_targets` sheet (data preserved, rows flippable to `inactive` via the new migration helper).
- **Docs:** `PRD.md`, `phases.md`, `README.md`, `architecture.md`, `memory.md` (this entry).
- **Not touched, needs follow-up:** live `appscript_main.gs` (patch not yet applied — see `hr_targets_wiring_patch.md`), live `appscript_generateid_fix.gs` (prefix swap not yet applied), `admissions.html` (Assigned-To field not yet checked/fixed), `appscript_reports.gs` (target-performance report type not yet re-checked against the new schema).

**Currently being worked on / left mid-flight:**
- The new HR-targets code exists but hasn't been wired into the live Apps Script project yet — `hr_targets_wiring_patch.md`'s edits are pending application.
- `admissions.html`'s "Assigned To" field is the real blocker for `achieved_target` ever showing a non-zero number — needs to be uploaded/checked next.

**Next suggested step:**
1. Apply `hr_targets_wiring_patch.md` to the live `appscript_main.gs` + `appscript_generateid_fix.gs`, then run `setupHrTargetsSheet()` from the Apps Script editor.
2. Upload `admissions.html` so its "Assigned To" field can be checked and, if needed, changed to list HR users (`getAdminUsers`, `role === 'hr'`) instead of employees — this closes the blocking dependency flagged above.
3. Once both of those are done, click-test: assign a target to an HR, mark a lead `Admission Completed` with `assigned_to` set to that HR, confirm `achieved_target` picks it up live.
4. Separately: `appscript_reports.gs`'s target-performance report type needs a quick re-check against the new `hr_targets` column names (`hr_id`/`hr_name` instead of `employee_id`).

---

### [2026-08-08] — Admission Leads (§7.10/§7.11) real click-test done and passed — module fully closed
**What was done:**
- User performed the outstanding real click-test through the live `admissions.html` UI (the one soft item flagged as open since the 2026-08-03 session): added a test lead, confirmed it landed correctly in the live Sheet with a valid `LD001`-style ID, then archived it and confirmed the soft-delete fields (`is_archived`/`archived_at`/`archived_by`) populated correctly.
- **Result: pass.** This closes the last open item on §7.10/§7.11 — the module was already code-verified (2026-08-03) and is now also live-verified end-to-end.
- Updated `PRD.md` (§7.10/§7.11 status note + priority summary line) and `phases.md` (Phase 11 admission leads bullet + removed the item from the "remaining work" list) to reflect this.

**File(s) touched:**
- **Docs only:** `PRD.md`, `phases.md`, `memory.md` (this entry). No application code changed — this was a live-verification session, not a code session.

**Currently being worked on / left mid-flight:**
- Nothing new. Remaining open items, all from earlier sessions: Employee Targets live-sheet setup-function confirmation + click-test, Reports live click-test (all 7 report types), Daily Tasks setup-function confirmation.

**Next suggested step:**
1. Pick up one of the remaining live click-tests next — Employee Targets (`targets_admin.html`, confirm `setupEmployeeTargetsSheet()` has run, then assign → verify live-recompute-on-admission-completion) or Reports (`reports.html`, run all 7 report types against real data, spot-check numbers, confirm CSV export opens cleanly).
2. With Admission Leads now fully closed, `employee_targets`'s dependency on `admission_leads` (status=`Admission Completed` as the "Achieved" signal) can be click-tested with full confidence that the upstream data source is solid.

---

### [2026-08-08] — §7.1 fully closed: getEmployees bulk name-resolve confirmed via direct code review
**What was done:**
- User uploaded the live `appscript_employees.gs` (previously the file wasn't available this session, so the prior session's ⚠️ caveat on §7.1 couldn't be checked).
- Direct code review confirms `handleGetEmployees()` (the list route) **does** call `resolveEmployeeDisplayNamesBulk(employees)` — right after the password-strip/date-format `.map()` and *before* pagination — so every row in the paginated response carries `department_name`/`designation_name`/`branch_name`. `resolveEmployeeDisplayNamesBulk()` itself builds the `departments`/`designations`/`branches` lookup maps once (not per-row, avoiding an O(n×m) scan) and falls back safely to the raw code (or `'—'`/`'Staff'`) if no match is found — never throws.
- Same pattern (`resolveEmployeeDisplayNames`, singular) also confirmed wired into `handleGetEmployee()` (both session and self-punch paths), `handleGetProfile()`, and `handleAddEmployee()`'s response echo.
- **Net result:** the previously-open question from the 2026-08-08 (earlier same-day) session entry — "not yet confirmed whether `getEmployees` actually attaches these fields" — is now closed. `employees.html`'s frontend fix (from that same earlier session) will correctly display real names, not fall back to raw codes.
- Updated `PRD.md` (§7.1 status header + priority summary line) and `phases.md` (Phase 11 bullet + removed the item from the "remaining work" list) to reflect this. Updated `README.md` (§3 backend files table row for `appscript_employees.gs`, footer date-stamp) this session too.

**File(s) touched:**
- **Docs only:** `PRD.md`, `phases.md`, `README.md`, `memory.md` (this entry). No application code changed — this was a verification-only session (code was reviewed, not edited, since it was already correct).

**Currently being worked on / left mid-flight:**
- Nothing new. Pre-existing open items are unchanged: Admission Leads real click-test, Daily Tasks / Employee Targets live-sheet setup-function confirmation, Reports live click-test (all still outstanding from earlier sessions).

**Next suggested step:**
1. Pick up one of the still-outstanding live click-tests (Admission Leads, Employee Targets, Reports, Daily Tasks setup-function) since all remaining Phase 11 backend-wiring code questions are now resolved — what's left is verification against the live Spreadsheet, not more code review.
2. `architecture.md` §4 could also get a one-line confirmation note added next to its `employee_targets`/`admission_leads` table if useful, though it's not strictly required since `README.md` is the canonical schema source.

---

### [2026-08-03] — README.md sync gap fixed (Admission Leads module was missing from docs)
**What was done:**
- Audited `memory.md`, `phases.md`, and `README.md` together and found `README.md` had **not** been updated after the previous session's Admission Leads (§7.10/§7.11) work landed — a `rules.md` #9 / `PRD.md` §5 violation (module was `[x]` in `phases.md` but absent from README's schema table, backend file list, frontend page list, and API table).
- Updated `README.md`:
  - §2 (Sheet schema): added `admission_leads` row (full 17-column schema, status lifecycle, soft-delete note, ⚠️ click-test-outstanding caveat carried over from `memory.md`).
  - §3 (Backend files): added `appscript_admissions.gs` row.
  - §5 (API reference): added an "Admission Leads (Phase 11 §7.10/§7.11)" row with all 5 actions.
  - §7 (Frontend pages): added `admissions.html` row.
  - Footer summary line: extended to mention the 2026-08-03 Admission Leads shipment alongside the existing 2026-08-02 Daily Tasks mention.
- **No application code (`.gs`/`.html`) touched** — docs-sync-only session.

**File(s) touched:**
- **Edited:** `README.md` (docs only).
- **Docs:** `memory.md` (this entry).

**Currently being worked on / left mid-flight:**
- Nothing new. The pre-existing open item is unchanged: **no real lead has been added through the `admissions.html` UI yet** to confirm the full request→Apps Script→Sheet round-trip (see previous entry below).

**Next suggested step:**
1. Do the real click-test (carried over, still outstanding): log in as HR/admin, add one test lead via `admissions.html`, confirm it lands in the live Sheet with a valid `LD001`-style ID, then archive it and confirm soft-delete fields populate. After that, §7.10/§7.11 is airtight end-to-end, not just code-verified.
2. Move on to Medium Priority Phase 11 items in order: **§7.8 Employee target tracking** (`employee_targets` sheet — will likely link to `admission_leads` with `status='Admission Completed'` as "Achieved"), then **§7.9 HR month-wise reports**.

---

### [2026-08-03] — Phase 11 §7.10/§7.11 Admission Leads: backend wiring confirmed live, module fully shipped
**What was done:**
- User provided the live `appscript_main.gs`, `appscript_generateid_fix.gs`, and `appscript_admissions.gs` files (previously the last session could only infer these were patched — this session had direct access to verify).
- Confirmed by direct review that all backend wiring flagged as pending in the previous session's `memory.md` entry is actually already live:
  - `appscript_main.gs`: `SHEETS.ADMISSION_LEADS: 'admission_leads'` present; `doGet` has the `getAdmissionLeads` case; `doPost` has `addAdmissionLead`/`updateAdmissionLead`/`updateAdmissionLeadStatus`/`archiveAdmissionLead` cases — all wired correctly.
  - `appscript_generateid_fix.gs`: `'LD': 'admission_leads'` present in `ID_PREFIX_SHEET_MAP`.
- User then provided `admissions.html`, `hr_dashboard.html`, `app.js`, `sidebar.html`, and a CSV export of the live `admission_leads` Google Sheet tab. Verified:
  - CSV export confirms `setupAdmissionLeadsSheet()` has been run — the live sheet has the correct 17-column header row (`lead_id, name, mobile, email, course_interested, source, branch_id, status, remark, follow_up_date, assigned_to, is_archived, archived_at, archived_by, created_by, created_at, updated_at`). No data rows yet (no lead added through the UI so far).
  - `hr_dashboard.html`: navbar link (`🎓 Admissions`) and quick-action card (`Manage Admission Leads`) both present, pointing at `admissions.html`.
  - `app.js`: `HR_ALLOWED_PAGES` includes `'admissions.html'`.
  - `sidebar.html`: nav item present under the "Management" section, right under Recruitment.
  - `admissions.html`: HR-standalone/admin-sidebar dual-mode block present and correctly wired (`hr-standalone-mode` class toggle based on `u.role === 'hr'`, `AppSession.protect()` called at the bottom).
- **Net result: the entire Admission Leads module (§7.10/§7.11) is now confirmed fully live** — backend, frontend, and the underlying Sheet are all in place. Updated `phases.md` (flipped both checkboxes to `[x]`) and `PRD.md` (§7.10/§7.11 status notes + priority summary line) to reflect this.

**File(s) touched:**
- **Docs only:** `phases.md`, `PRD.md`, `memory.md` (this entry). No application code changed this session — this was a verification-only session.

**Currently being worked on / left mid-flight:**
- Nothing code-wise. One soft item remains: **no real lead has been added through the `admissions.html` UI yet** to confirm the full request→Apps Script→Sheet round-trip actually works end-to-end (the CSV only proves the sheet+header exist, not that a live `addAdmissionLead` call succeeds). Recommended before treating this as 100% closed.

**Next suggested step:** 
1. Do one real click-test: log in as HR (or admin), go to `admissions.html`, add one test lead, confirm it appears correctly in the live Sheet with a valid `LD001`-style ID, then archive it and confirm the soft-delete fields populate correctly. After that, §7.10/§7.11 can be considered airtight, not just code-verified.
2. Move on to **medium priority** Phase 11 items (`phases.md`), in order:
   - **§7.8 — Employee target tracking** (`employee_targets` sheet, Assigned/Achieved/Remaining/Progress %) — per `PRD.md`, this will likely link to `admission_leads` with `status='Admission Completed'` as the "Achieved" count, so do this next since the admission leads module it depends on is now confirmed live.
   - **§7.9 — HR Dashboard month-wise reports** (filters: month/year/department/employee/report type; optional PDF/CSV export + print).

---

### [2026-08-02] — Phase 11 §7.10/§7.11 Admission Leads: frontend wiring fully verified + completed
**What was done:**
- Followed up on the previous session's flagged gap: `app.js`, `daily_tasks_admin.html`, and `sidebar.html` weren't available when `admissions_frontend_patch.md` was written, so its `app.js`/`sidebar.html` snippets were inferred, not copied. All three files (plus the real `admissions.html`) were reviewed this session.
- **`hr_dashboard.html`** — checked against `admissions_frontend_patch.md` steps 1–2: the navbar link (`🎓 Admissions`) and quick-actions card (`Manage Admission Leads`) were **already present**, exactly matching the patch. No change needed.
- **`sidebar.html`** — step 4 was genuinely missing. Added a `🎓 Admissions` nav item in the "Management" section, directly under the existing Recruitment link, matching the file's real markup/classes (`nav-item` / `nav-icon`).
- **`app.js`** — step 3 was checked and found **already present**: `HR_ALLOWED_PAGES` already included `'admissions.html'` alongside `'daily_tasks_admin.html'`. No change needed — the patch note's "not directly verified" caveat is now resolved as correct.
- **`admissions.html`** — real file reviewed for the first time this session (previously only inferred from `daily_tasks_admin.html`'s `memory.md` description). Diffed its HR-standalone/admin-sidebar dual-mode block (`.hr-standalone-topbar` CSS, the inline role-check script that strips `.sidebar-spacer` before `app.js`'s `injectSidebar()` runs) directly against the real `daily_tasks_admin.html`. **Exact match, character-for-character** — no fix needed. Saved the file to the outputs folder as a confirmed-good deliverable.
- **Net result: `admissions_frontend_patch.md` is now fully applied.** All four frontend wiring steps (`hr_dashboard.html` navbar+quick-action, `app.js` whitelist, `sidebar.html` nav link) are done and verified against real files, not inferred.

**File(s) touched:**
- **Edited:** `sidebar.html` (added Admissions nav item).
- **Verified, no change needed:** `hr_dashboard.html`, `app.js`, `admissions.html`.
- **Docs:** `phases.md`, `PRD.md`, `architecture.md`, `memory.md` (this entry) — updated to reflect frontend-wiring-complete status.

**Currently being worked on / left mid-flight:**
- ⚠️ **Backend wiring is still the only gap.** `admissions_wiring_patch.md`'s steps are untouched this session — `appscript_admissions.gs` has not been pasted into the live Apps Script project, `appscript_main.gs`'s `SHEETS` map + `doGet`/`doPost` switch cases haven't been added, `appscript_generateid_fix.gs`'s `ID_PREFIX_SHEET_MAP` hasn't been given the `'LD': 'admission_leads'` entry, and `setupAdmissionLeadsSheet()` hasn't been run — so the `admission_leads` tab doesn't exist on the live Sheet yet.
- Until the backend wiring lands, clicking the now-fully-wired frontend links (`sidebar.html`, `hr_dashboard.html`) will route to `admissions.html` correctly, but every API call from that page (`getAdmissionLeads`, `addAdmissionLead`, etc.) will fail since the backend routes don't exist live yet.

**Next suggested step:** get `appscript_admissions.gs`, `appscript_main.gs`, and `appscript_generateid_fix.gs` to produce the exact patched versions per `admissions_wiring_patch.md`, then have the user paste them into the live Apps Script project and run `setupAdmissionLeadsSheet()` once. After that, click-test end-to-end (frontend nav → admissions.html → real API calls → real Sheet rows) before flipping §7.10/§7.11 to `[x]` in `phases.md`.

---

### [2026-08-02] — Phase 11 §7.10/§7.11 Admission Leads module: schema question resolved, backend + frontend written (⚠️ not yet wired into live project)
**What was done:**
- Resolved the open schema question flagged in `architecture.md`/`PRD.md`/`phases.md`: confirmed with stakeholder that Codeline.AI is an **education/coaching business**, and the requested "Candidate Management module" (§7.10) is about **student admission leads** (people interested in enrolling in a course), a **genuinely separate pipeline** from the existing `candidates` sheet (which is for job applicants/staff hiring, `appscript_recruitment.gs`). Evidence that led here: `candidates.csv` showed only job-applicant data (a "Teacher" applicant); the pre-existing `MONTHLY_ADMISSION_TARGET` setting (§7.3); and §7.1's requirement to resolve a "Course Name" field — all pointed at student admissions being a distinct concept from job recruitment.
- Reviewed `appscript_recruitment.gs`, `appscript_main.gs`, `appscript_generateid_fix.gs`, `hr_dashboard.html`, `hr_recruitment.html`, `register.html`, and the live `candidates` sheet export to confirm the existing job-recruitment pipeline's shape before designing the new, separate one.
- Designed and wrote the new **Admission Leads module**, following the same conventions as the Daily Tasks module (own sheet, own file, deliberately never merged with the adjacent-but-different existing module — same rationale as `rules.md` #11's Daily Tasks vs. Kanban `tasks` split):
  - **New sheet:** `admission_leads` (`lead_id | name | mobile | email | course_interested | source | branch_id | status | remark | follow_up_date | assigned_to | is_archived | archived_at | archived_by | created_by | created_at | updated_at`).
  - **New file `appscript_admissions.gs`:** `getAdmissionLeads` (GET, role-filtered — branch_manager scoped via `canAccessBranch()`, hr/super_admin see all; filters `?status=`, `?branch_id=`, `?assigned_to=`, `?course=`, `?include_archived=1`), `addAdmissionLead`/`updateAdmissionLead` (POST), `updateAdmissionLeadStatus` (POST, status lifecycle `New → Contacted → Follow-up → Interested/Not Interested → Admission Completed/On Hold`, blocks setting `Archived` directly), `archiveAdmissionLead` (POST, the only path to `Archived` — sets `is_archived`/`archived_at`/`archived_by` together, no hard-delete route exists per rules.md #16), and idempotent `setupAdmissionLeadsSheet()`.
  - **Deliberately excluded from both `EMPLOYEE_ALLOWED_*` whitelists** — per PRD.md §7.12's role table, employees have zero access to this module.
  - **New frontend `admissions.html`** — table + status-filter chips + add/edit modal + status-update modal, following `hr_recruitment.html`'s visual/interaction pattern (not its stage-pipeline logic, since admission leads use a flat status list, not a linear next-stage flow like job recruitment). Built to work as both an HR-standalone page and an admin-sidebar page, following the dual-mode approach `daily_tasks_admin.html` established (per its `memory.md` entry) — ⚠️ **this part is inferred from that entry's description, not copied from the real `daily_tasks_admin.html` file**, since that file wasn't available this session. Cross-check the sidebar-stripping script/CSS classes against the real file before relying on it.
- Wrote two patch-note files (matching the `daily_tasks_wiring_patch.md` precedent):
  - **`admissions_wiring_patch.md`** — exact snippets for `appscript_main.gs`'s `SHEETS` map + `doGet`/`doPost` switch cases, and `appscript_generateid_fix.gs`'s `ID_PREFIX_SHEET_MAP` (`'LD': 'admission_leads'`), plus a verification checklist (explicitly learned from the Daily Tasks module's earlier "unconfirmed for weeks" gap — this time the checklist says to verify in the *same* session as pasting, not defer it).
  - **`admissions_frontend_patch.md`** — exact before/after snippet for `hr_dashboard.html` (navbar link + quick-action card, both verified against the real file), plus best-guess/unverified snippets for `app.js`'s `HR_ALLOWED_PAGES` and `sidebar.html`'s nav link (neither file was available this session — flagged clearly as inferred, not copied).
- Updated docs: `architecture.md` (§4 — resolved the open question, added `admission_leads` schema table, added the new sheet/files to the quick-tab-summary and folder-structure listings), `PRD.md` (§7.10/§7.11 — resolution note + implementation status, priority summary line), `phases.md` (§7.10/§7.11 flipped to `[~]` — built but not yet wired/verified, per this file's own rule not to check `[x]` until it's live).

**File(s) touched:**
- **New (not yet pasted into the live Apps Script project or Google Sheet):** `appscript_admissions.gs`, `admissions_wiring_patch.md`.
- **New (not yet linked from any live page):** `admissions.html`, `admissions_frontend_patch.md`.
- **Edited (docs only):** `docs/architecture.md`, `docs/PRD.md`, `docs/phases.md`, `docs/memory.md` (this entry).
- **No live application code touched** — `hr_dashboard.html`, `sidebar.html`, `app.js`, `appscript_main.gs`, `appscript_generateid_fix.gs` all still need the manual patches described above applied by hand.

**Currently being worked on / left mid-flight:**
- ⚠️ **Nothing in this module is live yet.** All four wiring steps in `admissions_wiring_patch.md` (SHEETS map, doGet/doPost cases, ID_PREFIX_SHEET_MAP, whitelist exclusion confirmation) and all four in `admissions_frontend_patch.md` (hr_dashboard.html navbar+quick-action, app.js whitelist, sidebar.html link) still need to be manually applied.
- `setupAdmissionLeadsSheet()` has **not** been run on the live Spreadsheet yet — the `admission_leads` tab doesn't exist there yet.
- The `admissions.html` HR-standalone/admin-sidebar dual-mode code is **unverified** against the real `daily_tasks_admin.html` (that file wasn't available this session) — the sidebar-stripping inline script and CSS class names are a best-effort match, not a confirmed copy. Get `daily_tasks_admin.html`'s actual content next session and diff against it.
- `app.js` and `sidebar.html` weren't available this session — their patch snippets in `admissions_frontend_patch.md` are inferred from `memory.md`'s own description of the Daily Tasks module's equivalent patches, not copied from the real files. Verify variable names/markup before pasting.
- The pre-existing job-recruitment `candidates` sheet still does **not** have `is_archived`/`archived_at`/`archived_by` soft-delete fields — out of scope for this session (only `admission_leads` got them), flagged in `architecture.md` as a possible future item, not currently planned.

**Next suggested step:** get `daily_tasks_admin.html`, `app.js`, and `sidebar.html` (the three files this session had to infer rather than copy from) to verify/correct the frontend patch, then apply all wiring steps in one sitting (matching the "verify in the same session, don't defer it" lesson from the Daily Tasks module gap) — SHEETS map + routes + ID prefix + `setupAdmissionLeadsSheet()` + hr_dashboard.html + app.js + sidebar.html, all together, then click-test end-to-end before marking §7.10/§7.11 `[x]` in `phases.md`.

---

### [2026-08-02] — Phase 11 §7.6 Daily Task admin approval UI shipped — module complete
**What was done:**
- Built `daily_tasks_admin.html`, a new standalone admin page for reviewing employee-submitted Daily Tasks. Follows `leaves.html`'s stats-row/filter-bar/table conventions and `tasks.html`'s review-modal pattern.
  - Filters: approval status (clickable via stat cards), employee dropdown, from/to date range.
  - Review modal shows task title/description/employee remark/prior admin remark (if resubmitted after correction), with an Admin Remark textarea and three actions: **Approve**, **Request Correction**, **Reject** — the latter two require a remark (enforced client-side; backend already enforces it too).
  - Wired to the already-shipped `approveDailyTask` / `rejectDailyTask` / `requestCorrectionDailyTask` routes. No new backend work needed — `appscript_daily_tasks.gs` already had everything.
  - Branch scoping for `branch_manager` needed **zero** extra frontend logic — `getDailyTasks` already scopes server-side when called without `?emp_id=` (rules.md #9 — centralized `canAccessBranch()`).
- **Access-control wrinkle caught and fixed:** HR is deliberately locked to `hr_dashboard.html` + `hr_recruitment.html` only (`app.js`'s `AppSession.protect()` / `HR_ALLOWED_PAGES`) and uses its own standalone top-navbar layout, not the shared `sidebar.html`. A plain new sidebar page would have been unreachable for HR, and if reachable would've leaked the full admin sidebar into HR's UI. Fixed by:
  1. Adding `daily_tasks_admin.html` to `HR_ALLOWED_PAGES` in `app.js`.
  2. Adding an inline script at the top of `daily_tasks_admin.html` that strips the `.sidebar-spacer` element for `role === 'hr'` **before** `app.js`'s `DOMContentLoaded` handler calls `injectSidebar()` — so HR never sees the admin-only nav (Employees, Salary, Branches, etc.).
  3. Showing a lightweight "← Back to HR Dashboard" top bar instead, for HR only (`html.hr-standalone-mode` CSS).
  4. Adding a "📝 Daily Tasks" tab to `hr_dashboard.html`'s top navbar + a quick-action card, matching the existing "🧑‍💼 Recruitment" tab pattern.
- Added the page link to `sidebar.html` (Productivity section, next to Tasks) for super_admin/branch_manager.
- Updated `phases.md` — §7.6 flipped to `[x]`. **Daily Tasks module (§7.5–§7.7) is now fully shipped end-to-end**, nothing left pending in it.
- Updated `README.md` — §2 schema note, §7 Frontend Pages table (new row for `daily_tasks_admin.html`), and the footer status line, all had a stale "admin approval UI not yet built" caveat that's now corrected.

**File(s) touched:**
- **New:** `daily_tasks_admin.html`.
- **Edited:** `app.js` (`HR_ALLOWED_PAGES`), `sidebar.html` (nav link), `hr_dashboard.html` (navbar tab + quick-action card), `phases.md` (§7.6 checkbox), `README.md` (§2, §7, footer).
- No backend (`.gs`) changes — `appscript_daily_tasks.gs` already had every route this UI needed.

**Currently being worked on / left mid-flight:**
- Still unconfirmed (carried over from earlier entries): has `setupDailyTasksSheet()` actually been run on the live Spreadsheet? Verify before relying on this module in production.
- Not yet visually tested in an actual browser against the live Apps Script deployment — logic follows existing patterns closely but hasn't been click-tested end-to-end.

**Next suggested step:** per `PRD.md`'s priority list, next up is §7.10 (Candidate Management module) — but per `architecture.md`'s open question, resolve the schema question first (extend existing `candidates`/`RECRUITMENT_STAGES` vs. a genuinely separate admissions pipeline) before writing any code, since guessing wrong means a schema rework later. §7.11 (candidate soft-delete fields) is small and could be bundled with whichever direction §7.10 takes. §7.8 (targets) and §7.9 (reports) remain medium-priority, not yet started.

---

### [2026-08-02] — Phase 11 §7.5 frontend + §7.7 calendar view shipped (backfilled entry)
> ⚠️ **Backfilled:** this session happened after "Daily Tasks module: backend shipped" below, but was never logged at the time. Docs (`phases.md`, `PRD.md`) already reflect this work as shipped — this entry brings `memory.md`/`architecture.md` in sync with that reality. Reconstructed from `phases.md` §7.5/§7.7 checkbox notes; if any detail here is wrong, correct it against the live `employee_dashboard.html` rather than trusting this entry blindly.

**What was done:**
- Built the employee-facing frontend for §7.5 in `employee_dashboard.html`: a dedicated **"📝 Daily Tasks"** modal, opened via a navbar button next to "📅 Leave Requests", with a date-picker add form posting to `addDailyTask`/`updateDailyTask` (including the resubmit-after-`Correction Required` path).
- Built §7.7: every past/today cell in the existing calendar is now clickable; the day-detail popup shows a **read-only** "📝 Daily Tasks" list for that date (title, times, description, approval badge, admin remark) via `getDailyTasks?date=...`. Empty state uses the PRD's exact copy: *"No tasks were added for this date."*
- Deliberately kept add/edit out of the calendar popup — that's the navbar modal's job — after user feedback that an earlier draft mixed the two responsibilities.
- Updated `phases.md` checkboxes: §7.5 and §7.7 both marked `[x]`. §7.6 stays `[ ]` — admin-side approval UI still doesn't exist, and that's now the only piece blocking that box.

**File(s) touched:**
- `employee_dashboard.html` (navbar Daily Tasks modal + calendar day-popup wiring).
- `phases.md` (§7.5/§7.7 checkboxes flipped to `[x]`).

**Currently being worked on / left mid-flight:**
- ⚠️ Still not confirmed whether `setupDailyTasksSheet()` has actually been run on the live Spreadsheet (flagged as an open caveat on §7.5 in `phases.md`) — verify before relying on this in production.
- §7.6 admin approval UI (`approveDailyTask`/`rejectDailyTask`/`requestCorrectionDailyTask` backend already shipped, no frontend yet) is the only remaining piece of the Daily Tasks module.

**Next suggested step:** build §7.6 — admin/HR approval UI (likely a new page/section) wired to the already-shipped `approveDailyTask`/`rejectDailyTask`/`requestCorrectionDailyTask` routes.

---

### [2026-08-02] — Phase 11 §7.5 + §7.6 Daily Tasks module: backend shipped
**What was done:**
- Reviewed `README.md` (schema/API/roles reference) and `employee_dashboard.html` (existing calendar module — `loadCalendar()`, `calOpenDayModal()`, `changeCalendarMonth()`) to understand exactly where §7.7's calendar date-click view will need to plug in later.
- Built the full backend for the Daily Tasks module (Phase 11 §7.5 + §7.6), following the existing conventions from `appscript_tasks.gs` (Kanban) and `appscript_leaves.gs` (approve/reject + notify pattern):
  - New file **`appscript_daily_tasks.gs`**: `getDailyTasks` (GET, role-filtered — employee sees own, branch_manager scoped to branch, hr/super_admin see all; supports `?date=`, `?from_date=&to_date=`, `?emp_id=`, `?approval_status=` filters — the `?date=` filter is what will power §7.7's calendar view), `addDailyTask` / `updateDailyTask` (POST, employee-facing — update only allowed while `approval_status` is `Pending Approval` or `Correction Required`; resubmitting from `Correction Required` flips it back to `Pending Approval` and re-notifies approvers), `approveDailyTask` / `rejectDailyTask` / `requestCorrectionDailyTask` (POST, admin/hr/branch_manager only, `admin_remark` required for the latter two), and a one-time idempotent `setupDailyTasksSheet()`.
  - Notifications wired the same way as `handleApplyLeave()`/`handleApproveLeave()` — `notifyUser()` calls to HR/super_admin/branch's branch_manager on submit and resubmit, and to the employee on approve/reject/correction-request.
  - **Deliberately kept separate from the Kanban `tasks` sheet** (rules.md #11) — no schema/handler merge.
  - Employee whitelist updated (patch notes, not yet applied to live `appscript_main.gs`): `getDailyTasks` added to `EMPLOYEE_ALLOWED_GET_ACTIONS`; `addDailyTask`/`updateDailyTask` added to `EMPLOYEE_ALLOWED_POST_ACTIONS`. Approve/reject/correction routes intentionally **not** employee-whitelisted.
- Wrote `daily_tasks_wiring_patch.md` — exact copy-paste snippets for the four things that still need to be manually applied to the live project: `appscript_main.gs`'s `SHEETS` map + both whitelists + `doGet`/`doPost` switch cases, and `appscript_generateid_fix.gs`'s `ID_PREFIX_SHEET_MAP` (`'DT': 'daily_tasks'`).
- Updated docs to reflect backend-shipped/frontend-pending status: `README.md` (§2 schema table, §3 backend files table, §5 API table, deployment checklist), `architecture.md` (Phase 11 planned-tabs table + folder structure listing), `phases.md` (§7.5/§7.6 checkboxes annotated, left unchecked per the file's own rule — don't check until frontend exists too), `PRD.md` (§7.5/§7.6 headers + priority summary line).

**File(s) touched:**
- `docs/README.md`, `docs/architecture.md`, `docs/phases.md`, `docs/PRD.md`, `docs/memory.md` (this entry).
- **New (not yet pasted into the live Apps Script project):** `appscript_daily_tasks.gs`, `daily_tasks_wiring_patch.md`.
- **No live code or live Sheet was touched this session** — `appscript_main.gs` and `appscript_generateid_fix.gs` edits are documented in the patch notes file but not yet applied; `setupDailyTasksSheet()` has not yet been run.

**Currently being worked on / left mid-flight:**
- User needs to: (1) paste `appscript_daily_tasks.gs` into the Apps Script project, (2) apply the four edits in `daily_tasks_wiring_patch.md` to `appscript_main.gs` + `appscript_generateid_fix.gs`, (3) run `setupDailyTasksSheet()` once.
- Frontend for §7.5 (employee submit form), §7.6 (admin approval UI), and §7.7 (calendar date-click view in `employee_dashboard.html`) — none of this is built yet.

**Next suggested step:** build §7.7 — wire a daily-tasks panel into `employee_dashboard.html`'s existing `calOpenDayModal()` (or a new modal) so clicking a calendar date shows that date's daily tasks via `getDailyTasks?date=...`, plus the employee-facing add/edit form (§7.5's other half) and the admin approval UI (§7.6's other half, likely a new page/section for hr/admin roles).

---

### [2026-08-02] — Employee Portal stuck-loading bug fixed: missing `departments`/`designations` sheets
**What was done:**
- Debugged `employee_dashboard.html` stuck on "Loading..." (profile fields all showing `—`). Root cause chain:
  1. `employee_dashboard.html`'s `loadProfile()` only handled the `payload.status === 'success'` case — a backend `error` response was silently swallowed (no console log, no toast), so the page looked "stuck" with zero visible error. **Fixed:** added an `else` branch that logs `payload.message` to console and shows it via `showToast()`.
  2. With the error now visible, backend returned `"Get Employee Profile Error: Sheet not found: departments"` — the new Phase 11 `resolveEmployeeDisplayNames()`/`resolveEmployeeDisplayNamesBulk()` functions (`appscript_employees.gs`) were the first code path to actually read the `departments`/`designations` sheets, and **those sheets never existed** in the live Spreadsheet (confirmed via `SpreadsheetApp.getActiveSpreadsheet().getSheets()` — only `branches` existed among the three "master" lookup sheets).
- **Corrected a wrong assumption from earlier in this session:** initially assumed `department_id`/`designation_id` were plain display text (not codes) based on the admin form's dropdown showing labels like "IT"/"Teacher". The uploaded `employees.csv` proved this wrong — the sheet stores real codes (`DEPT001`, `DES001`, etc.), and the dropdown labels map to those codes in the (not-yet-shared) `employees.html` form. Reverted `resolveEmployeeDisplayNames()`/`Bulk()` back to doing a real sheet lookup for department/designation (not just branch).
- Created and ran a one-time setup script (`setupDepartmentsAndDesignationsSheets`) to create the missing `departments`/`designations` sheets and auto-seed rows from the distinct `department_id`/`designation_id` values already present on `employees` rows (seeded with placeholder `name = id`, since real labels weren't known yet at that point).
- User confirmed the real code↔label mapping (from the admin form's actual dropdown options) and it was applied via two more one-time scripts (`fixDepartmentNames`, `finalizeDesignations`):
  - **Departments (4, matches dropdown exactly):** `DEPT001`=IT, `DEPT002`=Non-IT, `DEPT003`=Technical, `DEPT004`=Back Office / Admin. (`Other` is a 5th dropdown option not yet used by any employee — no `DEPT005` row exists yet; add one manually if/when an employee is ever assigned it.)
  - **Designations (consolidated to 5):** `DES001`=Teacher, `DES002`=Admin, `DES003`=Accountant, `DES004`=Office Staff, `DES005`=Other. The pre-existing `DES006` code (3 employees were on it, of unclear original meaning) was retired: those 3 employees were re-pointed to `DES005` (Other) and the `DES006` row was deleted from the `designations` sheet.
- Generated a human-readable reference CSV (`employees_with_names.csv`) with `department_id`/`designation_id` values swapped for their names, for the user's own reference only — **not** meant to be re-imported into the live Sheet (the live `employees` sheet correctly keeps storing codes, which is what `resolveEmployeeDisplayNames()` expects).

**File(s) touched (live Google Sheet, via Apps Script one-time scripts, not repo files):**
- `departments` sheet — created, 4 rows (`DEPT001`–`DEPT004`) with correct names.
- `designations` sheet — created, then consolidated to 5 rows (`DES001`–`DES005`) with correct names; `DES006` removed.
- `employees` sheet — 3 rows' `designation_id` changed from `DES006` → `DES005`.
- `employee_dashboard.html` — `loadProfile()` error-handling fix (else branch added).
- `appscript_employees.gs` — `resolveEmployeeDisplayNames()` / `resolveEmployeeDisplayNamesBulk()` reverted to doing real sheet lookups for all three of department/designation/branch (not just branch).

**Currently being worked on / left mid-flight:** nothing — bug is resolved end-to-end (frontend now surfaces backend errors; missing sheets created and populated with confirmed real names; stale `DES006` cleaned up). User still needs to: (1) confirm dashboard now loads correctly post-fix, (2) optionally add a `DEPT005` = "Other" row later if that dropdown option ever gets used.

**Next suggested step:** resume Phase 11 build (still nothing implemented beyond §7.1's name-resolution, which is now genuinely working end-to-end). Suggested order unchanged from the last entry: `settings` sheet (§7.3) next, since leave-lock (§7.4) and targets (§7.8) both depend on it.

---

### [2026-08-02] — Phase 11 requirements received & merged into docs
**What was done:**
- Received "Employee & HR Portal – Project Update Notes" (12 numbered requirement groups: readable names instead of codes, leave summary + settings-driven leave count, 30-day new-employee leave lock, employee-authored Daily Tasks + admin approval, calendar task view, employee targets, HR month-wise reports, HR Candidate Management module, no hard-delete for candidates).
- Merged this into the doc set rather than treating it as a standalone spec:
  - `PRD.md` — new §7 "Requirement Set 2 — Portal Enhancement" with one subsection per requirement, plus two explicit open questions flagged for stakeholder clarification (Daily Tasks vs. existing Kanban `tasks` sheet; new Candidate Management module vs. existing `candidates`/recruitment pipeline).
  - `architecture.md` — added a "Planned tabs — Phase 11" table (`settings`, `daily_tasks`, `employee_targets`) and planned additive columns on `candidates` (`is_archived`/`archived_at`/`archived_by`).
  - `rules.md` — added 4 new "Always do" rules (resolve codes→names server-side, settings-sheet-driven config, server-side enforcement of time-based rules, no-hard-delete pattern) and 2 new "Never do" rules (don't merge Daily Tasks with Kanban tasks without a decision; never expose a candidate delete action to HR).
  - `phases.md` — added Phase 11 with high/medium priority checklists, all unchecked (nothing built yet).
- **No application code (`.gs`/`.html`) was touched** — this session was requirements intake + documentation only.

**File(s) touched:** `docs/PRD.md`, `docs/architecture.md`, `docs/rules.md`, `docs/phases.md`, `docs/memory.md`.

**Currently being worked on / left mid-flight:** nothing — Phase 11 is fully specified in docs but zero backend/frontend implementation has started.

**Next suggested step:** before writing any Apps Script code for Phase 11, get explicit answers to the two open questions flagged in `PRD.md` §7.5 and §7.10 (Daily Tasks vs. Kanban tasks relationship; Candidate Management module vs. existing `candidates` sheet), since guessing wrong here means a schema rework later. Once resolved, suggested build order matches the "High priority" list in `phases.md` Phase 11, starting with the `settings` sheet (§7.3) since the leave-lock and target features both depend on it.

---

### [2026-08-02] — Docs scaffolding created
**What was done:**
- Reviewed the full `EBMS.zip` codebase (22 `.gs` backend files + 24 HTML pages + `app.js` + `style.css` + existing `README.md`).
- Created the standard doc set requested: `PRD.md`, `architecture.md`, `rules.md`, `phases.md`, `design.md`, `memory.md` (this file) under `docs/`.
- No application code was changed in this session — documentation only.

**Current state of the product (as reverse-engineered):**
- All modules listed in `phases.md` Phases 0–9 are built and appear feature-complete per code comments (attendance, leaves, payroll, recruitment, tasks/assets/performance, notifications, onboarding instructions).
- Most recent feature per in-code comments: **Onboarding Instructions module** (`appscript_instructions.gs`) — role-based popup, content-editable via the `instructions` sheet.
- `README.md` (in project root) is the authoritative, up-to-date schema + API reference — `architecture.md` defers to it rather than duplicating.

**Open items flagged (see `phases.md` Phase 10):**
- Confirm `appscript_setup.gs` and `appscript_rebuild_candidates.gs` exist in the live Apps Script project (referenced in comments, not present in this uploaded zip's `.gs` set reviewed here).
- Birthday notifications deliberately not built — needs a `dob` column added to `employees` first.
- No automated tests exist anywhere in the project.
- Leave day-count math doesn't yet cross-reference the `holidays` sheet.

**Currently being worked on:** nothing mid-flight — this was a documentation-only session.

**Next suggested step:** decide whether to also generate a `schema.md` / seed-data reference for the actual Google Sheet tabs+sample rows (user was asked; see next session entry once answered).

---

### [2026-08-08] — holidays.html NaN date fix; Daily Tasks module verified; employees.html §7.1 bug fixed; Employee Targets + Reports frontends built

**What was done:**
- **`holidays.html` "NaN / Invalid Date" bug fixed.** Root cause: `appscript_holidays.gs`'s `handleGetHolidaysRoute()` sends `date` formatted as `dd-MM-yyyy` (per its own header comment), but the frontend did `new Date(h.date)` in two places (the "Upcoming" stat count and the row date-chip render) — the native `Date` constructor doesn't reliably parse `dd-MM-yyyy`, silently producing `Invalid Date`. Fixed frontend-only: added `parseHolidayDate(str)` (manual `dd-MM-yyyy` split/parse) and swapped it into both call sites. No backend change needed/made.
- **Daily Tasks module (§7.5–§7.7) re-verified by direct file review**, not just trusted from prior session notes — read `daily_tasks_admin.html` (1004 lines) and the daily-tasks portions of `employee_dashboard.html` in full. Confirmed: stats/filters/review-modal/approve-reject-correction-request flow all correctly wired to the matching `appscript_daily_tasks.gs` routes; both files correctly parse `task_date` (`dd-MM-yyyy`) via regex/string-split, never `new Date(str)` — so this module does **not** have the same bug class as the holidays one. `phases.md`'s "frontend not yet built" note (from an earlier, stale session) has been corrected.
- **`employees.html` §7.1 bug fixed**: the main employee table row rendered raw `emp.branch_id`/`emp.designation_id` codes instead of resolved names (the profile-drawer side panel already did client-side resolution via a separate departments/designations lookup — only the main table listing had the bug). Changed to `emp.branch_name || emp.branch_id` and `emp.designation_name || emp.designation_id`. ⚠️ **Not fully closed** — `appscript_employees.gs` (not reviewed this session) needs to actually attach `branch_name`/`designation_name` to each row from `getEmployees` (the same way `resolveEmployeeDisplayNamesBulk()` does in `appscript_reports.gs`) for this to show real names instead of falling back to the raw code again.
- **Built `targets_admin.html`** (Phase 11 §7.8) — the backend (`appscript_employee_targets.gs`: `getEmployeeTargets`/`assignTarget`/`updateTarget`) already existed going into this session; only the frontend was missing. New page matches `daily_tasks_admin.html`'s visual language: stats row, employee/month/year/status filters, assign+edit modal, per-row progress bar. Wired to the pre-existing `sidebar.html` nav link and `hr_dashboard.html` navbar/quick-action (both already referenced `targets_admin.html` before the page existed).
- **Built `reports.html`** (Phase 11 §7.9) — same situation: backend (`appscript_reports.gs`, 7 report builders) pre-existed, frontend didn't. New page: report-type selector, month(optional)/year/department/employee filters, dynamic summary cards + table (column config per report type matched exactly to each backend builder's row shape), CSV export (client-side Blob download) + browser print (dedicated `@media print` stylesheet). No server-side PDF, matching the backend's documented design decision.
- Updated `README.md` (schema table: `employee_targets` row; backend files table: `appscript_employee_targets.gs`/`appscript_reports.gs` rows; API table: Employee Targets + Reports rows; pages table: `targets_admin.html`/`reports.html` rows; footer date-stamp), `phases.md` (§7.1/§7.5/§7.6/§7.8/§7.9 status lines, Phase 10 open-items list), `PRD.md` (§7.1/§7.8/§7.9 status headers + Development priority summary).

**File(s) touched:**
- `holidays.html`, `employees.html` — direct fixes.
- `targets_admin.html`, `reports.html` — new files.
- `README.md`, `phases.md`, `PRD.md`, `memory.md` (this entry) — docs.
- **No `.gs`/backend files or live Sheet touched this session** — `appscript_employees.gs`'s `getEmployees` handler was NOT reviewed/edited (see the §7.1 caveat above); `setupEmployeeTargetsSheet()` has not been confirmed run on the live Spreadsheet.

**Currently being worked on / left mid-flight:**
- `employees.html` fix is frontend-only and may not display real names until `appscript_employees.gs` is reviewed/updated to match.
- None of today's new/changed pages (`holidays.html`, `employees.html`, `targets_admin.html`, `reports.html`) have been click-tested against the live Sheet/API yet.

**Next suggested step:**
1. Upload `appscript_employees.gs` so the `getEmployees` route can be confirmed/fixed to actually return `branch_name`/`designation_name` (closes §7.1 for real).
2. Click-test `targets_admin.html` (assign a target, confirm `achieved_target` live-recomputes correctly against a completed admission lead) and `reports.html` (run all 7 report types against real data, spot-check summary numbers, confirm CSV opens cleanly) — both currently unverified against the live Spreadsheet.
3. Still outstanding from earlier sessions, unrelated to today's work: Admission Leads real click-test, Daily Tasks / Employee Targets live-sheet setup-function confirmation.

---

### [2026-08-08] — Phase 11 closed out (user-confirmed); moving to Phase 10

**What was done:**
- Documentation-only session. User confirmed in chat that everything scheduled before Phase 10 is now complete — no new code reviewed/changed this entry.
- Updated `phases.md`: marked §7.8 (HR Targets) and §7.9 (Reports) as fully closed — wiring patch applied live, `setupHrTargetsSheet()` run, `admissions.html` "Assigned To" fixed to list HR users, and all click-tests (HR Targets assign/recompute/edit, Daily Tasks live flow, all 7 report types) done. Folded the now-redundant "live-sheet verification" bullets into their parent items. Marked Phase 11 as fully closed overall.
- Left a flag rather than silently closing: the §7.2 (calendar-year leave cycle) and §7.4 (self-service-only leave-lock scope) stakeholder-confirmation caveats were not individually re-confirmed line-by-line — treating them as accepted-as-built per the user's blanket confirmation, but noted in `phases.md` in case that assumption is wrong.

**File(s) touched:**
- `phases.md` — status updates only.
- `memory.md` (this entry).
- No `.gs`/frontend files touched — nothing was actually built this session.

**Currently being worked on / left mid-flight:**
- Nothing mid-flight. Ready to start Phase 10.

**Next suggested step:**
- Pick a Phase 10 item to start: (a) leave day-count integration with the holidays sheet, (b) birthday notifications (needs a `dob` column added to `employees` first), (c) confirm/recreate `appscript_setup.gs` / `appscript_rebuild_candidates.gs`, or (d) automated test coverage for core routes/roles/branch-scoping.

---

### [2026-08-08] — Phase 10: leave day-count now integrated with holidays sheet

**What was done:**
- **`appscript_leaves.gs`**: added `calculateLeaveDays(fromDateStr, toDateStr, branchId)` — walks every calendar date from `from_date` to `to_date` inclusive and excludes any date that matches an applicable `holidays` row (blank `branch_id` = company-wide, else must match the employee's branch; `recurring === 'true'` rows match on month+day only, others on the exact date). Returns `{ok, days, excludedHolidays}` or `{ok:false, message}` for an invalid/reversed date range.
- **`handleApplyLeave()` rewired**: `body.days` is no longer trusted or required in the validation — the server now computes `days` itself via `calculateLeaveDays()` (rules.md #15: time-based business math must be server-side, not frontend-computed). If the computed count is 0 (whole range is holidays), the request is rejected with a 400 instead of creating a 0-day leave row. The success response now also includes `excluded_holidays` (optional, for the frontend to show *why* the count differs from a naive date-diff — safe to ignore if the UI doesn't use it).
- **`appscript_holidays.gs`**: header comment updated — it previously claimed the sheet was "informational only for now" and didn't affect leave math; that's now false, so the comment was corrected to point at `calculateLeaveDays()`. No functional/route changes needed in this file — the existing `getHolidays`/`addHoliday`/`deleteHoliday` shape already has everything `calculateLeaveDays()` needs.
- Updated `phases.md` (Phase 10 item marked `[~]` — built, not yet live-click-tested) and this `memory.md` entry.

**File(s) touched:**
- `appscript_leaves.gs` — functional change (new helper + `handleApplyLeave()` rewired).
- `appscript_holidays.gs` — comment-only change.
- `phases.md`, `memory.md` — docs.
- `README.md` — no schema/API shape change (still `leave_requests.days` as an int, still the same `applyLeave` action/params from the frontend's point of view — frontend can keep sending `days` if it wants, it's just ignored now), so no edit needed there this session.

**Currently being worked on / left mid-flight:**
- Not click-tested against the live Apps Script project / live Sheet yet. Needs: apply a leave that spans a real holiday row and confirm the returned `days` (and the stored sheet row) correctly excludes it; also re-check `getLeaveSummary` totals still look right with the new counts.
- Not retroactive — pre-existing `leave_requests` rows keep their original day counts.
- Weekend/weekly-off exclusion deliberately out of scope for this change (see `appscript_leaves.gs`'s Phase 10 comment block for why).

**Next suggested step:**
- Click-test the holiday-aware day count live (add a test holiday if needed, apply a leave spanning it, confirm the count).
- Then move to the next Phase 10 item: birthday notifications, setup-script confirmation, or automated test coverage.

---

### [2026-08-08] — Admin dashboard: salary privacy toggle + quick-add buttons (ad-hoc UI request, not from PRD)

**What was done:**
- User shared a hand-annotated screenshot of `dashboard.html` marking two changes and confirmed the ambiguous one via a clarifying question before building:
  1. **Monthly Salary Expense card**: added a 👁️/🙈 eye-toggle button (top-right of the card) that masks/unmasks the ₹ figure as `••••••`. Preference persists via `localStorage` (`ebms_salary_hidden`) — client-side UI convenience only, not an access-control change; the real number is still in every `getDashboard` API response regardless of toggle state.
  2. **"+ Add" buttons** on all three bottom panels (Present Employees, Work List, Pending Leave Requests) — user confirmed these should open a quick-add form modal rather than just linking to the full page. Built a shared `quickAddModalOverlay` shell (reuses the existing `.modal-overlay`/`.modal-box` CSS) with three distinct forms:
     - **Mark Attendance** → posts `markAttendance` (employee dropdown scoped to the selected branch, date, in-time, optional out-time).
     - **New Task** → posts `addTask` (title, assign-to dropdown incl. "Unassigned", due date, priority).
     - **Apply Leave (On Behalf)** → posts `applyLeave` with an explicit `emp_id` (the admin-on-behalf-of path already supported in `handleApplyLeave()`) — deliberately does NOT ask for a day count in the form, since this session's earlier Phase 10 change made the server compute `days` itself from the holiday-aware `calculateLeaveDays()`.
- New CSS added (scoped, reuses existing design tokens): `.stat-eye-btn`, `.panel-header-actions`, `.panel-add-btn`, `.qform-*` (form group/label/input/select/actions/buttons).
- `renderStats()` and `loadDemoData()` both rewired so the salary figure always routes through `updateSalaryDisplay()` (respects the toggle) instead of writing directly to `#stat-salary`.

**File(s) touched:**
- `dashboard.html` — all changes (CSS + HTML + JS, no backend `.gs` files touched this session).
- `phases.md` — new "Phase 11.5 — Admin Dashboard UX tweaks (ad-hoc)" section, both items marked `[~]` (built, not live-click-tested).
- `memory.md` (this entry).
- `README.md` — pages table entry for `dashboard.html` updated to mention the new UI.

**Currently being worked on / left mid-flight:**
- Not click-tested against the live Apps Script project yet.
- ⚠️ **Real gap to flag**: `markAttendance`'s param names (`emp_id`, `date`, `in_time`, `out_time`) used in the new quick-add form are inferred from how `getAttendance` responses are consumed elsewhere on this same page (`a.emp_id`, `a.in_time`, `a.out_time`) — `appscript_attendance.gs` itself was never uploaded/reviewed this session, so the actual `handleMarkAttendance()` signature is unconfirmed. `addTask` and `applyLeave` param names ARE confirmed against real reviewed backend code (README's Tasks module row; this session's own `appscript_leaves.gs` review).

**Next suggested step:**
- Upload `appscript_attendance.gs` so the Mark Attendance quick-add form's field names can be confirmed/fixed against the real `handleMarkAttendance()` handler.
- Click-test all three quick-add flows (mark attendance, add task, apply leave-on-behalf) and the salary eye-toggle against the live Sheet/Apps Script project.
- Then resume Phase 10: birthday notifications, setup-script confirmation, or automated test coverage (whichever the user picks next).

---

## Template for future entries

```
### [YYYY-MM-DD] — <short title>
**What was done:**
- ...

**File(s) touched:**
- ...

**Currently being worked on / left mid-flight:**
- ...

**Next suggested step:**
- ...
```