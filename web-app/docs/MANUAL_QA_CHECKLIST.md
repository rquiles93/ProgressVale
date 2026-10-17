# Manual acceptance checklist

Use fictional data only. Test in a private local environment with `postgres-ablls`; do not use DataViz. Record the browser, viewport, result, and any screenshot needed to reproduce a failure.

## Login and registration

- [ ] Open `/registro`, create a fictional account with a unique email and a password of at least 12 characters containing a letter and number. Expect a redirect to `/clientes` and an authenticated session after refresh.
- [ ] Try the same email again. Expect a safe duplicate-account message with no account details.
- [ ] Log out, try a wrong password, then the correct password. Expect a generic failure followed by successful access.
- [ ] Open `/clientes` while logged out. Expect a server redirect to `/login`.
- [ ] Confirm Google is visibly unavailable when credentials are absent and requests no permissions.

## Profile

- [ ] Open `/perfil`, change the display name, refresh, and confirm it persists.
- [ ] Submit invalid or mismatched password fields. Expect an announced inline error and no session change.
- [ ] Change the password in a test account. Expect other sessions to be revoked and the new password to work. This action should be performed only when intentionally testing session revocation.

## Clients

- [ ] From `/clientes`, open “Nuevo cliente” using the keyboard. Confirm focus enters the dialog, Tab stays within it, Escape closes it, and focus returns to the trigger.
- [ ] Create a client with a name, optional identifier, and each Service Setting combination. Expect the client to appear once.
- [ ] Try an empty name, no Service Setting, an overlong value, and a duplicate identifier. Expect clear validation without duplicate records.
- [ ] Search by partial name and identifier. Expect only matching owned clients.
- [ ] Edit the client, refresh, and confirm changes persist.
- [ ] With a second test account, attempt the first account’s client URL. Expect a 404 and no identifying data.

## Assessment workflow

- [ ] Start an assessment. Double-click once during testing and confirm only one active assessment exists.
- [ ] For Home-only clients, confirm M and N are locked while permanently excluded sections remain unavailable. For School or Clinic-Based ABA, confirm all 18 supported sections are available.
- [ ] Use keyboard arrows on a service-setting lock control. Expect the permitted section to lock or unlock and the sidebar state to update.
- [ ] Select score 0 and save a note. Refresh and confirm zero and the note persist; an unanswered task must remain distinct.
- [ ] Attempt values outside the task’s displayed range through normal controls. They must be impossible to select.
- [ ] Refresh mid-assessment and return from the client page. Expect resume at the first unanswered enabled task.
- [ ] Finish a section. Expect the section-transition screen and the next enabled section, skipping locked sections.
- [ ] Open the summary and explicitly finalize. Expect a confirmation, historical status, completion date, and read-only controls afterward.
- [ ] Reopen the finalized assessment URL. Confirm scores, notes, and section settings cannot be changed.
- [ ] Confirm the active section exposes answered and unanswered task shortcuts and permits review of earlier answers while the assessment remains in progress.
- [ ] Modify a score or note, then try Summary, Exit, a task shortcut, reload, and closing the tab; confirm potentially destructive navigation warns first.

## Client dashboard and history

- [ ] Confirm active and finalized evaluations show correct dates, statuses, completion counts, and actions.
- [ ] Open each historical evaluation and return to the client without losing context.
- [ ] Confirm an unfinished assessment exposes “Continuar evaluación”; after finalization, expect “Nueva evaluación”.
- [ ] Confirm history pagination after more than ten historical assessments and verify that PDF, CSV, and result links target the correct row.
- [ ] With two finalized assessments, open “Comparar” and confirm dates, Service Settings, denominators, task states, and record-selection behavior.

## Skills Tracking

