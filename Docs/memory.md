# memory.md — Working Memory / Session Log

Purpose: a running log so any contributor (human or AI) picking up this project mid-stream knows **what's done, what's in progress, and what file was last touched** — without re-reading the whole codebase.

> Rule: update this file at the **end of every work session**, even a short one. Newest entry on top.

---

## Session log

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
