# Codeline.AI EBMS
### Employee & Branch Management System

A full-featured HR/Ops platform built entirely on **Google Sheets + Google Apps Script** (backend) and plain **HTML/CSS/JS** (frontend). No external database, no server hosting — everything runs on Google's free infrastructure.

---

## 1. Architecture

```
┌─────────────────────┐        HTTPS (GET/POST, JSON)        ┌──────────────────────┐
│   Frontend (HTML)    │ ───────────────────────────────────▶ │  Apps Script Web App │
│  dashboard.html       │                                       │  (doGet / doPost)     │
│  employee_dashboard   │ ◀─────────────────────────────────── │                        │
│  hr_dashboard.html    │        JSON { status, data, msg }     └──────────┬─────────────┘
│  attendance_qr.html   │                                                  │
│  register.html        │                                                  ▼
│  settings.html …      │                                       ┌──────────────────────┐
└─────────────────────┘                                        │   Google Sheet (DB)   │
                                                                  │  one tab = one table  │
                                                                  └──────────────────────┘
```

- **Database:** every "table" is a tab in a single Google Sheet. Row 1 = headers, used as JSON keys.
- **Backend:** one Apps Script project, split across multiple `.gs` files (Apps Script merges them all — file order doesn't matter, function names must be globally unique).
- **API contract:** a single Web App URL (`API_URL`, defined in `app.js`). All reads go through `doGet(e)` with `?action=...`, all writes go through `doPost(e)` with a JSON body `{ action, token, ...fields }`.
- **Auth:** custom token-based sessions stored in `PropertiesService` (not Google's built-in auth). Tokens expire after 8 hours and auto-extend on each valid call.

---

## 2. Google Sheet Tabs (Database Schema)

| Sheet | Key columns | Notes |
|---|---|---|
| `admin_users` | user_id, name, email, password, role, branch_id, status, **instructions_seen** | Only `super_admin` / `hr` / `branch_manager` logins. No `employee` rows here. |
| `employees` | emp_id, name, email, password, mobile, branch_id, department_id, designation_id, joining_date, employment_type, weekly_off, default_shift_id, status, **instructions_seen** | Employees log in directly from this sheet (own `password` column) — no separate `users` sheet. |
| `branches` | branch_id, branch_name, city, address, phone, email, manager_id, latitude, longitude, radius, status | `latitude`/`longitude`/`radius` power the GPS geofence self-punch flow. |
| `departments` | dept_id, dept_name, branch_id, status | |
| `designations` | desig_id, desig_name, dept_id, status | |
| `attendance` | Name, Phone, Email, Date, In-Time, Out-Time | **Simplified schema** — no `att_id`/`emp_id`/`branch_id`. Row is matched by `Email + Date`. |
| `shifts` | shift_id, shift_name, start_time, end_time, branch_id, status | Shift *templates* (Morning/Evening etc). |
| `shift_assignments` | assign_id, emp_id, shift_id, date, branch_id, created_at | Date-specific roster override; one row per employee+date (upsert). |
| `leave_requests` | leave_id, emp_id, branch_id, leave_type, from_date, to_date, days, reason, status, approved_by, applied_on | |
| `salaries` | sal_id, emp_id, employment_type, basic_salary, hra, allowances, pf_deduction, effective_from, status | Detailed payroll model. |
| `salary_slips` | slip_id, emp_id, branch_id, month, year, present_days, absent_days, gross_salary, deductions, net_salary, generated_on, status | Auto-generated, one per emp/month/year. |
| `performance` | perf_id, emp_id, branch_id, month, year, kpi_data, score, remarks, reviewed_by, reviewed_on | |
| `tasks` | task_id, title, assigned_to, assigned_by, branch_id, due_date, priority, status, submission_link, submission_status, reviewed_by, review_note | Kanban: `todo → in_progress → in_review → completed`. |
| `assets` | asset_id, asset_name, asset_type, serial_no, assigned_to, branch_id, assigned_on, returned_on, status | |
| `documents` | doc_id, emp_id, doc_type, generated_on, generated_by, content, status | Auto-generated HR letters (Offer/Appointment/Warning). |
| `notifications` | notif_id, user_id, type, branch_id, title, message, is_read, created_at | Written by `logActivity()` and `notifyUser()` from every module. |
| `holidays` | holiday_id, name, date, type, branch_id, recurring, created_at | |
| `expenses` | expense_id, emp_id, branch_id, category, amount, date, description, receipt_url, status, approved_by, applied_on | |
| `job_openings` | job_id, title, branch_id, dept_id, status, created_at | |
| `candidates` | candidate_id, job_id, name, dob, gender, mobile, email, …, stage, applied_on | Pipeline: `applied → screening → hr_calling → interview → round1 → round2 → offered → (hold) → hired / rejected`. On `hired`, auto-converts to an `employees` row. |
| `bank_details` | emp_id, account_holder_name, account_number, ifsc_code, bank_name, passbook_url, submitted_at, status | One-time submission per employee. |
| `employee_documents` | doc_id, emp_id, doc_category, file_name, file_url, uploaded_at | profile_photo / aadhaar_pdf / education_experience — one per category per employee. |
| `instructions` **(new)** | instr_id, role, title, content, display_order, status, created_at | Onboarding popup content — see §6. |
| `settings` **(new, Phase 11)** | setting_id, setting_key, setting_value, description, updated_at, updated_by | Central config for business-tunable values (`ANNUAL_LEAVES`, `NEW_EMPLOYEE_LEAVE_LOCK_DAYS`, `MONTHLY_ADMISSION_TARGET`) — read via `getSetting(key)`/`getSettingNumber(key)`. Admin-only write. |
| `daily_tasks` **(new, Phase 11 — backend shipped 2026-08-02)** | task_id, employee_id, task_title, task_description, task_date, start_time, completion_time, task_status, approval_status, employee_remark, admin_remark, approved_by, approved_at | Employee-authored, self-reported daily work log — submitted for admin approval. Distinct from the admin-assigned Kanban `tasks` sheet (see §3, `appscript_tasks.gs`). `approval_status` lifecycle: `Pending Approval → Approved / Rejected / Correction Required`; a `Correction Required` task can be edited and resubmitted by its owner via `updateDailyTask`. ⚠️ Sheet created via one-time `setupDailyTasksSheet()` — confirm it's been run on the live Spreadsheet. ✅ Full frontend shipped 2026-08-02: employee submit form + §7.7 calendar date-click view (`employee_dashboard.html`), and admin approval UI (`daily_tasks_admin.html`, see §7). |
| `admission_leads` **(new, Phase 11 §7.10/§7.11 — fully shipped + verified live 2026-08-03)** | lead_id, name, mobile, email, course_interested, source, branch_id, status, remark, follow_up_date, assigned_to, is_archived, archived_at, archived_by, created_by, created_at, updated_at | Student **course-enrollment leads** — a genuinely separate pipeline from the job-recruitment `candidates` sheet (Codeline.AI is an education/coaching business; this covers people interested in enrolling, not job applicants). Status lifecycle: `New → Contacted → Follow-up → Interested / Not Interested → Admission Completed / On Hold → Archived`. `Archived` is only reachable via `archiveAdmissionLead` (soft-delete: `is_archived`/`archived_at`/`archived_by`) — **no hard-delete route exists**, and HR is never given one (role rule, not just a UI omission — see `rules.md` #16). Not accessible to `employee` role. Sheet created via one-time `setupAdmissionLeadsSheet()` — confirmed run on the live Spreadsheet (correct 17-column header row exported and verified). ⚠️ One real lead has not yet been added through the `admissions.html` UI to confirm the full request→Apps Script→Sheet round-trip — recommended before treating this as 100% closed end-to-end. |
| `hr_targets` **(new, Phase 11 §7.8 — REBUILT 2026-08-08, replaces retired `employee_targets`)** | target_id, hr_id, hr_name, target_month, target_year, assigned_target, achieved_target, status, created_by, created_at, updated_at | ⚠️ **Scope correction (2026-08-08):** targets go to an **HR user** (`hr_id` → `admin_users.user_id`, `role === 'hr'`), not to individual employees — the original per-employee `employee_targets` build was a misread of the requirement (Admin assigns HR a monthly admissions target; employees never get one). `hr_name` is a denormalized display-cache snapshot, not kept in sync if the HR's name changes later. `achieved_target` in the sheet is a **cache only** — every GET recomputes it live from `admission_leads` (status = `Admission Completed`, matched by `assigned_to` against this row's `hr_id` + `updated_at` falling in the target's month/year — same documented proxy caveat as before, not stakeholder-confirmed). `assigned_target` defaults to the `MONTHLY_ADMISSION_TARGET` setting if left blank. No `branch_id` column (HR is not branch-scoped). Sheet created via one-time `setupHrTargetsSheet()` — ⚠️ not yet confirmed run on the live Spreadsheet. ⚠️ **Blocking dependency:** `admission_leads.assigned_to` must be set to an HR's `user_id` for `achieved_target` to ever be non-zero — `admissions.html`'s "Assigned To" field needs checking/updating (not done this session). Old `employee_targets` sheet left in place, un-deleted (rules.md #5) — a `deactivateLegacyEmployeeTargets()` helper flips its rows to `inactive` without touching the sheet. |

---

## 3. Backend Files (Apps Script `.gs`)

| File | Responsibility |
|---|---|
| `appscript_main.gs` | Central router — `doGet`/`doPost`, `SHEETS` map, employee-role whitelists, all sheet CRUD helpers (`getSheetData`, `appendRow`, `updateRow`, `findRow`), date/time formatters, `sendSuccess`/`sendError`, dashboard summary handler. |
| `appscript_auth.gs` | Login (admin_users → employees fallback), logout, change password, token issue/verify, permission checks, activity logging, `getAdminUsers`. |
| `appscript_employees.gs` | Employee CRUD, self-punch identity verification (`verifyEmployeeSelf`), profile fetch, weekly-off self-service. ✅ **Confirmed 2026-08-08:** `handleGetEmployees()` (list route) calls `resolveEmployeeDisplayNamesBulk(employees)` before pagination, so every row carries `department_name`/`designation_name`/`branch_name` alongside the raw codes — closes the §7.1 open question, see `PRD.md` §7.1. |
| `appscript_attendance.gs` | Punch in/out (session-based **and** public self-punch), attendance history, admin force-update. Uses the simplified 6-column sheet + Email+Date matching. |
| `appscript_leaves.gs` | Apply/approve/reject leave, with notifications to approvers and applicant. |
| `appscript_salary.gs` | Salary structure setup, payslip generation (Basic+HRA+Allowances−PF model), one-time migration from the old flat-rate schema. |
| `appscript_documents.gs` | HR letter generation (Offer/Appointment/Warning), documents archive. |
| `appscript_branches.gs` | Branches/Departments/Designations — add, edit, activate/deactivate, active-only vs full list. |
| `appscript_tasks.gs` | Kanban task lifecycle (add/assign/revoke/submit/accept/reject), one-time sheet setup helper. |
| `appscript_notifications.gs` | Notification center CRUD, `notifyUser()` shared helper, work-anniversary daily trigger. |
| `appscript_holidays.gs` | Company holiday calendar CRUD. |
| `appscript_expenses.gs` | Expense claim apply/approve/reject. |
| `appscript_shifts.gs` | Shift templates + roster assignment (upsert by emp+date), role-scoped roster viewing. |
| `appscript_recruitment.gs` | Job openings, candidates, public registration form (with Google Drive file uploads), stage pipeline, auto hire-to-employee conversion. |
| `appscript_bankdocs.gs` | Bank details submission/verification, employee document uploads (Drive-backed), deletion. |
| `appscript_branch_location.gs` | Geofence lookup by branch_id, and **universal-link** `findBranchByLocation` (GPS → nearest matching branch, no branch code in the QR). |
| `appscript_assets.gs` | Asset registry + assign/return. |
| `appscript_performance.gs` | KPI review CRUD. |
| `appscript_salaryslip.gs` | Single salary-slip detail fetch (bundled with employee name/designation). |
| `appscript_generateid_fix.gs` | Sequential, per-sheet ID generator (`EMP001`, `BR002`, etc.) — replaces old random-ID generator, ignores legacy junk IDs. |
| `appscript_instructions.gs` **(new)** | Onboarding popup — role-based instructions fetch + "seen" tracking. See §6. |
| `appscript_settings.gs` **(new, Phase 11)** | Central `settings` sheet — `getSetting(key)`/`getSettingNumber(key)` read helpers (used by other modules server-side, e.g. the leave lock), `getSettings`/`updateSetting` API routes (super_admin only), one-time `setupSettingsSheet()`. |
| `appscript_daily_tasks.gs` **(new, Phase 11 — backend shipped 2026-08-02)** | `daily_tasks` sheet — employee add/edit + admin approve/reject/request-correction routes, one-time `setupDailyTasksSheet()`. Separate module from `appscript_tasks.gs` (Kanban) — see §2 note. |
| `appscript_admissions.gs` **(new, Phase 11 §7.10/§7.11 — fully shipped + verified live 2026-08-03)** | `admission_leads` sheet — `getAdmissionLeads` (GET, role-filtered: branch_manager scoped via `canAccessBranch()`, hr/super_admin see all; `?status=`/`?branch_id=`/`?assigned_to=`/`?course=`/`?include_archived=1` filters), `addAdmissionLead`/`updateAdmissionLead` (POST), `updateAdmissionLeadStatus` (POST, blocks setting `Archived` directly), `archiveAdmissionLead` (POST, the only path to `Archived`), one-time `setupAdmissionLeadsSheet()`. Deliberately excluded from both `EMPLOYEE_ALLOWED_*` whitelists. Separate module from `appscript_recruitment.gs` (job applicants) — see §2 note. |
| `appscript_hr_targets.gs` **(new, Phase 11 §7.8 — REBUILT 2026-08-08, replaces retired `appscript_employee_targets.gs`)** | `hr_targets` sheet — `getHrTargets` (GET; `super_admin` sees all HR targets with optional `?hr_id=` filter, `hr` sees only their own, enforced in-handler; `?month=`/`?year=`/`?status=` filters; live-recomputes `achieved_target`/`remaining_target`/`progress_percent` on every call), `assignHrTarget` (POST, **super_admin only** — validates target `hr_id` is a real active `role === 'hr'` `admin_users` row, blocks duplicate active target for same HR+month+year), `updateHrTarget` (POST, **super_admin only**, edits `assigned_target`/`status` only), one-time `setupHrTargetsSheet()`, plus `deactivateLegacyEmployeeTargets()` migration helper. NOT added to any `EMPLOYEE_ALLOWED_*` whitelist — employees have zero visibility, matching the corrected model. Wiring patch (exact `appscript_main.gs`/`appscript_generateid_fix.gs` edits): `hr_targets_wiring_patch.md`. |
| `appscript_reports.gs` **(new, Phase 11 §7.9 — backend pre-dates 2026-08-08, frontend shipped 2026-08-08)** | Read-only aggregation across existing sheets — `getMonthlyReport` (GET, super_admin/hr/branch_manager only), 7 report builders (attendance/leave/daily_task/target/candidate/admission/joining), each returning `{rows, summary}`. Department filter resolves every employee's department via `resolveEmployeeDisplayNamesBulk()` before matching, so it works regardless of whether an individual employee row still holds a raw code or already holds a plain name. No new sheet, no new writes. CSV export + print are frontend-only (`reports.html`) — no server-side PDF generation. |

**Convention used everywhere:** every date/time value is converted to a plain string (`dd-MM-yyyy` / `HH:mm`, IST) via `formatDateOnly()` / `formatTimeOnly()` **right before the response is sent** — never a raw `Date` object, because `JSON.stringify()` silently UTC-shifts those and breaks the frontend.

---

## 4. Roles & Permissions

| Role | Lives in | Scope |
|---|---|---|
| `super_admin` | `admin_users` | Full access — all branches, all modules, Settings page. |
| `hr` | `admin_users` | All branches for employees/leaves/expenses/recruitment/payroll. No Settings/branch-edit access. |
| `branch_manager` | `admin_users` | Own branch only. |
| `employee` | `employees` | Only their own data. Hard-blocked (403) from any admin-panel action via `EMPLOYEE_ALLOWED_GET_ACTIONS` / `EMPLOYEE_ALLOWED_POST_ACTIONS` whitelists in `appscript_main.gs`, even if they get a valid token. |

**Self-Punch (fully public, no login):** `attendance_qr.html` uses a GPS geofence + one-time name/email/mobile verification (`verifyEmployeeSelf`) instead of a token — see `SELF_PUNCH_GET_ACTIONS` / `SELF_PUNCH_POST_ACTIONS`.

---

## 5. API Reference (by module)

> Base pattern — **GET:** `API_URL?action=<name>&token=<token>&...params`
> **POST:** `fetch(API_URL, { method:'POST', body: JSON.stringify({ action, token, ...fields }) })`

| Module | GET actions | POST actions |
|---|---|---|
| Auth | `login`, `getProfile`, `getAdminUsers` | `login`, `logout`, `changePassword` |
| Employees | `getEmployees`, `getEmployee` | `addEmployee`, `updateEmployee`, `deleteEmployee`, `setMyWeeklyOff` |
| Attendance | `getAttendance` | `markAttendance`, `updateAttendance`, `verifyEmployeeSelf` |
| Leaves | `getLeaves`, `getLeaveSummary` | `applyLeave`, `approveLeave`, `rejectLeave` |
| Payroll | `getSalaries`, `getSalarySlips`, `getSingleSalarySlip`, `migrateSalaries` | `setSalary`, `generateSlip` |
| Documents | `getDocuments` | `generateDocument` |
| Branches/Depts/Desigs | `getBranches`, `getDepartments`, `getDesignations`, `getAllDepartments`, `getAllDesignations` | `addBranch`, `updateBranch`, `addDepartment`, `updateDepartment`, `addDesignation`, `updateDesignation` |
| Tasks (Kanban) | `getTasks` | `addTask`, `assignTask`, `revokeTask`, `updateTask`, `submitTask`, `acceptSubmission`, `rejectSubmission` |
| **Daily Tasks (Phase 11)** | **`getDailyTasks`** (`?date=`, `?from_date=&to_date=`, `?emp_id=`, `?approval_status=` filters) | **`addDailyTask`**, **`updateDailyTask`** (employee); **`approveDailyTask`**, **`rejectDailyTask`**, **`requestCorrectionDailyTask`** (admin/hr/branch_manager only) |
| **Admission Leads (Phase 11 §7.10/§7.11)** | **`getAdmissionLeads`** (`?status=`, `?branch_id=`, `?assigned_to=`, `?course=`, `?include_archived=1` filters; role/branch-scoped) | **`addAdmissionLead`**, **`updateAdmissionLead`**, **`updateAdmissionLeadStatus`**, **`archiveAdmissionLead`** (hr/branch_manager/super_admin only — never `employee`, no delete route) |
| **HR Targets (Phase 11 §7.8 — rebuilt 2026-08-08)** | **`getHrTargets`** (`?hr_id=`, `?month=`, `?year=`, `?status=` filters; `hr` sees only own, `super_admin` sees all) | **`assignHrTarget`** (super_admin only), **`updateHrTarget`** (super_admin only) |
| **Reports (Phase 11 §7.9)** | **`getMonthlyReport`** (`?report_type=` required — `attendance`\|`leave`\|`daily_task`\|`target`\|`candidate`\|`admission`\|`joining`; `?month=`, `?year=`, `?department=`, `?emp_id=` filters; super_admin/hr/branch_manager only) | — (read-only) |
| Notifications | `getNotifications`, `migrateNotifications` | `markNotificationRead`, `markAllNotificationsRead`, `sendAnnouncement` |
| Holidays | `getHolidays` | `addHoliday`, `deleteHoliday` |
| Expenses | `getExpenses` | `applyExpense`, `approveExpense`, `rejectExpense` |
| Shifts | `getShifts`, `getShiftRoster` | `addShift`, `assignShiftRoster`, `removeShiftAssignment` |
| Recruitment | `getJobOpenings`, `getJobOpeningsPublic` (public), `getCandidates` | `addJobOpening`, `addCandidate`, `updateCandidateStage`, `registerCandidate` (public) |
| Bank/Docs | `getBankDetails`, `getMyDocuments` | `submitBankDetails`, `updateBankDetailsStatus`, `uploadDocument`, `deleteDocument` |
| Assets | `getAssets` | `addAsset`, `assignAsset` |
| Performance | `getPerformance` | `savePerformance` |
| Geofence | `getBranchLocation`, `findBranchByLocation` (public) | — |
| Dashboard | `getDashboard` | — |
| **Instructions** | **`getInstructions`** | **`markInstructionsSeen`** |
| **Settings (Phase 11)** | **`getSettings`** (super_admin only) | **`updateSetting`** (super_admin only) |

---

## 6. Onboarding Instructions Module *(new)*

**Goal:** the first time any user (employee, HR, branch manager, super admin) opens their dashboard, they see a role-specific welcome popup — content is 100% controlled from the `instructions` Google Sheet tab, never hardcoded in the frontend.

**Sheet:** `instructions`
| Column | Meaning |
|---|---|
| `instr_id` | e.g. `INS001` |
| `role` | `employee` \| `hr` \| `branch_manager` \| `super_admin` \| `all` |
| `title` | Card heading |
| `content` | Card body text |
| `display_order` | Sort order within a role |
| `status` | `active` / `inactive` |
| `created_at` | Auto |

**"First time" tracking:** a boolean `instructions_seen` column on `employees` (and `admin_users`), flipped to `true` after the popup is dismissed once — it never shows again for that user.

**Flow:**
1. Dashboard loads → calls `getInstructions` (GET, token required).
2. Backend resolves the caller's role from the session, pulls all `active` rows where `role` matches the session role **or** `role = 'all'`, sorted by `display_order`.
3. If `already_seen` is `true`, or there are no rows, nothing is shown.
4. Otherwise the modal renders each row as a card; the "Got it, let's go →" button calls `markInstructionsSeen` (POST), which flips the flag and closes the modal.

**Editing content:** just edit/add/delete rows directly in the `instructions` sheet — no code changes, no redeploy needed.

**One-time setup:** run `setupInstructionsModule()` once from the Apps Script editor. It creates the `instructions` sheet (with a few starter sample rows) and adds the `instructions_seen` column to `employees` + `admin_users` if missing (idempotent — safe to re-run).

**Wired into:** `dashboard.html`, `employee_dashboard.html`, `hr_dashboard.html` — each calls `initOnboardingInstructions()` inside its `DOMContentLoaded` handler.

---

## 7. Frontend Pages

| Page | Audience | Purpose |
|---|---|---|
| `index.html` | Everyone | Login page. |
| `dashboard.html` | super_admin / hr / branch_manager | Admin overview — employee counts, attendance, pending leaves, payroll expense. |
| `employee_dashboard.html` | employee | Personal dashboard — attendance calendar, tasks, leaves, salary slips, ID card, bank/docs, weekly-off. |
| `hr_dashboard.html` | hr | Recruitment pipeline overview. |
| `hr_recruitment.html` | hr | Full candidate/job-opening management (Kanban-style stage pipeline, Hire modal → converts candidate to employee). |
| `attendance_qr.html` | employee (public kiosk) | Universal-link self-punch: GPS geofence detects the branch automatically, no QR-per-branch needed. |
| `register.html` | Public (job applicants) | Candidate self-registration form with file uploads (photo, signature, Aadhaar, experience docs) straight to Google Drive. |
| `settings.html` | super_admin | Branches / Departments / Designations management + password change + **Business Settings tab (Phase 11)** for `ANNUAL_LEAVES`, `NEW_EMPLOYEE_LEAVE_LOCK_DAYS`, `MONTHLY_ADMISSION_TARGET`, etc. |
| `daily_tasks_admin.html` **(new, Phase 11 §7.6 — shipped 2026-08-02)** | super_admin / hr / branch_manager | Review employee-submitted Daily Tasks — filterable list (approval status / employee / date range) + review modal (Approve / Reject / Request Correction, remark required for the latter two). Reachable via `sidebar.html` for super_admin/branch_manager, and via a dedicated top-navbar tab on `hr_dashboard.html` for HR (added to `app.js`'s `HR_ALLOWED_PAGES` since HR is otherwise locked to `hr_dashboard.html`/`hr_recruitment.html`). |
| `admissions.html` **(new, Phase 11 §7.10/§7.11 — fully shipped + verified live 2026-08-03)** | super_admin / hr / branch_manager | Manage student **Admission Leads** (add/view/update/search/filter, status lifecycle, archive) — distinct from `hr_recruitment.html`'s job-candidate pipeline. HR-standalone/admin-sidebar dual-mode (`hr-standalone-mode` class toggle based on role, `AppSession.protect()`). Reachable via `sidebar.html` nav item (under "Management") and via `hr_dashboard.html`'s navbar link (`🎓 Admissions`) + quick-action card for HR; added to `app.js`'s `HR_ALLOWED_PAGES`. |
| `targets_admin.html` **(Phase 11 §7.8 — REBUILT 2026-08-08)** | super_admin (assign/edit) / hr (read-only, own target only) | Assign/edit **HR Targets** — stats row, HR-picker (sourced from `getAdminUsers`, filtered to `role === 'hr'`)/month/year/status filters, assign+edit modal, per-row live progress bar. Assign/edit controls hidden entirely for `hr` viewers (read-only banner shown instead) — only `super_admin` can assign or edit. Same HR-standalone/admin-sidebar dual-mode pattern as `daily_tasks_admin.html`/`admissions.html`. Reachable via `sidebar.html` + `hr_dashboard.html` navbar/quick-action. ⚠️ Depends on `admissions.html`'s "Assigned To" field pointing at HR users — not yet confirmed/fixed (see §2/§3 notes). |
| `reports.html` **(new, Phase 11 §7.9 — shipped 2026-08-08)** | super_admin / hr / branch_manager | HR month-wise reports — report-type selector (7 types), month(optional)/year/department/employee filters, dynamic summary cards + table matched to each report type's column shape, CSV export + browser print. Same dual-mode pattern as the other new Phase 11 admin pages. Reachable via `sidebar.html` + `hr_dashboard.html`. |
| `salary.html`, `leaves.html`, `shifts.html`, `employees.html`, etc. | admin roles | Module-specific admin screens. |

All pages share a common `app.js` (defines `API_URL`, `AppSession` helper for token/user storage) and a consistent dark glassmorphism theme (`--bg-base`, `--glass-border`, `--radius` CSS variables).

---

## 8. Key Design Decisions / Gotchas

- **No `users` sheet.** Admin-side logins live in `admin_users`; employee logins live directly on `employees` (their own `password` column). `handleLogin()` checks `admin_users` first, then falls back to `employees`.
- **Attendance sheet is intentionally minimal** (`Name, Phone, Email, Date, In-Time, Out-Time`) — rows are matched by `Email + Date`, not a synthetic ID, to keep the sheet human-readable.
- **Self-punch security model:** GPS geofence is the real boundary; the one-time name/email/mobile check (`verifyEmployeeSelf`) is a UX convenience, not cryptographic security — documented explicitly in `appscript_employees.gs`.
- **Sequential IDs:** `generateId(prefix)` scans the target sheet's existing IDs and picks up the next number, ignoring old "random junk" IDs with 7+ digit suffixes (from a pre-fix era).
- **Date/Time on the wire is always a plain string**, never a raw `Date` — see `formatDateOnly()` / `formatTimeOnly()` in `appscript_main.gs`. This fixes a historical Google Sheets timezone quirk (pre-1900 dates use a non-+5:30 IST offset internally).
- **Employee role is defense-in-depth blocked** at three layers: (1) route whitelist in `doGet`/`doPost`, (2) per-handler `checkPermission()`/role checks, (3) branch-scoping via `canAccessBranch()`.

---

## 9. Deployment / Setup Checklist

1. Create the Google Sheet with all tabs listed in §2 (or import the provided CSVs).
2. Open **Extensions → Apps Script**, paste every `.gs` file listed in §3.
3. **Delete any duplicate `generateId()`** definition before pasting `appscript_generateid_fix.gs` (only one copy should exist).
4. Run `setupInstructionsModule()` once (function dropdown → select it → Run) to create the `instructions` sheet and `instructions_seen` columns.
5. Run `setupTasksSheet()` once if setting up Tasks fresh.
6. Run `setupSettingsSheet()` once (Phase 11) to create the `settings` sheet and seed `ANNUAL_LEAVES`/`NEW_EMPLOYEE_LEAVE_LOCK_DAYS`/`MONTHLY_ADMISSION_TARGET` defaults.
7. Run `setupDailyTasksSheet()` once (Phase 11) to create the `daily_tasks` sheet.
8. Run `installNotificationTriggers()` once to enable the daily work-anniversary check.
9. **Deploy → New deployment → Web app** — execute as *Me*, access to *Anyone*. Copy the deployment URL into `app.js` as `API_URL`.
10. Upload/host the HTML files (Google Sites, any static host, or Apps Script `HtmlService` if preferred) alongside `app.js`.
11. Log in with a seeded `admin_users` row (e.g. `admin@codelineai.com` / `Admin@123`) and start configuring branches, departments, designations, and shifts from **Settings**.

---

*This README reflects the state of the codebase as of the latest changes (Phase 11: Settings sheet, 30-day leave lock, Employee leave summary, Daily Tasks module §7.5–§7.7 fully shipped incl. admin approval UI `daily_tasks_admin.html` — 2026-08-02; Admission Leads module §7.10/§7.11 fully shipped + verified live + real click-test passed, incl. `admission_leads` sheet, `appscript_admissions.gs`, and `admissions.html` — 2026-08-03, click-test 2026-08-08; `holidays.html` NaN date-chip bug fixed — 2026-08-08; Reports §7.9 (`reports.html`) frontend shipped, `employees.html` §7.1 display-name bug fixed and fully confirmed (`appscript_employees.gs`'s `getEmployees` verified to attach resolved names) — 2026-08-08; **HR Targets §7.8 scope-corrected and rebuilt 2026-08-08** — targets go to HR users, not employees; new `hr_targets` sheet, `appscript_hr_targets.gs`, rebuilt `targets_admin.html`, replacing the retired per-employee `employee_targets` model — ⚠️ blocked on `admissions.html`'s "Assigned To" field being confirmed/updated to list HR users). Keep it updated as new modules are added.*