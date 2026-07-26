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

---

## 3. Backend Files (Apps Script `.gs`)

| File | Responsibility |
|---|---|
| `appscript_main.gs` | Central router — `doGet`/`doPost`, `SHEETS` map, employee-role whitelists, all sheet CRUD helpers (`getSheetData`, `appendRow`, `updateRow`, `findRow`), date/time formatters, `sendSuccess`/`sendError`, dashboard summary handler. |
| `appscript_auth.gs` | Login (admin_users → employees fallback), logout, change password, token issue/verify, permission checks, activity logging, `getAdminUsers`. |
| `appscript_employees.gs` | Employee CRUD, self-punch identity verification (`verifyEmployeeSelf`), profile fetch, weekly-off self-service. |
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
| Leaves | `getLeaves` | `applyLeave`, `approveLeave`, `rejectLeave` |
| Payroll | `getSalaries`, `getSalarySlips`, `getSingleSalarySlip`, `migrateSalaries` | `setSalary`, `generateSlip` |
| Documents | `getDocuments` | `generateDocument` |
| Branches/Depts/Desigs | `getBranches`, `getDepartments`, `getDesignations`, `getAllDepartments`, `getAllDesignations` | `addBranch`, `updateBranch`, `addDepartment`, `updateDepartment`, `addDesignation`, `updateDesignation` |
| Tasks | `getTasks` | `addTask`, `assignTask`, `revokeTask`, `updateTask`, `submitTask`, `acceptSubmission`, `rejectSubmission` |
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
| `settings.html` | super_admin | Branches / Departments / Designations management + password change. |
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
6. Run `installNotificationTriggers()` once to enable the daily work-anniversary check.
7. **Deploy → New deployment → Web app** — execute as *Me*, access to *Anyone*. Copy the deployment URL into `app.js` as `API_URL`.
8. Upload/host the HTML files (Google Sites, any static host, or Apps Script `HtmlService` if preferred) alongside `app.js`.
9. Log in with a seeded `admin_users` row (e.g. `admin@codelineai.com` / `Admin@123`) and start configuring branches, departments, designations, and shifts from **Settings**.

---

*This README reflects the state of the codebase as of the latest changes (Onboarding Instructions module). Keep it updated as new modules are added.*
