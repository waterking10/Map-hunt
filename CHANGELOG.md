# Changelog

## Unreleased

- Replaced the protractor's separate angle slider with direct dragging of the red sighting line or endpoint, including one-degree mouse and touch adjustments.
- Preserved independent protractor-body movement and added keyboard control and accessible angle values directly on the red line.
- Kept the full protractor and its endpoint handle reachable inside the compact phone map.
- Refreshed the bearings tutorial recording, preview, and capture script to demonstrate direct line dragging.
- Added phone and desktop regression coverage for protractor dragging, fine adjustments, cancellation, and keyboard access.
- Updated browser-test fixtures to keep sign-in mocked and follow the game's automatic question advancement without competing manual Next clicks.
- Added five lazy-loaded instructional gameplay videos to the existing notes for four-figure grids, six-figure grids, distance, bearings, and gradient.
- Added responsive native video controls, a replay action, and text alternatives without changing the existing lesson text.
- Added a reproducible Playwright capture workflow using the real Map Hunt map, expanded grid, ruler, and protractor controls.
- Refined all tutorial recordings with close map framing, larger contextual captions, focused highlights, and 2–4 second instructional freeze frames.
- Added dedicated unscored training examples so tutorial answers do not expose scored question answers.
- Expanded the four-figure tutorial to mark the bottom-left corner, left easting line, and bottom northing line in sequence.
- Added four-stage, question-specific hints for every supported geography question type.
- Kept earlier hints visible and reset hint progress for each new island expedition.
- Added accessible hint status text and touch-friendly controls for phone and desktop layouts.
- Documented hint use and confirmed that requesting hints does not change scoring.
This file records verified repository changes. The project currently has no Git tags or documented published release dates, so version numbers and release dates are intentionally omitted.

## Unreleased

### Added

- Repository-wide development, testing, documentation, security, accessibility, and pull-request rules.
- A current project guide and development roadmap.
- Four-stage, question-specific hints for every supported geography question type.
- Accessible hint status text and touch-friendly controls for phone and desktop layouts.

### Changed

- Expanded project documentation to reflect the verified game, controls, browser tests, and local setup.
- Kept earlier hints visible while students work and reset hint progress for each new island expedition.
- Documented that requesting hints does not change scoring.

### Fixed

- No verified fixes in this documentation-only change.

### Security

- Added permanent instructions requiring secure development, privacy review, vulnerability reporting, and verification of security fixes.

## Previous Releases

No tagged or dated releases are recorded in the repository. The following unversioned history is supported by Git commits:

- Added the initial Map Hunt browser prototype and later expanded its gameplay and instructional content.
- Added original topographic-map PDF and image assets for Dominica—Marigot, Savanna-la-Mar, and Speightstown.
- Added repository-level Codex development rules.
- Added Playwright browser tests covering Third Form, CSEC, map-specific questions, scoring, maps, survey sheets, and the three-island challenge.
- Improved completed-island result saving and replaced the earlier Google Forms result-reporting flow with direct result submission and email-based problem reporting.
