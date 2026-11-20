# Manual test guide

Use this guide to check the portal through the browser before adding real student records. It covers the flows currently available in the React frontend and Django API.

## 1. Start the app

Open two terminals from the project folder.

In terminal 1, start Django from `backend/`:

```bash
python manage.py check
python manage.py runserver
```

In terminal 2, start Vite from `frontend/`:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. Keep the Django terminal visible: development emails, including account setup and password-reset messages, are printed there.

Use a development database and accounts only. Some checks create records, and account/enrollment changes are real database updates. There is no test-data cleanup button in the portal.

## 2. Prepare test accounts and data

You need:

- An administrator account.
- A student account with a parent email address.
- An instructor account with an email address.
- At least one program, two classes in that program, and an instructor assignment.

If student or instructor accounts do not exist, create them from the administrator UI. Their temporary username/password instructions appear in the Django terminal during local development. Use those credentials for the first login. If you need an admin account, create it through Django's normal admin-user setup for your local database.

Suggested disposable records:

- Program: `QA Summer Program` (leave dates blank to check optional dates).
- Classes: `QA Beginners` and `QA Advanced`.
- Student: `QA Student` with a parent email you can inspect in the console output.
- Instructor: `QA Instructor` with an email you can inspect in the console output.

## 3. Login, session, and logout

### Successful login

1. Open the login screen.
2. Sign in with a valid username and password for each role: admin, instructor, and student.
3. Confirm each account opens its expected workspace:
   - Admin: programs workspace.
   - Instructor: classes workspace.
   - Student: learning portal.
4. Refresh the browser. The signed-in session should remain active.
5. Select **Sign out**. Confirm the login page appears and protected workspace data is no longer shown.

### Invalid login

1. Enter a valid username with an incorrect password.
2. Confirm the page shows an error and does not open a workspace.
3. Try a username that does not exist. The page should show a generic invalid-credentials message without exposing account details.

## 4. Administrator: program, student, class, and instructor setup

### Create and select a program

1. Sign in as admin and choose **New program**.
2. Enter a name and status. Leave start and end dates blank, then create it.
3. Confirm the program appears and its dates are shown as unset.
4. Open the program. Confirm the program navigation appears and the program is active in the workspace.
5. Use the program selector/navigation to return to the program list and open another program if one exists.

### Create a student account

1. In **Students**, select **New student**.
2. Enter first name, last name, and parent email; submit.
3. Confirm the student appears in the student list.
4. In the Django terminal, confirm the account setup email contains the generated username and temporary password and was addressed to the parent email.
5. Confirm no student email was required.

### Import students from CSV

1. Open **Students** and choose **Import students**.
2. Download the CSV template. Add one row per student with `first_name`, `last_name`, `program`, `class`, and `parent_email` columns. Use a program name and class name that exist in the portal.
3. Leave `parent_email` blank for a student account that already exists. A valid parent email is required for a new account.
4. Import the file and review the summary. New names create accounts and are enrolled in the program and class on their row; matching names are enrolled or moved to the listed class in that program. Enrollments in other programs remain in place.
5. Confirm ambiguous existing names, duplicate names in the same program, unknown programs or classes, and API errors are reported as skipped rows.

### Manage student details and enrollment

1. In the student row, confirm **Manage** appears after the parent email.
2. Open **Manage**. Change the student's name and/or parent email, then save.
3. Confirm the success message appears and the new values remain after returning to the student list and reopening the student.
4. Add an enrollment by choosing a program and one of its classes.
5. Confirm the program and class appear in the enrollment list.
6. Choose **Change class**, select the other class in the same program, and save.
7. Confirm the enrollment now shows the new class.
8. Return to Students. With the program active, confirm enrolled students appear in the enrolled group and other student accounts appear below under the directory.

### Create a class and enroll from Classes

1. Open **Classes** for the active program.
2. Create a class and confirm its card appears.
3. Select **Enroll student**, choose a student and class, and submit.
4. Open the class roster and confirm the student appears.
5. If the student already has an enrollment in that program, expect the API to reject a duplicate rather than create a second program enrollment.

### Create an instructor and assign them

1. Open **Instructors**.
2. Choose **New instructor**, enter first name, last name, and email, then submit.
3. Confirm the instructor appears in the list and the Django terminal shows the account setup email addressed to the instructor.
4. In **Assign an instructor**, choose the instructor, a class, and a subject, then submit.
5. Confirm the assignment appears for that class.
6. Assign the same instructor to a different class or subject; that should be allowed. Try the identical instructor/class/subject combination; it should be rejected as a duplicate.

