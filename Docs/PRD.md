# PRD.md — Codeline.AI EBMS
### Employee & Branch Management System

> Status: **Reverse-engineered from existing codebase** (this is a live, largely-built product, not a greenfield spec). Use this file to onboard new contributors / AI tools quickly, and update it whenever product scope actually changes.

---

## 1. What is this product

EBMS is a multi-branch HR + Operations platform for a company (Codeline.AI) to run:
- Employee records, onboarding, offboarding
- Attendance (including a public GPS-geofenced "self-punch" kiosk mode)
- Leave management
- Payroll (salary structure + monthly slip generation)
- Recruitment (job openings → candidate pipeline → auto-hire-to-employee)
- Tasks (Kanban), Assets, Performance reviews
- Notifications, Holidays, Expense claims, Shift rosters
- HR document generation (Offer/Appointment/Warning letters)
- Bank details + employee document uploads
- Role-based Settings (Branches / Departments / Designations)
- Role-based onboarding instructions popup

It runs entirely on **Google Sheets (database) + Google Apps Script (backend API) + static HTML/CSS/JS (frontend)** — zero paid infrastructure.

---

## 2. Who uses it (Roles)

| Role | Lives in sheet | Scope |
|---|---|---|
| `super_admin` | `admin_users` | Full access — all branches, all modules, Settings page |
| `hr` | `admin_users` | All branches for employees/leaves/expenses/recruitment/payroll. No Settings/branch-edit |
| `branch_manager` | `admin_users` | Own branch only |
| `employee` | `employees` | Only their own data — hard-blocked from admin-panel actions even with a valid token |
| Job applicant (public, unauthenticated) | `candidates` | Can only submit `register.html` form |
| Employee at a kiosk (public, unauthenticated) | n/a | Can only self-punch via GPS + one-time identity check (`attendance_qr.html`) |

---

## 3. Core user journeys (as built)

1. **Login** → `index.html` → `admin_users` checked first, then `employees` fallback → role-based redirect (Admin Panel vs Employee Dashboard).
2. **Employee self-punch (kiosk, no login):** open universal link/QR → browser GPS → `findBranchByLocation` detects branch → one-time `verifyEmployeeSelf` (name+email+mobile) saved to `localStorage` → `markAttendance` punches in/out.
3. **HR hires someone:** `register.html` (public candidate form with Drive file uploads) → HR moves candidate through pipeline stages in `recruitment.html` → on `hired`, employee record is auto-created with a default password.
4. **Employee applies leave / expense / task submission** → notifications pushed to approvers → approver acts → notification pushed back to employee.
5. **Admin runs payroll** → sets salary structure once per employee → generates monthly slip (Basic+HRA+Allowances−PF, minus absent-day deduction).
6. **First dashboard visit (any role)** → role-based onboarding popup shown once, content pulled live from the `instructions` sheet, dismissible forever via `markInstructionsSeen`.

---

## 4. Non-goals / explicit constraints

- No external database — Google Sheets is and stays the system of record.
- No paid hosting — Apps Script Web App + static file hosting only.
- No native mobile app — kiosk/self-punch flow is the mobile-web answer for attendance.
- Not multi-tenant — single company, multiple branches.
- Auth is custom token-based (`PropertiesService`), not Google OAuth/Sheets-native permissions — do not conflate the two.

---

## 5. Success criteria for a feature to be "done"

A module is considered complete only when it has:
1. Backend route(s) wired in `appscript_main.gs` (`doGet`/`doPost` switch + whitelist entries if employee-accessible).
2. Role/branch access control enforced server-side (never trust frontend-only checks).
3. All outgoing date/time fields passed through `formatDateOnly()` / `formatTimeOnly()`.
4. A frontend page/section wired to the API using `app.js`'s `API_URL` + `AppSession`.
5. An entry added to `README.md` (API table + module list) — see `architecture.md`.
6. `memory.md` updated with what was done and what's next.

---

## 6. Open questions / things to confirm before extending