- [ ] With an assessment still in progress, confirm the client page shows separate `Detalle — CSV`, `Detalle — PDF`, `Skills Tracking — PDF`, and `Skills Tracking — Excel` actions.
- [ ] Open Skills Tracking before finalization. Confirm the screen, PDF, and XLSX identify the current assessment as provisional, place it after finalized history, and do not change its status, completion date, scores, or notes.
- [ ] Open Skills Tracking with at least two fictional finalized assessments. Confirm chronological colors and dates remain consistent.
- [ ] Verify an explicit zero is marked as answered, a missing score is unmarked, and locked tasks use the gray locked marker.
- [ ] Verify a lower later score is shown as regression rather than silently retaining only the higher score.
- [ ] Test assessments with different Service Settings and horizontal scrolling on narrow screens.
- [ ] Confirm every task row has exactly 1, 2, or 4 boxes from its verified maximum and that all rows within a section have identical total width.
- [ ] Confirm identifiers ascend from bottom to top and section G is fully reconstructed. Confirm J, Q, R, S, T, Y, and Z appear as complete uncolored report grids but remain unavailable in assessment navigation.
- [ ] Download the XLSX and confirm its five worksheets use real cells, fills, merged 1/2-point boxes, readable legends, and no clipped task grids.
- [ ] Confirm cumulative colors preserve earlier levels during improvement, unchanged scores, regression, and reacquisition.

## PDF exports

- [ ] Download an in-progress assessment report and a finalized report. Confirm status, dates, Service Setting snapshot, task names, scores, maximums, notes, unanswered values, and locked sections.
- [ ] Download Skills Tracking. Confirm landscape orientation, chronological assessment rows, colors, zero/unanswered/locked distinctions, and readable page numbering.
- [ ] Test a long fictional note and a client with many finalized assessments. Expect no clipped text, overlapping rows, blank trailing pages, or missing headers.
- [ ] While logged out or using another test account, request a known PDF URL. Expect 401 or 404 and no download.

## CSV exports

- [ ] Download CSV from both an in-progress and a finalized assessment; confirm it opens as UTF-8 in Excel.
- [ ] Confirm explicit zero appears as `0`, unanswered is blank, and locked tasks say `Bloqueada`.
- [ ] Confirm commas, quotes, line breaks, and notes beginning with `=`, `+`, `-`, or `@` remain safe and correctly escaped.
- [ ] Confirm an anonymous or different user cannot download the CSV by changing the assessment ID.

## Skills Tracking PDF/XLSX acceptance

- [ ] With fictional histories of 1, 2, 5, 10, and 20 assessments, confirm earlier assessment colors never change when a later assessment is added.
- [ ] Confirm each legend entry includes a color, assessment number, date, and identifier suffix; do not rely on color alone.
- [ ] Confirm the PDF has five A3 landscape grid pages with five complete sections per page, page numbers 1/5 through 5/5, common bottom alignment, and no blank trailing page. Histories longer than 24 assessments may add dedicated legend pages.
- [ ] Confirm the XLSX has `Rejilla 1` through `Rejilla 5`, opens without a repair warning, uses actual filled cells, and has no external-link prompt.
- [ ] Spot-check 1-, 2-, and 4-point tasks in both formats. Each row must occupy the same total grid width and contain exactly its verified number of score boxes.
- [ ] Confirm A1 is the bottom task in section A and apply the same bottom-to-top ordering rule to every section.
- [ ] Confirm source-grid defects are not copied: G has a complete grid, every section has labels, and excluded Q and Y have complete uncolored grids reconstructed from verified task metadata.
- [ ] Confirm M/N retain historical colors when the latest evaluation locks them, receive no new color from the locked evaluation, and can receive later colors only after a later stored section snapshot enables them.
- [ ] Compare the same fictional client in the screen, PDF, and XLSX for improvement, regression, reacquisition, explicit zero, unanswered values, and locked M/N sections.
- [ ] Confirm unauthorized, expired-session, invalid-client, and cross-account downloads return a generic error with private/no-store caching and expose no record details.

## Responsive and accessibility review

- [ ] Review login, client list, client detail, assessment, profile, and Skills Tracking at approximately 390 px, 768 px, and 1440 px widths.
- [ ] Navigate each screen using Tab, Shift+Tab, Enter, Space, Escape, and arrow keys where documented. Confirm visible focus and no keyboard traps.
- [ ] At 200% browser zoom, confirm controls remain usable, the assessment sidebar scrolls, long names wrap, and no essential content overlaps.
- [ ] With a screen reader, confirm form labels, alerts, dialog name/modality, score button state, navigation labels, and PDF download links are announced meaningfully.

## Cleanup

- [ ] Delete or otherwise remove only the fictional acceptance records using an approved cleanup procedure. Do not alter existing historical records merely to complete QA.
