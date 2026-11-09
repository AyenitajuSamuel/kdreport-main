# Backend guide

This document describes the Django REST API as it is currently implemented in `backend/`. It is intended as a working reference for the React frontend and as a guide to the backend's main ideas.

## 1. What the backend is responsible for

The backend owns the database, authentication, permissions, and business rules. The React app sends HTTP requests and displays the responses; it must not decide by itself whether a user may see or change a record.

The project is split into three Django apps:

| App | Responsibility |
| --- | --- |
| `accounts` | User accounts, student and instructor profiles, login, logout, password recovery. |
| `academics` | Programs, classes, student enrollments, and instructor assignments. |
| `reporting` | Class reports and student feedback. |

The API base path is `/api/v1/`. For local development, the frontend is configured at `http://localhost:5173`; the Django server is commonly run at `http://localhost:8000`.

## 2. Run the backend

Run these commands from the `backend/` directory, with the project's Python environment activated and Django plus Django REST Framework installed:

```bash
python manage.py check
python manage.py migrate
python manage.py runserver
```

`check` looks for Django configuration problems. `migrate` creates or updates the database tables from the app migrations. `runserver` starts Django's development server. Do not use `runserver` as a production server.

The custom user model is configured as `accounts.User`. It must remain the configured user model; changing it after database migrations have been created can require careful database migration work.

## 3. Authentication and browser requests

The API uses Django session authentication. After a successful login, Django stores a session cookie in the browser. Later requests use that cookie to identify the signed-in user.

### CSRF sequence

For browser clients, make a `GET /api/v1/auth/csrf/` request first. Django sets a `csrftoken` cookie. For every state-changing request (`POST`, `PUT`, `PATCH`, or `DELETE`), send that token in the `X-CSRFToken` header. Include cookies on cross-origin requests (for example, `credentials: "include"` with `fetch`). Login rotates the CSRF token, so read the cookie again after login.

Example browser request:

```js
const response = await fetch("http://localhost:8000/api/v1/auth/login/", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken,
  },
  body: JSON.stringify({ username, password }),
});
```

The current settings do not include a CORS package or CORS allow-list. If the browser blocks requests from the React development server, configure a development proxy or add an explicit CORS configuration for the frontend origin. CORS and CSRF are separate checks: allowing an origin through CORS does not remove the CSRF requirement.

### Authentication endpoints

All paths in this table are relative to `/api/v1/`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/auth/csrf/` | Set the CSRF cookie. |
| `POST` | `/auth/login/` | Sign in with a username and password. |
| `GET` | `/auth/me/` | Return the current user's basic account data. |
| `POST` | `/auth/logout/` | End the current session. |
| `POST` | `/auth/password_reset_request/` | Request a password reset link using a username. |
| `POST` | `/auth/password_reset_confirm/` | Set a new password using the reset link's `uid` and `token`. |

Login request:

```json
{
  "username": "jane.doe",
  "password": "the-password"
}
```

A successful login returns a `user` object containing `id`, `username`, `first_name`, `last_name`, and `role`. Roles are `admin`, `instructor`, and `student`. Invalid credentials return HTTP `401`; missing or malformed fields return HTTP `400`.

The password-reset request accepts `{ "username": "..." }`. Its response is intentionally the same whether or not the account exists, to avoid revealing which usernames are registered. The reset email goes to the instructor/admin email address or, for a student, to the student's `parent_email`. The confirmation request accepts:

```json
{
  "uid": "value-from-link",
  "token": "value-from-link",
  "password": "a-new-password"
}
```

The `uid` ends before the `&token=` part of the URL. Do not include the ampersand or the token in the `uid` value.

## 4. Data model and relationships

```text
User ── one-to-one ── StudentProfile ── one-to-many ── StudentEnrollment
  │                                                    │
  └── one-to-one ── InstructorProfile                  └── Class ── Program
                           │                                │
                           └── InstructorAssignment ────────┘