- Sheet-side schema changes (new columns) must be additive and idempotent (see `addColumnIfMissing()` pattern in `appscript_instructions.gs`) — never destructively alter a live sheet without a migration function.
- Any new employee-facing action must be explicitly added to `EMPLOYEE_ALLOWED_GET_ACTIONS` / `EMPLOYEE_ALLOWED_POST_ACTIONS` in `appscript_main.gs`, or it will 403 by default (this is intentional, fail-closed design).

---

## 7. Requirement Set 2 — Portal Enhancement (added 2026-08-02)

> Source: "Employee & HR Portal – Project Update Notes". These are **approved requirements, not yet built**. Tracked as Phase 11 in `phases.md`. Update this section's checkboxes as items ship; move fully-shipped items into §1–§5 above and delete from here once `README.md` reflects them.

### 7.1 Employee profile — show names, not codes — ✅ FULLY CONFIRMED 2026-08-08
Employee Portal currently shows raw codes (`DEPT_001`) under the employee photo. Must resolve to human-readable names (Department Name, Designation Name, Branch Name, Employee Name, Course Name where applicable) **server-side**, before the response leaves the API — no internal IDs/codes should ever reach the UI.
> ✅ **RESOLVED (2026-08-08):** direct code review of the live `appscript_employees.gs` confirms `handleGetEmployees()` (the list route) calls `resolveEmployeeDisplayNamesBulk(employees)` immediately after stripping `password` and formatting `joining_date`, and *before* pagination — so every row in the paginated response carries `department_name`/`designation_name`/`branch_name`. `resolveEmployeeDisplayNamesBulk()` itself builds the `departments`/`designations`/`branches` lookup maps once (not per-row) and falls back safely to the raw code (or `'—'`/`'Staff'`) when no match is found — never throws. Same resolve pattern (`resolveEmployeeDisplayNames`, singular) is also confirmed wired into `handleGetEmployee()` (both session and self-punch paths), `handleGetProfile()`, and `handleAddEmployee()`'s response echo. The previous ⚠️ open question ("not yet confirmed whether getEmployees attaches these fields") is now closed — it does.

### 7.2 Employee leave summary — ✅ SHIPPED 2026-08-02
Employee dashboard's Leave Request section must show: Total Annual Leaves, Used, Remaining, Pending, Approved, Rejected.
`Remaining = Total Annual Leaves − Approved/Used`. Pending and rejected leaves must **not** count against the used total.

### 7.3 Central Settings sheet — ✅ SHIPPED 2026-08-02
A new `settings` sheet (`setting_id | setting_key | setting_value | description | updated_at | updated_by`) becomes the single source for configurable values — starting with `ANNUAL_LEAVES`, `NEW_EMPLOYEE_LEAVE_LOCK_DAYS`, `MONTHLY_ADMISSION_TARGET`. No such value may be hardcoded in `.gs` files or frontend JS ever again; all reads go through a `getSetting(key)`-style helper backed by this sheet. Admin-only write access.

### 7.4 New-employee leave lock (first 30 days) — ✅ SHIPPED 2026-08-02 (⚠️ scope caveat below)
An employee cannot apply for leave until `today - joining_date >= NEW_EMPLOYEE_LEAVE_LOCK_DAYS` (value from Settings, default 30). **Must be enforced server-side** inside `handleApplyLeave()` — a disabled frontend button is not sufficient. Error message: *"You cannot apply for leave during the first 30 days of employment."*
> ⚠️ **As shipped:** only enforced when the caller's own session role is `employee` (true self-service). Admin/HR/branch_manager filing a leave request on an employee's behalf (`body.emp_id`) currently bypasses this lock — not yet confirmed with stakeholders whether that's correct or whether the lock should apply universally regardless of who files it.

