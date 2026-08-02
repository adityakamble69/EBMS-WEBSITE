# phases.md — Project Phases

This project is already substantially built. Phases below are reconstructed from the codebase's own comments/history (e.g. "PHASE 7 UPDATE" in `appscript_main.gs`) plus logical grouping, so future work has a consistent place to slot into. Mark items `[x]` as verified-in-production, `[~]` if built but unverified/needs testing, `[ ]` if not yet started.

---

## Phase 0 — Foundation
- [x] Google Sheet created with core tabs (branches, employees, admin_users, etc.)
- [x] Apps Script project + `doGet`/`doPost` router (`appscript_main.gs`)
- [x] Token-based auth (login/logout/change password) — `appscript_auth.gs`
- [x] Shared sheet CRUD helpers (`getSheetData`, `appendRow`, `updateRow`, `findRow`)
- [x] Response helpers (`sendSuccess`/`sendError`) + pagination helper
- [x] Base frontend shell — `index.html`, `app.js`, `style.css`, `sidebar.html`

## Phase 1 — Core HR data
- [x] Employee CRUD (`appscript_employees.gs`, `employees.html`)
- [x] Branches / Departments / Designations CRUD (`appscript_branches.gs`, `settings.html`)
- [x] Role-based access (`super_admin` / `hr` / `branch_manager` / `employee`) + `EMPLOYEE_ALLOWED_*` whitelists

## Phase 2 — Attendance
- [x] Session-based punch in/out (`appscript_attendance.gs`)
- [x] Admin force-update attendance
- [x] Public GPS-geofenced self-punch kiosk flow (`attendance_qr.html`, `appscript_branch_location.gs`)
- [x] Universal-link branch auto-detection (`findBranchByLocation`) — replaced per-branch QR codes
- [x] Attendance sheet simplified to 6 columns, matched by Email+Date

## Phase 3 — Leave & Expense management
- [x] Leave apply/approve/reject + notifications (`appscript_leaves.gs`)
- [x] Expense claim apply/approve/reject (`appscript_expenses.gs`)
- [x] Holiday calendar CRUD (`appscript_holidays.gs`)

## Phase 4 — Payroll
- [x] Salary structure setup (Basic+HRA+Allowances−PF model)
- [x] Monthly slip auto-generation with attendance-based deductions
- [x] Migration from legacy flat-rate salary schema
- [x] Single salary-slip detail fetch bundled with employee name/designation

## Phase 5 — Recruitment
- [x] Public candidate registration form with Drive file uploads (`register.html`)
- [x] Job openings CRUD (admin + public "open jobs" list)
- [x] Candidate pipeline (`applied → screening → hr_calling → interview → round1 → round2 → offered → hold → hired/rejected`)
- [x] Auto-conversion of `hired` candidate → new `employees` row (duplicate-safe by email)
- [x] Hire modal captures branch/department/designation/shift/joining date at hire time

## Phase 6 — Documents & Notifications
- [x] HR letter auto-generation (Offer / Appointment / Warning)
- [x] Bank details one-time submission + admin verify/reject
- [x] Employee document uploads (profile photo / Aadhaar / education-experience), Drive-backed
- [x] Notification center + `notifyUser()` shared helper
- [x] Work-anniversary daily trigger

## Phase 7 — Tasks, Assets, Performance (per in-code "PHASE 7" comment)
- [x] Kanban task lifecycle: `todo → in_progress → in_review → completed`, with revoke/reject-back paths
- [x] Asset registry + assign/return
- [x] KPI/performance review CRUD

## Phase 8 — Data hygiene & correctness fixes
- [x] Sequential per-sheet ID generator, replacing random IDs (`appscript_generateid_fix.gs`)
- [x] Global date/time formatting fix (`formatDateOnly` / `formatTimeOnly`) across every module
- [x] Employee-role defense-in-depth audit (route whitelist + handler-level checks + branch scoping)

## Phase 9 — Onboarding Instructions module (most recent, per code comments)
- [x] `instructions` sheet + `instructions_seen` tracking columns
- [x] `getInstructions` / `markInstructionsSeen` routes
- [x] Wired into `dashboard.html`, `employee_dashboard.html`, `hr_dashboard.html`
- [ ] Confirm wired into any remaining admin-role landing pages if new ones are added

## Phase 10 — Not yet started / candidate future work
> Add items here as they're decided — don't backfill speculative scope without discussion.
- [ ] Birthday notifications (blocked on adding a `dob` column to `employees` — noted as a deliberate gap in `appscript_notifications.gs`)
- [ ] Formal `appscript_setup.gs` / `appscript_rebuild_candidates.gs` — confirm these exist as documented in code comments, or recreate them
- [ ] Automated test coverage (currently none — Apps Script has no formal test harness in this project)
- [ ] Leave day-count math integration with `holidays` sheet (currently informational-only, per `appscript_holidays.gs` header)

