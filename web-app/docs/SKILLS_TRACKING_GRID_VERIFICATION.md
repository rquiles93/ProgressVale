# Skills Tracking grid verification

Deterministic reporting-model verification: **PASS**

Skills Tracking reporting contains all 25 original sections and all 544 verified tasks. Active assessment remains limited to the existing 18 approved sections; J, Q, R, S, T, Y, and Z remain permanently excluded from scoring. Reporting structure and assessment availability are separate concerns.

| Section | Tasks | Assessment status |
| --- | ---: | --- |
| A | 19 | Available |
| B | 27 | Available |
| C | 57 | Available |
| D | 27 | Available |
| E | 20 | Available |
| F | 29 | Available |
| G | 47 | Available |
| H | 49 | Available |
| I | 9 | Available |
| J | 20 | Permanently excluded |
| K | 15 | Available |
| L | 34 | Available |
| M | 12 | Available subject to Service Setting |
| N | 10 | Available subject to Service Setting |
| P | 6 | Available |
| Q | 17 | Permanently excluded |
| R | 29 | Permanently excluded |
| S | 10 | Permanently excluded |
| T | 7 | Permanently excluded |
| U | 15 | Available |
| V | 10 | Available |
| W | 7 | Available |
| X | 10 | Available |
| Y | 30 | Permanently excluded |
| Z | 28 | Permanently excluded |
| **Total** | **544** | **18 available / 7 excluded** |

## Structural rules

- Every verified identifier appears exactly once. Canonical task order is reversed only for display, so task 1 is at the bottom of its section.
- Verified maxima are 1, 2, or 4. Each row occupies four logical width units: one four-unit box, two two-unit boxes, or four one-unit boxes.
- Permanently excluded sections render complete, uncolored grids and never become scoreable.
- A Service Setting lock suppresses new color for that assessment without erasing earlier acquired colors. Each assessment's stored section snapshot remains authoritative.
- Explicit zero, unanswered, locked, and excluded are separate states. None is converted into another.
- Cumulative colors identify the first assessment that acquired each level. Regression and reacquisition do not recolor earlier acquisition.

## PDF verification (2026-10-14)

- Five A3 landscape pages, five complete section columns per page.
- Sections are paginated as A-E, F-J, K-P, Q-U, and V-Z.
- No section or task row is split. Row height is uniform within each section and adjusted independently to fit the available height.
- Columns share a common bottom baseline; shorter sections begin lower on the page.
- Headers, legend, footer, and page numbers do not overlap grids. More than 24 assessments move the complete legend to dedicated leading pages rather than shrinking the grids.
- Every page of a fictional six-assessment, 544-task report was rendered and visually inspected. No clipping, overlap, missing label, missing grid, or blank trailing page was found.

## XLSX verification (2026-10-14)

- Five landscape worksheets named `Rejilla 1` through `Rejilla 5`, each containing five sections in the same grouping as the PDF.
- The workbook uses real cells, background fills, borders, four score subcolumns, merged ranges for 1- and 2-point tasks, print areas, frozen headers, and wrapped section headings.
- All 544 identifiers appear exactly once in the shared model and XLSX structure. Row heights and score geometry are deterministic, merge ranges do not overlap, and formula-error scanning returned no matches.
- Every worksheet was rendered through the bundled spreadsheet runtime and visually inspected. No clipped section heading, missing grid, invalid formula, or blank sheet was found.

## Shared-model and history verification

- The interactive report, PDF, and XLSX all call `buildTrackingGrid`; exporters do not duplicate historical acquisition logic.
- Finalized assessments are rendered chronologically first. A current `IN_PROGRESS` assessment is appended as the final provisional layer, clearly labeled `Provisional`/`PROVISIONAL` in the screen, PDF, and XLSX; exporting does not finalize it or mutate its status.
- Automated scenarios cover improvement, unchanged scores, regression, reacquisition, explicit zero, unanswered tasks, permanent exclusions, current Service Setting locks, historical locks, and 1-, 2-, and 4-point geometry.
- Color prefixes remain stable when histories grow through 1, 2, 5, 10, and 20 assessments. Legend text includes assessment number, date, and identifier suffix so color is not the only cue.
- Authenticated route verification covers the exact client-detail labels and both client export endpoints for an in-progress assessment, plus anonymous and cross-account denial. The generated route PDF had five pages and the XLSX had five worksheets; the assessment status and modification timestamp remained unchanged.