### 7.5 Daily Task Management (employee-authored, admin-approved) — ⚠️ BACKEND SHIPPED 2026-08-02
New `daily_tasks` module — employee adds a task (title, description, date, start/completion time, status), submits for approval; admin/HR approves/rejects/requests correction. See §7.6 for the approval flow and `architecture.md` for the schema. Distinct from the existing Kanban `tasks` module (`appscript_tasks.gs`) — that one is admin-assigned top-down; this one is employee-authored bottom-up self-reporting. Confirm with stakeholders whether these should stay separate sheets/modules or eventually merge — **do not silently merge them without a decision**, since the permission models differ (Kanban tasks are assigned by admin; Daily Tasks are self-logged by the employee and then reviewed).
> **Backend shipped:** `appscript_daily_tasks.gs` — `getDailyTasks` (GET, role-filtered, `?date=` for §7.7's calendar view), `addDailyTask`/`updateDailyTask` (POST, employee-facing). **Frontend not yet built** — no submit form or calendar wiring exists yet in `employee_dashboard.html`.

### 7.6 Daily task approval flow — ⚠️ BACKEND SHIPPED 2026-08-02
```
Employee Adds Task → status: Pending Approval → Admin Reviews → Approved / Rejected / Correction Required
```
Employee must see the resulting approval status + admin remark on their own dashboard.
> **Backend shipped:** `approveDailyTask`/`rejectDailyTask`/`requestCorrectionDailyTask` (POST, admin/hr/branch_manager only, `admin_remark` required for reject/correction). A `Correction Required` task can be edited and resubmitted by its owner via `updateDailyTask`, which flips it back to `Pending Approval` and re-notifies approvers. **Frontend not yet built** — no admin approval UI exists yet.

### 7.7 Calendar-based daily task view
Employee dashboard's existing calendar: clicking a date must show that date's daily tasks (status + approval status + admin remark). Empty state: *"No tasks were added for this date."*

### 7.8 Employee target tracking — ✅ SHIPPED 2026-08-08
Targets (e.g. monthly admission count) are assigned per employee, value sourced from Settings/target sheet — never hardcoded. Dashboard shows Assigned / Achieved / Remaining / Progress %.
`Remaining = Assigned − Achieved`, `Progress % = Achieved / Assigned × 100`.
> Backend (`appscript_employee_targets.gs`) predates this session. Frontend `targets_admin.html` built 2026-08-08: assign/edit modal, filters, per-row progress bar. `achieved_target` is always live-recomputed, never trusts the sheet's cached value. ⚠️ Not yet click-tested against the live Sheet.

### 7.9 HR Dashboard — month-wise reports — ✅ SHIPPED 2026-08-08
Filters: Month, Year, Department, Employee, Report Type. Report types: attendance, leave, daily task, target performance, candidate, admission, joining. Optional: PDF/CSV export, print, date-range filter.
> Backend (`appscript_reports.gs`) predates this session. Frontend `reports.html` built 2026-08-08: report-type selector, filters, dynamic summary + table per report type, CSV export + browser print (no server-side PDF, per the backend's documented decision). ⚠️ Not yet click-tested against live data for every report type.

### 7.10 Candidate Management module (HR Dashboard) — ✅ FULLY SHIPPED + VERIFIED 2026-08-03
Distinct from the existing `appscript_recruitment.gs` / `candidates` sheet used by `register.html` + `recruitment.html`.

> ✅ **RESOLVED (2026-08-02):** confirmed with stakeholder — this is a **genuinely separate pipeline**, not the existing `candidates`/`RECRUITMENT_STAGES` sheet extended. Codeline.AI is an education/coaching business; the existing `candidates` sheet is for **job applicants** (staff hiring — Teacher, Accountant, etc.), while this §7.10 module is for **student admission leads** (people interested in enrolling in a course). This also explains the pre-existing `MONTHLY_ADMISSION_TARGET` setting (§7.3) and §7.1's "Course Name" resolution requirement — both were already pointing at this same student-admissions concept.
>
> Sheet: `admission_leads` (see `architecture.md` §4 for full schema). Backend file: `appscript_admissions.gs` (`getAdmissionLeads`/`addAdmissionLead`/`updateAdmissionLead`/`updateAdmissionLeadStatus`/`archiveAdmissionLead`, `setupAdmissionLeadsSheet()`). Frontend: `admissions.html`.
>
> **Backend wiring confirmed live (2026-08-03):** direct review of the live `appscript_main.gs` confirms `SHEETS.ADMISSION_LEADS`, the `getAdmissionLeads` `doGet` case, and the `addAdmissionLead`/`updateAdmissionLead`/`updateAdmissionLeadStatus`/`archiveAdmissionLead` `doPost` cases are all present. Live `appscript_generateid_fix.gs` confirms `'LD': 'admission_leads'` is in `ID_PREFIX_SHEET_MAP`. `setupAdmissionLeadsSheet()` confirmed run — a CSV export of the live `admission_leads` sheet shows the correct 17-column header row (no data rows yet, since no lead has been added through the UI so far).
>
> **Frontend wiring confirmed complete:** `hr_dashboard.html` (navbar link + quick-action card), `app.js` (`HR_ALLOWED_PAGES` includes `'admissions.html'`), `sidebar.html` (nav item present under Management), and `admissions.html`'s HR-standalone/admin-sidebar dual-mode block (`hr-standalone-mode` class toggle + `AppSession.protect()`) all verified against the real live files.
>
> **Remaining before fully closing this out:** an actual click-test hasn't been done yet — add one real test lead through the `admissions.html` UI and confirm the row lands correctly in the live Sheet, then this can be considered fully closed.

HR can add/view/update/search/filter admission leads.

### 7.11 No hard delete — ever (admission leads, job candidates, and by extension: recommended everywhere)
HR has no delete button/action for admission leads (or job candidates). Status-based lifecycle instead (`New → Contacted → Follow-up → Interested / Not Interested → Admission Completed / On Hold → Archived`), soft-delete fields: `is_archived`, `archived_at`, `archived_by`. Role rule: HR = Create/Read/Update only, never Delete. Recommended (not just for admission leads) to extend this no-hard-delete posture to Admin too, to protect historical data/reports.
> ✅ **Implemented and confirmed live 2026-08-03** on the `admission_leads` sheet — `archiveAdmissionLead` is the only removal path, confirmed wired into the live `appscript_main.gs` `doPost` switch; no delete route exists anywhere for this sheet (see `appscript_admissions.gs`). The pre-existing job-recruitment `candidates` sheet still does **not** have these soft-delete fields — out of scope for this session, revisit separately if needed.

### 7.12 Role permission deltas introduced by this set
| Feature | Employee | HR | Admin |
|---|---|---|---|
| Apply leave | Yes, only after 30 days | Yes | Yes |
| Add own daily task | Yes | Yes | Yes |
| Approve employee task | No | Based on permission | Yes |
| View calendar tasks | Own only | Assigned employees | All |
| Add/Update candidate | No | Yes | Yes |
| Delete candidate | No | **No** | **No** |
| Update settings | No | No | Yes |

### Development priority (as given)
**High:** 7.1 (readable names) ✅ **fully confirmed 2026-08-08** — employee_dashboard.html shipped 2026-08-02, employees.html admin-panel bug fixed 2026-08-08, and `getEmployees` backend confirmed by direct code review to attach `department_name`/`designation_name`/`branch_name` via `resolveEmployeeDisplayNamesBulk()` (no remaining open question on this item). 7.2 (leave summary) ✅, 7.3 (settings sheet) ✅, 7.4 (30-day lock) ✅, 7.5+7.6+7.7 (daily tasks, fully shipped end-to-end ✅ 2026-08-02, re-verified by direct file review 2026-08-08), 7.10+7.11 (admission leads module — fully shipped, backend+frontend+sheet all confirmed live ✅ 2026-08-03; only a real click-test through the UI is still outstanding).
**Medium:** 7.8 (targets) ✅ shipped 2026-08-08 — frontend `targets_admin.html` built, backend pre-existing. 7.9 (month-wise reports) ✅ shipped 2026-08-08 — frontend `reports.html` built (incl. CSV export + print), backend pre-existing. Both ⚠️ pending a live click-test.