## Phase 11 — Portal Enhancement (requirements received 2026-08-02, not yet built)
> Full detail in `PRD.md` §7. Nothing in this phase is built yet — do not check any box until the corresponding backend route + frontend UI both exist and are verified.

**High priority**
- [x] Resolve `department_id`/`designation_id`/`branch_id` → readable names server-side on every employee-profile-facing response (`PRD.md` §7.1) — **shipped 2026-08-02**: `appscript_employees.gs` (`resolveEmployeeDisplayNames`/`Bulk`) + `employee_dashboard.html` (profile card + ID card). ⚠️ `employees.html` (admin panel) still has a related pre-existing bug — see `PRD.md` §7.1 note — not yet fixed.
- [x] Employee leave summary block (Total/Used/Remaining/Pending/Approved/Rejected) on `employee_dashboard.html` (§7.2) — **shipped 2026-08-02**: `getLeaveSummary` GET action (`appscript_leaves.gs`), computed entirely server-side. ⚠️ Assumes calendar-year leave cycle (by `from_date`'s year) — not stakeholder-confirmed against a possible joining-anniversary cycle.
- [x] `settings` sheet + `getSetting(key)` helper (§7.3) — **shipped 2026-08-02**: `appscript_settings.gs` (`getSetting`/`getSettingNumber`, `getSettings`/`updateSetting` routes, `setupSettingsSheet()`), seeded with `ANNUAL_LEAVES`, `NEW_EMPLOYEE_LEAVE_LOCK_DAYS`, `MONTHLY_ADMISSION_TARGET`. Frontend: `settings.html` new "Business Settings" tab (super_admin only). Needed by both §7.4 and §7.8.
- [x] New-employee 30-day leave lock, enforced in `handleApplyLeave()` (§7.4) — **shipped 2026-08-02**: uses `getSettingNumber('NEW_EMPLOYEE_LEAVE_LOCK_DAYS', 30)`. ⚠️ Scope decision (not stakeholder-confirmed): only enforced for self-service (`session.role === 'employee'`) leave applications — admin/hr/branch_manager filing leave on someone's behalf currently bypasses it.
- [x] `daily_tasks` sheet + employee add/list/self-view routes (§7.5) — **shipped 2026-08-02** (backend: `appscript_daily_tasks.gs` — `getDailyTasks`/`addDailyTask`/`updateDailyTask`, `setupDailyTasksSheet()`; frontend: `employee_dashboard.html` — a dedicated **"📝 Daily Tasks"** modal, opened via a navbar button next to "📅 Leave Requests", with a date-picker add form posting to `addDailyTask`/`updateDailyTask`). ⚠️ Assumes `setupDailyTasksSheet()` has actually been run on the live Spreadsheet — not yet confirmed.
- [ ] Daily task admin approval flow + routes (§7.6) — ⚠️ **backend shipped 2026-08-02** (`approveDailyTask`/`rejectDailyTask`/`requestCorrectionDailyTask`), **admin-side frontend still not started** — this is now the only piece blocking this box, since the employee side (submit + resubmit-after-correction, via the navbar modal) is done.
- [x] Calendar date-click → daily tasks for that date, on `employee_dashboard.html` (§7.7) — **shipped 2026-08-02**: every past/today calendar cell is clickable; the day-detail popup shows a **read-only** "📝 Daily Tasks" list for that date (title, times, description, approval badge, admin remark) via `getDailyTasks?date=...`. Empty state uses the PRD's exact copy ("No tasks were added for this date."). Adding/editing a task does **not** happen here — that's the navbar modal's job (see §7.5) — this popup is view-only by design, per user feedback after an earlier draft mixed the two.
- [ ] Candidate Management module on HR Dashboard — **first resolve the schema question in `architecture.md`** (same `candidates` sheet extended vs. separate pipeline) before writing any code (§7.10)
- [ ] Candidate soft-delete only: `is_archived`/`archived_at`/`archived_by` fields, no delete route exposed to HR (§7.11)

**Medium priority**
- [ ] Employee target tracking (`employee_targets` sheet, Assigned/Achieved/Remaining/Progress %) (§7.8)
- [ ] HR Dashboard month-wise reports (filters: month/year/department/employee/report type) (§7.9)
- [ ] Report export (PDF/CSV) + print (§7.9, optional sub-item)

---

## How to add a new phase
1. Confirm the feature's role/branch access rules first (goes in `PRD.md` §2/§3 if it changes user journeys).
2. Add backend route(s) + whitelist entries (`architecture.md` §5, `rules.md` #2).
3. Add/verify sheet schema additively (`rules.md` #7).
4. Build frontend page/section using existing design tokens (`design.md`).
5. Update `README.md` (schema/API tables), this file, and `memory.md`.