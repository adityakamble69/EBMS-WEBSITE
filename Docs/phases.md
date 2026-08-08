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

[~] Leave day-count math integration with holidays sheet — **built 2026-08-08**: `calculateLeaveDays()` added to `appscript_leaves.gs`, called from `handleApplyLeave()` — server now computes the authoritative day count itself (ignores `body.days` from the frontend entirely) by walking every calendar date in the requested range and excluding any date that matches an applicable `holidays` row (branch-scoped: blank `branch_id` = company-wide, or matches the employee's branch; `recurring === 'true'` rows match by month+day across any year, others by exact date). A 0-working-day range (entire span falls on holidays) is now rejected with a 400 instead of silently creating a 0-day leave request. `appscript_holidays.gs`'s header comment updated to remove the now-false "informational only" claim. ⚠️ Scope: intentionally does **not** exclude weekends/weekly-offs (that's a separate, bigger change — weekly-off is per-shift, not a fixed Sat/Sun — not requested this round). ⚠️ Not retroactive: existing `leave_requests` rows keep their original (possibly holiday-inclusive) day count. ⚠️ Not yet click-tested against the live Sheet/Apps Script project — needs: apply a leave spanning a real holiday and confirm the returned `days` excludes it, plus confirm `getLeaveSummary` totals still add up correctly with the new counts.

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

Candidate Management module → renamed in practice to Admission Leads module, per the resolved schema question (architecture.md §4) — genuinely separate pipeline from job-recruitment candidates, for student course-enrollment leads. Fully shipped + verified end-to-end 2026-08-03: backend (appscript_admissions.gs) confirmed pasted into appscript_main.gs (SHEETS.ADMISSION_LEADS, doGet/doPost cases for getAdmissionLeads/addAdmissionLead/updateAdmissionLead/updateAdmissionLeadStatus/archiveAdmissionLead) and appscript_generateid_fix.gs ('LD': 'admission_leads') — all verified present by direct file review. setupAdmissionLeadsSheet() confirmed run — live admission_leads sheet exported with correct header row (no data rows yet). Frontend (hr_dashboard.html navbar+quick-action, app.js's HR_ALLOWED_PAGES, sidebar.html's nav link, admissions.html's dual-mode block) all verified present/correct by direct file review (§7.10). ✅ **Live end-to-end click-test done and passed 2026-08-08** — a real test lead was added through the `admissions.html` UI, generated a correct `LD001`-style ID in the live Sheet, and archiving correctly populated the soft-delete fields. Module is now 100% closed, not just code-verified.

Soft-delete only for admission leads: is_archived/archived_at/archived_by fields, no delete route exposed to HR — implemented in appscript_admissions.gs (archiveAdmissionLead), confirmed live in appscript_main.gs's doPost switch. No hard-delete route exists anywhere for this sheet (§7.11)

Medium priority

HR target tracking (`hr_targets` sheet, Assigned/Achieved/Remaining/Progress %) (§7.8) — ✅ **fully closed 2026-08-08** (user-confirmed): scope-corrected/rebuilt build (`appscript_hr_targets.gs`, rebuilt `targets_admin.html`) is complete; `hr_targets_wiring_patch.md` applied to the live `appscript_main.gs`/`appscript_generateid_fix.gs`, `setupHrTargetsSheet()` run on the live Spreadsheet, `admissions.html`'s "Assigned To" field now lists HR users, and assign → live-recompute-on-admission-completion → edit/deactivate has been click-tested live. No remaining blockers.

HR Dashboard month-wise reports (§7.9) — ✅ **fully closed 2026-08-08** (user-confirmed): backend `appscript_reports.gs` (7 report builders) + frontend `reports.html` (selector, filters, summary cards/table, CSV export, print stylesheet) — all 7 report types have been click-tested against live data, summary numbers spot-checked against source sheets, CSV export confirmed to open cleanly.

~~Admission Leads real end-to-end click-test — add a test lead from admissions.html, verify the LD001-style ID and Sheet row, update status, then archive and verify soft-delete fields~~ — ✅ done and passed 2026-08-08: test lead added via `admissions.html`, correct `LD001`-style ID confirmed in the Sheet, archive correctly populated the soft-delete fields. Module fully closed end-to-end.

~~Daily Tasks live-sheet verification — confirm setupDailyTasksSheet() has been run and the employee → approval → calendar flow works against the live Spreadsheet~~ — ✅ done 2026-08-08 (user-confirmed): setup function confirmed run live, full employee → approval → calendar flow verified against the live Spreadsheet.

~~HR Targets live-sheet verification — apply hr_targets_wiring_patch.md ..., then click-test~~ — ✅ done 2026-08-08 (user-confirmed) — see §7.8 note above, folded in.

~~Reports live click-test — run all 7 report types against real data...~~ — ✅ done 2026-08-08 (user-confirmed) — see §7.9 note above, folded in.

~~Confirm appscript_employees.gs's getEmployees (list) route actually attaches branch_name/designation_name to each row~~ — ✅ confirmed 2026-08-08 by direct code review, see §7.1 note above. No further action needed.

**Stakeholder-confirmation flags (§7.2, §7.4) — status:** user confirmed 2026-08-08 that everything ahead of Phase 10 is done; treating the calendar-year leave-cycle assumption (§7.2) and the self-service-only 30-day leave-lock scope (§7.4) as accepted-as-built unless revisited later. Flagging here rather than silently dropping the caveat, since neither was individually re-confirmed line-by-line.

**Phase 11 status: fully closed 2026-08-08 (user-confirmed).** All high- and medium-priority items above are shipped and live-verified.

How to add a new phase

Confirm the feature's role/branch access rules first (goes in PRD.md §2/§3 if it changes user journeys).

Add backend route(s) + whitelist entries (architecture.md §5, rules.md #2).

Add/verify sheet schema additively (rules.md #7).

Build frontend page/section using existing design tokens (design.md).

Update README.md (schema/API tables), this file, and memory.md.