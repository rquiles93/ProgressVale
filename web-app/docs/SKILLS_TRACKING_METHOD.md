# Skills Tracking grid model

## Source hierarchy

The verified imported task dataset controls section membership, task order, identifiers, and maximum scores. The original grid PDF is used only as a visual reference for vertical task ordering and compact grid geometry because it contains missing labels and missing grids.

## Score boxes

- Every supported task has one row.
- Rows are displayed from the highest task identifier at the top to task 1 at the bottom.
- A task has exactly 1, 2, or 4 score boxes according to its verified maximum.
- Every row in a section has the same total width. One-box rows use the full width, two-box rows use two halves, and four-box rows use four quarters.
- A null score is unanswered. An explicit zero is assessed but fills no boxes.
- A locked section fills no boxes and is not interpreted as zero.

## Historical colors

Assessments are ordered by completion date, then creation date and identifier. Each chronological position receives a deterministic color. Colors therefore remain stable across the screen, PDF, XLSX, repeated exports, and future sessions as long as the historical ordering is unchanged. The first sixteen colors use a curated accessible palette; later colors use deterministic golden-angle hues without cycling silently.

Each level keeps the color of the first assessment that reached it. A later higher score colors only newly reached levels. An unchanged score adds no color.

## Regression and reacquisition

A lower later score is retained as an observation and marked `R`. Previously acquired levels remain colored because the cumulative grid and the current observed score are separate concepts. Later reacquisition does not repaint levels that were already acquired. This marker is an application convention for transparent history and is not represented as an official publisher convention.

The UI exposes current score/state metadata without relying only on color. PDF and XLSX task labels use `R`, `0`, `-`, and `x` for regression, explicit zero, unanswered, and locked states.
