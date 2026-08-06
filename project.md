# University Exam Paper Portal — Technical Specification

## 1. Overview

A web application with two roles — **SuperAdmin** and **Student** — that lets a university administrator upload student rosters and paper assignments via Excel, upload the actual question-paper PDFs, and let each student securely view *only their assigned* paper from a personal dashboard, with strong (browser-level) anti-cheating protections during viewing.

**This is a view-only exam portal.** Students read the question paper on screen and write their answers physically on paper — there is no answer submission, typing, or upload feature for students. No answer-editor, autosave, or answer-file-upload component should be built.

---

## 2. User Roles & Permissions

### 2.1 SuperAdmin
- Not self-registered — seeded via script/env var or created by an existing superadmin. No public signup form.
- Uploads and manages two Excel files:
  1. **Student List** — the roster of valid students.
  2. **Paper Assignment** — which student gets which paper.
- Uploads question paper files (PDF) and links each to a paper code.
- Views a dashboard of all students, their assigned papers, login status, and any flagged cheating/violation events.
- Can revoke/reassign a paper, disable a student account, and re-upload corrected Excel files.

### 2.2 Student
- Login restricted to the university's email domain only (e.g. `@youruniversity.edu.in`) — enforced both client-side (basic UX check) and server-side (authoritative check against the uploaded roster).
- Logs in, lands on a personal dashboard showing only the paper(s) assigned to them.
- Can open their assigned paper in a locked-down, secure viewer. Cannot access any other student's paper (enforced server-side by ID, not just hidden in the UI).

---

## 3. Authentication & Authorization

- **Domain + roster-based gating**: a login attempt is only allowed if the email (a) matches the university domain **and** (b) exists in the SuperAdmin-uploaded student roster. Anyone outside the roster is rejected even with a valid university email — prevents randoms with a university email from self-registering.
- Recommended flow: **OTP-over-email or magic link** rather than static passwords. This avoids students sharing reusable passwords, and avoids the admin having to distribute/reset passwords manually.
  - Alternative if you prefer passwords: admin's roster Excel includes an initial password/PIN column, student is forced to change it on first login.
- Session tokens: short-lived JWT (access token) + refresh token, `httpOnly` secure cookies (not `localStorage`, to reduce XSS token theft risk).
- Role-based access control (RBAC) middleware on every API route — never trust a role claimed by the frontend.
- Rate-limit login/OTP endpoints to prevent brute forcing.

---

## 4. Excel Upload & Data Management

### 4.1 Student List Excel — expected columns
| Column | Notes |
|---|---|
| Roll No / Student ID | unique key |
| Full Name | |
| University Email | must match allowed domain |
| Department / Semester (optional) | |

### 4.2 Paper Assignment Excel — expected columns
| Column | Notes |
|---|---|
| Roll No / Student ID or Email | must exist in student list |
| Paper Code | must exist in uploaded papers |
| Paper Name (optional) | |

### 4.3 Processing requirements
- Validate headers and row data on upload; reject with a clear row-by-row error report rather than failing silently or half-importing.
- Upsert behavior on re-upload (update existing, add new, optionally flag removed rows) rather than blind append/duplicate.
- Store parsed data in the database, not the raw Excel, as the source of truth after import.
- PDFs are uploaded separately from the Excel and linked to a Paper Code.

---

## 5. Secure Paper Viewing (Anti-Cheating)

**Important limitation to set expectations up front:** no website can make a document 100% uncopyable. A browser cannot fully block the OS-level Print Screen key, a second device pointed at the screen, or a sufficiently determined user with dev tools. What follows are strong, industry-standard *deterrents and detection* measures used by real online-exam platforms (e.g. disabling copy/inspect, watermarking, tab-switch detection) — not an unbreakable lock. Treat this layer as "raise the effort and traceability of cheating," and combine it with the honor-code/logging measures below rather than relying on it alone.

