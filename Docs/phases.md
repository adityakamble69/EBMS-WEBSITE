phases.md — Project Phases

This project is already substantially built. Phases below are reconstructed from the codebase's own comments/history (e.g. "PHASE 7 UPDATE" in appscript_main.gs) plus logical grouping, so future work has a consistent place to slot into. Mark items [x] as verified-in-production, [~] if built but unverified/needs testing, [ ] if not yet started.

Phase 0 — Foundation

Google Sheet created with core tabs (branches, employees, admin_users, etc.)

Apps Script project + doGet/doPost router (appscript_main.gs)

Token-based auth (login/logout/change password) — appscript_auth.gs

Shared sheet CRUD helpers (getSheetData, appendRow, updateRow, findRow)

Response helpers (sendSuccess/sendError) + pagination helper

Base frontend shell — index.html, app.js, style.css, sidebar.html

Phase 1 — Core HR data

Employee CRUD (appscript_employees.gs, employees.html)

Branches / Departments / Designations CRUD (appscript_branches.gs, settings.html)

Role-based access (super_admin / hr / branch_manager / employee) + EMPLOYEE_ALLOWED_* whitelists

Phase 2 — Attendance

Session-based punch in/out (appscript_attendance.gs)

Admin force-update attendance

Public GPS-geofenced self-punch kiosk flow (attendance_qr.html, appscript_branch_location.gs)

Universal-link branch auto-detection (findBranchByLocation) — replaced per-branch QR codes

Attendance sheet simplified to 6 columns, matched by Email+Date

Phase 3 — Leave & Expense management

Leave apply/approve/reject + notifications (appscript_leaves.gs)

Expense claim apply/approve/reject (appscript_expenses.gs)

Holiday calendar CRUD (appscript_holidays.gs)

Phase 4 — Payroll

Salary structure setup (Basic+HRA+Allowances−PF model)

Monthly slip auto-generation with attendance-based deductions

Migration from legacy flat-rate salary schema

Single salary-slip detail fetch bundled with employee name/designation

Phase 5 — Recruitment

Public candidate registration form with Drive file uploads (register.html)

Job openings CRUD (admin + public "open jobs" list)

Candidate pipeline (applied → screening → hr_calling → interview → round1 → round2 → offered → hold → hired/rejected)

Auto-conversion of hired candidate → new employees row (duplicate-safe by email)

Hire modal captures branch/department/designation/shift/joining date at hire time

Phase 6 — Documents & Notifications

HR letter auto-generation (Offer / Appointment / Warning)

Bank details one-time submission + admin verify/reject

Employee document uploads (profile photo / Aadhaar / education-experience), Drive-backed

Notification center + notifyUser() shared helper

Work-anniversary daily trigger

Phase 7 — Tasks, Assets, Performance (per in-code "PHASE 7" comment)

Kanban task lifecycle: todo → in_progress → in_review → completed, with revoke/reject-back paths

Asset registry + assign/return

KPI/performance review CRUD

Phase 8 — Data hygiene & correctness fixes

Sequential per-sheet ID generator, replacing random IDs (appscript_generateid_fix.gs)

Global date/time formatting fix (formatDateOnly / formatTimeOnly) across every module

Employee-role defense-in-depth audit (route whitelist + handler-level checks + branch scoping)

Phase 9 — Onboarding Instructions module (most recent, per code comments)

instructions sheet + instructions_seen tracking columns

getInstructions / markInstructionsSeen routes

Wired into dashboard.html, employee_dashboard.html, hr_dashboard.html

Confirm wired into any remaining admin-role landing pages if new ones are added

Phase 10 — Not yet started / candidate future work

Add items here as they're decided — don't backfill speculative scope without discussion.

Leave day-count math integration with holidays sheet (currently informational-only, per appscript_holidays.gs header)

Birthday notifications (add dob to employees, then trigger birthday notifications)

Confirm/recreate formal setup and migration scripts: appscript_setup.gs / appscript_rebuild_candidates.gs

Automated test coverage for core API routes, role permissions, branch scoping, and critical workflows

Phase 11 — Portal Enhancement (requirements received 2026-08-02, not yet built)

Full detail in PRD.md §7. Nothing in this phase is built yet — do not check any box until the corresponding backend route + frontend UI both exist and are verified.

High priority

