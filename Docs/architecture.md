# architecture.md — Codeline.AI EBMS

## 1. Tech stack

| Layer | Tech |
|---|---|
| Frontend | Plain HTML + CSS + vanilla JS (no framework, no build step) |
| Backend | Google Apps Script (`.gs` files), single project, multiple files merged at deploy time |
| Database | Google Sheets — one tab = one table, row 1 = headers = JSON keys |
| Auth | Custom token sessions in `PropertiesService` (NOT Google OAuth), 8h expiry, auto-extend on valid call |
| File storage | Google Drive (candidate documents, bank passbook photos, employee documents) — folders auto-created, shared "anyone with link: view" |
| Fonts | `Inter` (body/UI), `Space Grotesk` (headings/display), `JetBrains Mono` (numeric/code) — loaded via Google Fonts |
| Hosting | Any static host for the HTML/CSS/JS + Apps Script Web App deployment for the API — no server, no paid infra |

---

## 2. High-level request flow

```
Browser (HTML page)
   │  fetch(API_URL, { method, body })
   ▼
Apps Script Web App  (doGet / doPost in appscript_main.gs)
   │  1. Resolve action from ?action= or body.action
   │  2. Public routes bypass auth; everything else → verifyToken(token)
   │  3. If role === 'employee' → check EMPLOYEE_ALLOWED_*_ACTIONS whitelist (403 if not listed)
   │  4. switch(action) → dedicated handler function
   ▼
Handler function (in the relevant appscript_<module>.gs file)
   │  - checkPermission(token, [roles]) or verifyToken() + manual role check
   │  - canAccessBranch(session, targetBranchId) for branch scoping
   │  - getSheetData / findRow / appendRow / updateRow (appscript_main.gs helpers)
   │  - formatDateOnly() / formatTimeOnly() on any outgoing date/time field
   ▼
sendSuccess(data, message)  or  sendError(message, code)
   │  ContentService JSON response: { status, message, data, timestamp }
   ▼
Browser renders / AppSession stores token+user (app.js)
```

---

## 3. Folder / file structure (current)

```
EBMS/
├── README.md                  ← canonical technical reference (schema, API table, roles)
├── app.js                     ← API_URL constant, AppSession (token/user storage), global page loader
├── style.css                  ← design tokens (CSS vars) + all shared component styles
│
├── index.html                 ← login (public)
├── register.html              ← candidate self-registration (public)
├── attendance_qr.html         ← self-punch kiosk (public, GPS-gated)
│
├── dashboard.html             ← admin overview (super_admin/hr/branch_manager)
├── employee_dashboard.html    ← employee's personal dashboard
├── hr_dashboard.html          ← HR recruitment overview
├── hr_recruitment.html        ← full recruitment pipeline management
├── recruitment.html           ← job openings + candidates (admin)
│
├── employees.html             ← employee CRUD (admin)
├── attendance.html            ← attendance records (admin)
├── leaves.html                ← leave requests (admin)
├── salary.html                ← salary structure setup (admin)
├── salaryslip.html            ← salary slip view/generate (admin/employee)
├── shifts.html                ← shift templates + roster (admin)
├── tasks.html                 ← Kanban tasks board
├── assets.html                ← asset registry
├── performance.html           ← KPI reviews
├── expenses.html               ← expense claims
├── holidays.html               ← holiday calendar
├── documents.html               ← HR letter generation/archive
├── notifications.html           ← notification center
├── settings.html                 ← Branches/Departments/Designations + password (super_admin only)
├── sidebar.html                   ← shared nav partial, injected across admin pages
│
└── Apps Script backend (paste all into one Apps Script project — order doesn't matter,
    function names must stay globally unique):
    ├── appscript_main.gs            ← router (doGet/doPost), SHEETS map, whitelists,
    │                                   sheet CRUD helpers, date/time formatters, dashboard
    ├── appscript_auth.gs             ← login/logout/changePassword/token verify/getAdminUsers
    ├── appscript_employees.gs        ← employee CRUD, self-punch identity verify, profile, weekly-off
    ├── appscript_attendance.gs       ← punch in/out (session + public self-punch), history, force-update
    ├── appscript_leaves.gs           ← apply/approve/reject leave + notifications
    ├── appscript_salary.gs           ← salary structure + slip generation + one-time migration
    ├── appscript_documents.gs        ← HR letter generation + archive
    ├── appscript_branches.gs         ← branches/departments/designations CRUD (Settings page)
    ├── appscript_tasks.gs             ← Kanban task lifecycle + one-time sheet setup
    ├── appscript_notifications.gs     ← notification CRUD, notifyUser() helper, anniversary trigger
    ├── appscript_holidays.gs          ← holiday calendar CRUD
    ├── appscript_expenses.gs           ← expense claim apply/approve/reject
    ├── appscript_shifts.gs             ← shift templates + roster assignment
    ├── appscript_recruitment.gs         ← job openings, candidates, public registration, hire conversion
    ├── appscript_bankdocs.gs            ← bank details + employee document uploads (Drive-backed)
    ├── appscript_branch_location.gs     ← geofence lookup + universal-link findBranchByLocation
    ├── appscript_assets.gs               ← asset registry + assign/return
    ├── appscript_performance.gs          ← KPI review CRUD
    ├── appscript_salaryslip.gs            ← single salary-slip detail fetch
    ├── appscript_generateid_fix.gs         ← sequential per-sheet ID generator
    └── appscript_instructions.gs           ← onboarding popup content + "seen" tracking
```