**Achievable client-side protections:**
- Disable right-click context menu on the paper-viewing page.
- Disable text selection (`user-select: none` + JS guard).
- Block common shortcuts: `Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+U` (view source), `Ctrl/Cmd+S`, `Ctrl/Cmd+P`, `F12`, `Ctrl+Shift+I/J/C`. (Best-effort — some can't be intercepted by JS depending on OS/browser.)
- Detect DevTools being opened (timing/`devtools-detect`-style checks) → log the event and optionally blur the paper / force logout.
- Detect tab switch, window blur, or app minimize via the Page Visibility API → warn, log, and optionally auto-lock the paper after N violations.
- Require and enforce fullscreen mode (Fullscreen API) while viewing; exiting fullscreen triggers a warning/lock.
- **Render the PDF as canvas images via pdf.js instead of a native `<iframe>`/`<embed>`** — this avoids exposing a real downloadable PDF or selectable text layer, which is meaningfully harder to lift than a native PDF viewer.
- Overlay a dynamic **watermark** (student name, roll no, timestamp) tiled across the page — deters photographing/screenshotting since any leaked copy is traceable back to the student.
- Attempt to block browser printing via `@media print` CSS and a `beforeprint` guard.

**Server-side (the part that actually matters most):**
- Serve the PDF only via a short-lived, signed, per-request URL — never a static public link.
- Every view/open/close/duration and every detected violation (devtools opened, tab switched, fullscreen exited, print attempted) is logged server-side with student ID, timestamp, IP, and user agent — visible to the SuperAdmin.
- Rate-limit and session-bind paper access (e.g. one active session per student) to reduce sharing.
- Optional: require an on-screen academic-honesty acknowledgment checkbox before the paper unlocks.
- Optional future add-on: webcam-based proctoring for stronger guarantees — flag this as out of scope for v1 unless required.

---

## 6. Suggested Tech Stack

*(Assumption — swap freely; noted here so the build agent has a concrete default instead of guessing.)*

- **Frontend**: Next.js (React) + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes or a separate Node.js + Express + TypeScript service
- **Database**: PostgreSQL + Prisma ORM (relational fits students/papers/assignments well)
- **File storage**: S3-compatible object storage (AWS S3 / Cloudinary / Supabase Storage) for PDFs — not local disk, for production durability
- **Excel parsing**: `exceljs` or `xlsx` (SheetJS) on the backend
- **Auth**: NextAuth.js or a custom JWT flow + email OTP via a transactional email provider (Resend / SendGrid)
- **PDF rendering**: `pdf.js` rendered to `<canvas>` for the secure viewer
- **Hosting**: Vercel (app) + a managed Postgres (Neon/Supabase) + S3-compatible storage, or a single VPS with Docker Compose if full infra control is preferred

---

## 7. Database Schema (high-level)

- **users** — id, role (`superadmin`/`student`), name, email, roll_no, department, auth fields, created_at
- **papers** — id, paper_code, paper_name, file_url, created_at
- **assignments** — id, student_id, paper_id, assigned_at
- **access_logs** — id, student_id, paper_id, action, timestamp, ip, user_agent
- **violation_logs** — id, student_id, paper_id, violation_type, timestamp

---

## 8. API Endpoints (high-level)

**Auth**
- `POST /auth/login` (email → triggers OTP/magic link)
- `POST /auth/verify` (verify OTP/token → issues session)
- `POST /auth/logout`

**SuperAdmin**
- `POST /admin/upload/students` — student list Excel
- `POST /admin/upload/assignments` — paper assignment Excel
- `POST /admin/papers` — upload a paper PDF + metadata
- `GET /admin/students` / `GET /admin/papers`
- `GET /admin/logs` — access + violation logs

**Student**
- `GET /student/dashboard`
- `GET /student/paper/:id` — returns short-lived render session, not a raw file URL
- `POST /student/violation` — client reports a detected violation event

All student/admin routes enforce server-side authorization by user ID and role — never rely on the frontend hiding a button.

---

## 9. Non-Functional Requirements

- HTTPS everywhere; all secrets in environment variables, never committed
- Input validation & sanitization on every upload and form
- File upload limits: restrict Excel/PDF mimetypes and max file size
- Brute-force/rate limiting on login and OTP endpoints
- Full audit logging (who did what, when)
- Regular database backups
- Responsive design (desktop + mobile dashboard, though paper viewing is best locked to desktop/fullscreen)
- Basic accessibility (semantic HTML, labeled forms)

---

## 10. Deliverables Expected From the Build Agent

- Working frontend + backend (monorepo or split repos)
- `README.md` with setup, environment variables, and run instructions
- `.env.example` listing all required secrets/config
- Seed script to create the first SuperAdmin account
- Database migration scripts
- Basic automated tests for auth, Excel import validation, and access control (student cannot fetch another student's paper)

