# Roadmap

## Completed

- Embedded lightweight, reproducible gameplay tutorials for the five main calculation and grid-reference skills.
- Refined tutorial pacing, close-up map framing, instruction pauses, and mobile-readable captions for all five gameplay tutorials.
- Progressive, data-derived hints for grid references, directions, bearings, distance, gradient, and topographic-map questions.

## Future considerations

- Gather classroom feedback on which fourth-level clues best support independent work.
- Consider teacher-configurable hint wording and optional analytics without changing student scores.
- Gather classroom feedback on tutorial pacing, captions, and preferred mobile playback size.
# Map Hunt Development Roadmap

This roadmap reflects features verified on the repository's main branch. Work on other branches is not treated as completed or released.

## Completed

### Gameplay and learning

- Third Form and CSEC learning modes.
- Six adventure maps and four original survey sheets.
- Four-figure and six-figure grid-reference questions.
- Compass-direction, bearing, scaled-distance, gradient, and topographic-evidence questions.
- Progressive three-attempt feedback: retry guidance, a question-specific hint, and later answer guidance.
- Four-stage, data-derived hints for grid references, directions, bearings, distance, gradient, and topographic-map questions.
- A three-island challenge with score, accuracy, XP, gold, and participation progress.

### Tools and tutorials

- Clickable grid-square selection and a magnified tenths grid for six-figure references.
- In-game skill lessons for map keys, grid references, bearings, distance, gradient, and topographic interpretation.
- A draggable and rotatable virtual ruler.
- A movable 360° protractor with a directly draggable red line and endpoint, one-degree mouse/touch adjustments, keyboard access, and no separate angle slider.
- A refreshed bearings tutorial demonstrating direct dragging and fully reachable controls in the compact phone map.
- Zoom, pan, and reset controls for original topographic sheets.
- Numbered question navigation for revisiting unfinished work.

### Interface, reliability, and workflow

- Responsive breakpoints for phone-sized and desktop layouts.
- Pointer-based dragging for interactive geography tools.
- Browser storage for three-island challenge progress.
- Completed-island result submission with visible save status and retry guidance.
- Email-based problem reporting.
- Automated Playwright coverage for all adventure maps, both learning modes, all survey sheets, question outcomes, scoring, and the three-island challenge.
- Repository-wide development documentation and review rules.

## In Progress

No implementation item is currently marked In Progress.

## Planned

### Mobile gameplay

- Audit and improve phone layouts, touch target sizes, and tool positioning while preserving desktop behavior.
- Check for overlapping controls and horizontal scrolling across representative mobile widths.
- Expand automated or repeatable responsive-layout checks where practical.

### Hints and learning

- Gather classroom feedback on which fourth-level clues best support independent work.
- Consider teacher-configurable hint wording and optional analytics without changing student scores.
- Simplify lengthy geography notes without removing essential concepts.
- Improve student-facing feedback and error messages where usability testing identifies confusion.
- Evaluate whether the existing six-figure grid-selection banner and lesson need additional persistent instructions.

### Geography tools

- Improve ruler, protractor, and map-tool integration and positioning on small screens.
- Preserve calibrated measurements, bearing conventions, and accepted tolerances during tool changes.

### Tutorials

- Create a video explaining four-figure and six-figure grid references.
- Add short tutorials for individual geography tools.
- Make instructional resources easy to reopen during gameplay.

### Interface and communication

- Review the current email-based developer contact and problem-reporting experience.
- Continue improving accessibility, keyboard use, touch interactions, and readable instructions.

### Security and performance

- Review client-side data handling and the result-submission service, including authorization and database policies.
- Address only verified vulnerabilities and add regression checks for each fix.
- Measure loading and runtime performance before making optimization claims, particularly for large embedded map assets.
- Expand automated coverage for responsive layout, accessibility, failure handling, and external-service boundaries.

## Future Ideas

- Additional curriculum-aligned geography exercises and map sources.
- Teacher-facing progress summaries that minimize student-data collection.
- Optional practice modes focused on one geography skill at a time.
- Further proposals should include educational value, privacy impact, maintenance cost, and a verification plan.