> **Note:** `appscript_setup.gs` (initial sheet/tab creation) and `appscript_rebuild_candidates.gs` are referenced in code comments as one-time setup scripts — confirm these exist in the live Apps Script project; if missing, recreate before a fresh deployment.

---

## 4. Database schema (Google Sheet tabs)

See `README.md` §2 for the full authoritative column-by-column table (already accurate and detailed — don't duplicate it here, keep `README.md` as the single source of truth for schema and update it directly when columns change).

Quick summary of tabs: `admin_users`, `employees`, `branches`, `departments`, `designations`, `attendance`, `shifts`, `shift_assignments`, `leave_requests`, `salaries`, `salary_slips`, `performance`, `tasks`, `assets`, `documents`, `notifications`, `holidays`, `expenses`, `job_openings`, `candidates`, `bank_details`, `employee_documents`, `instructions`.

> **Note (2026-08-02):** `departments` (`dept_id | dept_name | created_at`) and `designations` (`desig_id | desig_name | created_at`) did not actually exist in the live Sheet until this date, despite being referenced in code — this caused a "Sheet not found" crash in `resolveEmployeeDisplayNames()` (Phase 11 §7.1). Both are now created and populated. `department_id`/`designation_id` on `employees` are real lookup **codes** (not plain display text — this was briefly misdiagnosed mid-session, then corrected against actual CSV data), matching the admin form's dropdown options 1:1:
> - **Departments:** `DEPT001`=IT, `DEPT002`=Non-IT, `DEPT003`=Technical, `DEPT004`=Back Office / Admin. (A 5th dropdown option, "Other", has no `DEPT005` row yet — no employee has used it; add the row when one does.)
> - **Designations:** `DES001`=Teacher, `DES002`=Admin, `DES003`=Accountant, `DES004`=Office Staff, `DES005`=Other. (A stale `DES006` code existed with no confirmed original meaning — the 3 employees on it were migrated to `DES005`/Other and the row was deleted.)
> See `memory.md`'s "Employee Portal stuck-loading bug fixed" session entry for the full debugging trail.

### Planned tabs — Phase 11 (not yet built, see `PRD.md` §7 / `phases.md` Phase 11)

| Sheet | Key columns | Notes |
|---|---|---|
| `settings` | setting_id, setting_key, setting_value, description, updated_at, updated_by | Central config — `ANNUAL_LEAVES`, `NEW_EMPLOYEE_LEAVE_LOCK_DAYS`, `MONTHLY_ADMISSION_TARGET`, etc. Admin-only write. All backend hardcoded constants that are business-tunable should migrate here over time (e.g. `TOKEN_EXPIRY_HOURS` is a candidate, though not required by this phase). |
| `daily_tasks` | task_id, employee_id, task_title, task_description, task_date, start_time, completion_time, task_status, approval_status, employee_remark, admin_remark, approved_by, approved_at | Employee-authored, self-reported daily log — **not** the same as the existing `tasks` sheet (admin-assigned Kanban). Keep them separate unless a merge is explicitly decided. |
| `employee_targets` | target_id, employee_id, target_type, target_month, target_year, assigned_target, achieved_target, status | `assigned_target` value should itself be sourced from `settings` (e.g. `MONTHLY_ADMISSION_TARGET`) unless overridden per-employee. |

### Planned schema additions to existing tabs — Phase 11

- `candidates`: add `is_archived`, `archived_at`, `archived_by` (soft-delete fields) — additive, via `addColumnIfMissing()` pattern. **Do not** add a delete route for candidates; archive is the only removal path (see `rules.md`).
- Clarify before building: does §7.10's "Candidate Management module" reuse the existing `candidates` sheet (extending `RECRUITMENT_STAGES`) or is it a genuinely separate admissions/leads pipeline? The requirement doc's suggested status values (`New/Contacted/Follow-up/...`) don't match the existing `RECRUITMENT_STAGES` array in `appscript_recruitment.gs` — resolve this before writing any backend code so we don't end up with two divergent candidate schemas.

---

## 5. API contract

- **GET:** `API_URL?action=<name>&token=<token>&...params`
- **POST:** `fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, token, ...fields }) })`
- Every response: `{ status: 'success'|'error', message, data, timestamp }`
- Full action-by-module table lives in `README.md` §5 — keep it updated whenever a route is added.

---

## 6. Cross-cutting conventions (see `rules.md` for the enforced do/don't list)

1. **Auth layering (defense-in-depth):** route whitelist → `checkPermission()`/role check inside handler → `canAccessBranch()` branch scoping. All three layers exist independently; don't remove one assuming another covers it.
2. **Dates/times never leave the server as raw `Date` objects** — always `formatDateOnly()` (`dd-MM-yyyy`) or `formatTimeOnly()` (`HH:mm`), applied right before `sendSuccess()`.
3. **IDs are sequential per-sheet**, generated via `generateId(prefix)` in `appscript_generateid_fix.gs` — never hand-roll a random ID generator elsewhere (there was historically a duplicate-function bug here — see file header comment).
4. **Row matching:** most sheets use a stable ID column (`emp_id`, `task_id`, etc.) via `findRow`/`updateRow`. The `attendance` sheet is the one exception — it has no synthetic ID and is matched by `Email + Date` via `updateRowByMatch()`.
5. **Notifications are fire-and-forget** — `logActivity()` and `notifyUser()` both silently swallow errors so a notification failure never breaks the main transaction.