ClassReport ── belongs to a Class and an InstructorProfile
StudentFeedback ── belongs to a StudentEnrollment and an InstructorProfile
```

- A `User` authenticates with a unique username and has one role. First and last names are Django user fields.
- A `StudentProfile` adds the required parent email. A student does not need a personal email address.
- An `InstructorProfile` links an instructor account to the instructor role. Instructor email is stored on the related user.
- A `Program` can have optional start and end dates. Its status is `upcoming`, `active`, `completed`, or `archived`.
- A `Class` belongs to one program. Class names must be unique within that program.
- A `StudentEnrollment` connects one student to a class and program. A student can have only one enrollment per program. Updating its `classroom` moves the student to another class in that program.
- An `InstructorAssignment` connects an instructor to a class, program, and subject. The same instructor/class/subject combination cannot be added twice; the same subject can be taught by different instructors or in different classes.
- A `ClassReport` has an author, class, title, body, status, written timestamp, and optional publication timestamp. New reports start as drafts. There is no one-report-per-date constraint.
- `StudentFeedback` belongs to a specific enrollment and has an author and written timestamp. The model currently has no draft/published status.

`PROTECT` relationships on academic and reporting records help prevent deletion of records that have dependent history. Programs should generally be archived by changing their status.

## 5. Permissions at a glance

| Role | Access |
| --- | --- |
| Admin or superuser | Manage accounts, programs, classes, enrollments, and instructor assignments. Read reporting data. |
| Instructor | Read their assigned classes and rosters; create reports and feedback only for assigned classes/enrollments; view and edit their own records while still assigned. |
| Student | Read their own profile, enrollments, published class reports for enrolled classes, and feedback attached to their enrollment. Change their own username. |

Unauthenticated requests to protected API views are rejected. A record ID in a URL is not proof of access: views filter by the signed-in user, their role, and the relevant assignment or enrollment.

## 6. Student and instructor account endpoints

Paths are relative to `/api/v1/`.

| Methods | Path | Who can use it | Purpose |
| --- | --- | --- | --- |
| `GET`, `POST` | `/student/` | Admin | List student profiles or create a student account. |
| `GET`, `PUT`, `PATCH` | `/student/{student_id}/` | Admin | Read or update a student profile. |
| `GET`, `PUT`, `PATCH` | `/student/me/` | Signed-in student | Read own profile or change own username. |
| `GET` | `/student/me/enrollments/` | Signed-in student | List own enrollments. |
| `GET` | `/student/me/reports/` | Signed-in student | List published reports for own classes. |
| `GET` | `/student/me/feedback/` | Signed-in student | List feedback for own enrollments. |
| `GET`, `POST` | `/instructors/` | Admin | List or create instructor profiles/accounts. |
| `GET`, `PUT`, `PATCH` | `/instructors/{instructor_id}/` | Admin | Read or update an instructor profile. |

Student creation expects `first_name`, `last_name`, and `parent_email`. It creates the linked user account, generates a username such as `jane.doe` (then `.1`, `.2`, etc. if needed), generates a temporary password, and sends the credentials to the parent email. No student email is required. The response includes the profile ID, generated username, names, and parent email; it does not return the temporary password.

Instructor creation expects `first_name`, `last_name`, and `email`. The username is based on the email's part before `@`; a numeric suffix is added to avoid collisions. A generated temporary password and username are sent to the instructor's email.

In the current development settings, email uses Django's console backend. Email messages are printed in the Django server terminal; configure a real email backend before expecting messages in an inbox.

## 7. Academic endpoints

Paths are relative to `/api/v1/`. The program, class, enrollment, and instructor-assignment management routes are admin-only.

| Methods | Path | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/academics/program/` | List or create programs. |
| `GET`, `PUT`, `PATCH` | `/academics/program/{program_id}/` | Read or update a program. |
| `GET`, `POST` | `/academics/program/{program_id}/classes/` | List or create classes in a program. |
| `GET`, `PUT`, `PATCH` | `/academics/program/{program_id}/class/{class_id}/` | Read or update a class. |
| `GET`, `POST` | `/academics/program/{program_id}/enrollment/` | List or create student enrollments in a program. |
| `GET`, `PUT`, `PATCH` | `/academics/program/{program_id}/enrollment/{enrollment_id}/` | Read or update an enrollment, including moving the student to another class in the same program. |
| `GET`, `POST` | `/academics/program/{program_id}/instructor_assignment/` | List or create instructor assignments. |
| `GET`, `PUT`, `PATCH`, `DELETE` | `/academics/program/{program_id}/instructor_assignment/{assignment_id}/` | Read, update, or delete an assignment. |

The program ID in the URL is set by the server for class, enrollment, and assignment creation. Do not send a `program` field in those request bodies. The serializer checks that the chosen class belongs to the URL's program.