Resolve department_id/designation_id/branch_id → readable names server-side on every employee-profile-facing response (PRD.md §7.1) — shipped 2026-08-02: appscript_employees.gs (resolveEmployeeDisplayNames/Bulk) + employee_dashboard.html (profile card + ID card). ✅ employees.html (admin panel) bug fixed 2026-08-08: the main employee table row now renders `emp.branch_name || emp.branch_id` and `emp.designation_name || emp.designation_id` instead of the raw code, matching the resolved-name pattern used everywhere else. ✅ **CONFIRMED 2026-08-08** by direct code review of the live `appscript_employees.gs`: `handleGetEmployees()` (list route) calls `resolveEmployeeDisplayNamesBulk(employees)` right after the password-strip/date-format map and before pagination, so every row in the paginated response does carry `department_name`/`designation_name`/`branch_name`. The prior open question is closed — no remaining backend wiring gap on this item.

Employee leave summary block (Total/Used/Remaining/Pending/Approved/Rejected) on employee_dashboard.html (§7.2) — shipped 2026-08-02: getLeaveSummary GET action (appscript_leaves.gs), computed entirely server-side. ⚠️ Assumes calendar-year leave cycle (by from_date's year) — not stakeholder-confirmed against a possible joining-anniversary cycle.

settings sheet + getSetting(key) helper (§7.3) — shipped 2026-08-02: appscript_settings.gs (getSetting/getSettingNumber, getSettings/updateSetting routes, setupSettingsSheet()), seeded with ANNUAL_LEAVES, NEW_EMPLOYEE_LEAVE_LOCK_DAYS, MONTHLY_ADMISSION_TARGET. Frontend: settings.html new "Business Settings" tab (super_admin only). Needed by both §7.4 and §7.8.

New-employee 30-day leave lock, enforced in handleApplyLeave() (§7.4) — shipped 2026-08-02: uses getSettingNumber('NEW_EMPLOYEE_LEAVE_LOCK_DAYS', 30). ⚠️ Scope decision (not stakeholder-confirmed): only enforced for self-service (session.role === 'employee') leave applications — admin/hr/branch_manager filing leave on someone's behalf currently bypasses it.

daily_tasks sheet + employee add/list/self-view routes (§7.5) — shipped 2026-08-02 (backend: appscript_daily_tasks.gs — getDailyTasks/addDailyTask/updateDailyTask, setupDailyTasksSheet(); frontend: employee_dashboard.html — a dedicated "📝 Daily Tasks" modal, opened via a navbar button next to "📅 Leave Requests", with a date-picker add form posting to addDailyTask/updateDailyTask). ✅ Frontend re-verified by direct file review 2026-08-08 — task_date (`dd-MM-yyyy` from formatDateOnly()) is parsed correctly via regex, not `new Date()`, so no NaN/Invalid Date risk. ⚠️ Still assumes setupDailyTasksSheet() has actually been run on the live Spreadsheet — not yet confirmed (needs a live Apps Script check, not a file review).

Daily task admin approval flow + routes (§7.6) — shipped 2026-08-02: new standalone page daily_tasks_admin.html (super_admin/branch_manager via sidebar; hr via a new "📝 Daily Tasks" tab on hr_dashboard.html, since HR is otherwise locked to hr_dashboard.html/hr_recruitment.html — daily_tasks_admin.html was added to app.js's HR_ALLOWED_PAGES). Filterable list (approval status / employee / date range) + a review modal (Approve / Reject / Request Correction, remark required for the latter two) wired to approveDailyTask/rejectDailyTask/requestCorrectionDailyTask. Branch scoping for branch_manager is handled entirely server-side by the existing getDailyTasks filtering — no extra frontend logic needed. Daily Tasks module (§7.5–§7.7) is now fully end-to-end. ✅ Re-verified by direct file review 2026-08-08 (`daily_tasks_admin.html` + `employee_dashboard.html` both read in full) — stats/filters/review-modal/approve-reject-correction flow all correctly wired to the matching backend routes.

Calendar date-click → daily tasks for that date, on employee_dashboard.html (§7.7) — shipped 2026-08-02: every past/today calendar cell is clickable; the day-detail popup shows a read-only "📝 Daily Tasks" list for that date (title, times, description, approval badge, admin remark) via getDailyTasks?date=.... Empty state uses the PRD's exact copy ("No tasks were added for this date."). Adding/editing a task does not happen here — that's the navbar modal's job (see §7.5) — this popup is view-only by design, per user feedback after an earlier draft mixed the two.

Candidate Management module → renamed in practice to Admission Leads module, per the resolved schema question (architecture.md §4) — genuinely separate pipeline from job-recruitment candidates, for student course-enrollment leads. Fully shipped + verified end-to-end 2026-08-03: backend (appscript_admissions.gs) confirmed pasted into appscript_main.gs (SHEETS.ADMISSION_LEADS, doGet/doPost cases for getAdmissionLeads/addAdmissionLead/updateAdmissionLead/updateAdmissionLeadStatus/archiveAdmissionLead) and appscript_generateid_fix.gs ('LD': 'admission_leads') — all verified present by direct file review. setupAdmissionLeadsSheet() confirmed run — live admission_leads sheet exported with correct header row (no data rows yet). Frontend (hr_dashboard.html navbar+quick-action, app.js's HR_ALLOWED_PAGES, sidebar.html's nav link, admissions.html's dual-mode block) all verified present/correct by direct file review (§7.10)

Soft-delete only for admission leads: is_archived/archived_at/archived_by fields, no delete route exposed to HR — implemented in appscript_admissions.gs (archiveAdmissionLead), confirmed live in appscript_main.gs's doPost switch. No hard-delete route exists anywhere for this sheet (§7.11)

Medium priority

Employee target tracking (employee_targets sheet, Assigned/Achieved/Remaining/Progress %) (§7.8) — ✅ shipped 2026-08-08: backend `appscript_employee_targets.gs` (`getEmployeeTargets`/`assignTarget`/`updateTarget`, `setupEmployeeTargetsSheet()`) was already in place; frontend `targets_admin.html` built this session — stats row, employee/month/year/status filters, assign/edit modal, per-row progress bar. `achieved_target` is always recomputed live from `admission_leads` (status = `Admission Completed`, matched by `assigned_to` + `updated_at` month/year — see the ⚠️ proxy-logic caveat in `appscript_employee_targets.gs`'s header comment, not stakeholder-confirmed). `assigned_target` falls back to the `MONTHLY_ADMISSION_TARGET` setting when left blank on assignment. Reachable via `sidebar.html` + `hr_dashboard.html` navbar/quick-action (already wired, both pre-dated this page's existence). ⚠️ Not yet click-tested against the live Sheet.

HR Dashboard month-wise reports (§7.9) — ✅ shipped 2026-08-08: backend `appscript_reports.gs` (`getMonthlyReport`, 7 report builders: attendance/leave/daily_task/target/candidate/admission/joining) was already in place; frontend `reports.html` built this session — report-type selector, month(optional)/year/department/employee filters, dynamic summary cards + table (column set switches per report type to match each backend builder's row shape exactly). Report export (CSV, client-side from the loaded rows) + browser print (dedicated print stylesheet) both implemented — the optional §7.9 sub-item is done; no server-side PDF generation, matching the backend file's documented design decision. Reachable via `sidebar.html` + `hr_dashboard.html` (already wired). ⚠️ Not yet click-tested against live data for every report type.

Admission Leads real end-to-end click-test — add a test lead from admissions.html, verify the LD001-style ID and Sheet row, update status, then archive and verify soft-delete fields

Daily Tasks live-sheet verification — confirm setupDailyTasksSheet() has been run and the employee → approval → calendar flow works against the live Spreadsheet

Employee Targets live-sheet verification — confirm setupEmployeeTargetsSheet() has been run, then click-test assign → live-recompute-on-admission-completion → edit/deactivate on the live Spreadsheet

Reports live click-test — run all 7 report types against real data at least once, spot-check summary numbers against the source sheets, confirm CSV export opens cleanly

~~Confirm appscript_employees.gs's getEmployees (list) route actually attaches branch_name/designation_name to each row~~ — ✅ confirmed 2026-08-08 by direct code review, see §7.1 note above. No further action needed.

How to add a new phase

Confirm the feature's role/branch access rules first (goes in PRD.md §2/§3 if it changes user journeys).

Add backend route(s) + whitelist entries (architecture.md §5, rules.md #2).

Add/verify sheet schema additively (rules.md #7).

Build frontend page/section using existing design tokens (design.md).

Update README.md (schema/API tables), this file, and memory.md.