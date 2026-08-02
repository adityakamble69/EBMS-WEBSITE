# memory.md — Working Memory / Session Log

Purpose: a running log so any contributor (human or AI) picking up this project mid-stream knows **what's done, what's in progress, and what file was last touched** — without re-reading the whole codebase.

> Rule: update this file at the **end of every work session**, even a short one. Newest entry on top.

---

## Session log

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