## 5. Instructor: report and feedback

### Confirm assignment-based access

1. Sign in as the assigned instructor.
2. Confirm **My classes** shows only classes assigned to this instructor.
3. Open the roster for an assigned class and confirm the enrolled test student appears.
4. Confirm the roster does not show the parent's email.

### Write and publish a class report

1. Open the instructor **Class report & feedback** tab.
2. Choose **New report**, select an assigned class, and enter the topic, learning goals, key concepts and skills, activities, practical work/project, assignment and due date, and any next lesson or materials.
3. Confirm every student starts with the positive/default answers. Choose **Add private feedback**, select a student, then change any answer that differs; optionally add a specific example, strength, or next step.
4. Confirm all roster students are included in the saved report even when only some students' answers were changed.
5. Save the draft, confirm it appears with draft status, then publish it.
6. Confirm the report status changes to published and a publication date is shown.
7. Confirm each parent receives a PDF with the expanded class content and only their child's answers and note.
8. Sign in as a student enrolled in that class and verify the structured report and their own feedback appear under the correct program.

Current limitation: the report date is assigned automatically when the report is created. The instructor cannot choose a different written date in the current UI/API.

### Private feedback

1. Confirm there is no separate instructor Private feedback tab; the questionnaire appears at the bottom of the class report composer.
2. Confirm the student questionnaire is generated from the selected class roster and feedback is attached to the class report.
3. Try publishing a report when a student is missing feedback through the API; confirm publishing is rejected.
4. Configure `GEMINI_API_KEY`, save a draft, and confirm Gemini previews one report per student before publishing.
5. Publish the draft and confirm each student's parent PDF contains only that student's generated report and private answers.

## 6. Student navigation, reports, and feedback

1. Sign in as the test student.
2. Confirm the student portal shows the upcoming-program banner and summary counts.
3. Confirm the student navigation has **My learning**, **Class Reports**, and **Private feedback** tabs.
4. On **My learning**, confirm the upcoming-program banner, summary counts, and enrolled programs appear.
5. Open **Class Reports** and **Private feedback** separately. If the student has multiple programs, select each program and confirm only its reports or feedback appear.
6. On **Class Reports**, confirm each report title has a **Read** button. Open one and verify the full report appears on its own page; use **Back to Class Reports** to return.
7. On **Private feedback**, confirm the student's own question answers and optional note appear, with no other student's answers.
8. Confirm records from other programs do not appear in the selected program.
9. If the student has no enrollments, confirm the empty-state message appears rather than a broken page.

## 7. Password recovery

Test with accounts whose email destinations you can inspect in the Django terminal.

1. Sign out and select **Forgot password?**.
2. Enter an existing username and submit.
3. Confirm the page shows the same generic confirmation message regardless of whether the account exists.
4. Inspect the Django terminal for the reset email:
   - Admin/instructor: the email on that account.
   - Student: the student's parent email.
5. Copy the reset link from the email. Open it in the browser and set a new password.
6. Confirm the page reports success and provides a route back to login.
7. Sign in using the new password. Confirm the old password no longer works.
8. Reuse the same reset link. It should be rejected as invalid or expired.

## 8. Role and privacy checks

Use separate browser sessions or sign out between accounts.

- As an instructor, try opening an unassigned class or its roster. The API should deny access.
- As a student, confirm only that student's enrollments, published class reports, and feedback are visible.
- As an instructor, confirm parent email addresses are not exposed in rosters.
- As a student or instructor, try opening an admin page directly by URL. The page should not grant admin access; protected API requests must also reject unauthorized changes.
- As an unauthenticated user, refresh a protected workspace URL after signing out. It should return to login rather than reveal protected content.

## 9. Mobile and desktop layout checks

Repeat a short login and navigation pass at desktop width and at a phone-sized viewport.

- At desktop width, the navigation toggle hides and restores the sidebar.
- At phone width, the navigation toggle opens the mobile navigation; choosing an item closes it.
- Student and enrollment tables can be scrolled horizontally without obscuring the rest of the page.
- Login, forms, and buttons fit the viewport and remain usable without horizontal page scrolling.

## 10. Record results

For each flow, mark **Pass**, **Fail**, or **Not tested**. For failures, record:

- The role used.
- The page and action being tested.
- The expected result and what happened instead.
- Any visible error text and the related Django terminal output (remove passwords, reset tokens, and personal information before sharing).

Do not test production deployment settings with this guide. The current project uses SQLite locally; MongoDB is not ready for the existing integer IDs and migrations. Production email, HTTPS, trusted origins, and hosting configuration should be checked separately once a hosting environment is selected.