Example class creation body:

```json
{ "name": "Beginners" }
```

Example enrollment creation body (use profile and class database IDs):

```json
{
  "student": 12,
  "classroom": 4
}
```

Example instructor assignment body:

```json
{
  "instructor": 3,
  "classroom": 4,
  "subject": "Reading"
}
```

## 8. Instructor classes and rosters

There are two URL forms for these views:

| Methods | Main path | Also available under | Who can use it |
| --- | --- | --- | --- |
| `GET` | `/my/classes/` | `/academics/my/classes/` | Instructor or admin. Instructors see their assigned classes; admins see all classes. |
| `GET` | `/classes/{class_id}/students/` | `/academics/classes/{class_id}/students/` | Assigned instructor or admin. |

The roster response is a list of student profile records. The current roster serializer includes the profile's `parent_email`; confirm that instructors should be allowed to see it before treating that field as permanent API behavior.

## 9. Class reports and student feedback

Paths are relative to `/api/v1/`.

| Methods | Path | Who can use it | Purpose |
| --- | --- | --- | --- |
| `GET`, `POST` | `/classes/{class_id}/reports/` | Assigned instructor; admin can list | List reports or create a draft report for the class. |
| `GET`, `PUT`, `PATCH` | `/class-reports/{report_id}/` | Authoring instructor while assigned; admin | Read or update a report. Instructors cannot edit a published report. |
| `POST` | `/class-reports/{report_id}/publish/` | Authoring instructor while assigned; admin | Publish a draft and set `published_on`. |
| `GET`, `POST` | `/enrollments/{enrollment_id}/feedback/` | Instructor assigned to the enrollment's class; admin can list | List feedback or create feedback for that enrollment. |
| `GET`, `PUT`, `PATCH` | `/student-feedback/{feedback_id}/` | Authoring instructor while assigned; admin | Read or update a feedback record. |

Create a class report with:

```json
{
  "title": "Week 3 update",
  "body": "The class practiced ..."
}
```

The server sets the author and class from the signed-in instructor and URL. A report starts as `draft`. Its `written_on` timestamp is assigned when it is created; the API currently does not accept a custom written date. Only published class reports are returned by the student reports endpoint. The list endpoint accepts optional filters, for example `?status=published&date=2026-11-09`, where `date` filters by the report's written date.

Create feedback with:

```json
{
  "feedback": "Jane is becoming more confident reading aloud."
}
```

The URL enrollment determines the student, and the signed-in instructor becomes the author. The instructor must currently be assigned to the enrollment's class. Because `StudentFeedback` has no publication field, feedback is currently returned immediately by `/student/me/feedback/`.

There is no unique constraint limiting how many reports or feedback records may be written. This matches the current product rule that instructors write reports at their discretion.

## 10. Request and response conventions

- Send and receive JSON for the REST endpoints. The login and password-reset views also require JSON request bodies.
- Use the trailing slash shown in each route.
- IDs are integer database IDs, not usernames or names.
- `GET` collection responses are lists (DRF pagination can wrap lists if pagination is configured later).
- A successful create usually returns HTTP `201`; successful reads and updates usually return `200`; a successful delete returns `204`.
- Invalid data normally returns HTTP `400` with field-specific validation details.
- Unauthenticated requests normally return `401`; authenticated users without permission receive `403`; missing records return `404`.
- `PUT` replaces the writable fields of a record. `PATCH` changes only the supplied writable fields. Prefer `PATCH` for a single-field edit.

## 11. Important implementation limits

These points describe current behavior and are useful to revisit as the project grows:

1. `StudentFeedback` has no publish/draft status, so student feedback is visible to the student immediately.
2. `ClassReport.written_on` is automatic. Instructors cannot provide a separate report date; filtering uses the creation date.
3. The roster currently serializes `parent_email` to assigned instructors.
4. The current email backend prints outgoing email to the terminal instead of delivering it.
5. Browser requests from a separate frontend origin may require CORS/proxy configuration in addition to session cookies and CSRF.
6. Assignment removal currently uses `DELETE`; there is no active/inactive history field on `InstructorAssignment`.
7. The backend has no explicit audit log for enrollment moves, assignment changes, or report publication yet.

These are implementation notes, not additional rules imposed by the frontend. Keep authorization and validation in the backend even when the UI also hides actions from users.
