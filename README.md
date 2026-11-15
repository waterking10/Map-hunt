# Map Hunt

Map Hunt is a secondary-school geography game covering grid references, compass directions, bearings, scaled distance, gradient, and interpretation of original topographic sheets.

## Using hints

Each question offers up to four progressive hints. Select **Show hint 1** for a reminder of the method, then request further hints only when needed. Each new hint is more specific, and earlier hints stay visible while you work. Hints reset when a new island expedition begins.

Hints do not cost XP or gold. Rewards still depend on submitted attempts: a correct first, second, or later attempt earns 100, 80, or 60 points respectively. After three unsuccessful submissions, the clue is completed for 40 points and the reference answer is shown.

## Gameplay tutorials

The educational notes for four-figure grids, six-figure grids, distance, bearings, and gradient include short recordings made in the real Map Hunt interface. Open the matching notes lesson and select **Load … tutorial**. Videos are loaded only on request, include browser playback/fullscreen controls and a replay button, and are accompanied by a text alternative.

The recordings use dedicated, unscored training examples so they teach the complete method without revealing an answer from the scored question set. Important steps use close map framing, large high-contrast captions, focused highlights, and 2–4 second reading pauses. The four-figure lesson explicitly marks the square's bottom-left corner before reading the easting and northing.

Regenerate all five WebM recordings with:

```powershell
npm run tutorials:generate
```

The generator uses Playwright, fixed Map Hunt questions, and recording-only captions, cursor feedback, and focus highlights. It does not replace or mock the game's geography controls.

Decode each generated asset, check its dimensions and duration, and refresh the preview frames with:

```powershell
npm run tutorials:verify
```

## Development

Run the Playwright suite with:

```powershell
npm test
```
# Map Hunt: The Lost Treasure

Map Hunt is a browser-based educational geography game for secondary-school students. Players join Captain Redbeard as navigators, study island and topographic maps, answer mapwork questions, and earn XP and gold while working toward treasure.

## Educational Purpose

The game provides practice with:

- four-figure and six-figure grid references;
- compass directions and three-figure bearings;
- straight-line distance and scale at 1:50,000;
- gradient calculations;
- map symbols and legends; and
- topographic evidence about relief, drainage, settlement, and land use.

## Current Gameplay

Map Hunt currently includes:

- **Third Form mode:** 12 questions per island covering grid references, directions, bearings, and measured distances.
- **CSEC mode:** mapwork questions for Fourth and Fifth Form students, including grid references, directions, bearings, distance, gradient, and original topographic-map questions.
- **Six adventure maps:** Isla del Tesoro, Volcanic Island, Twin Bay Island, Crescent Island, Highland Island, and Mangrove Island.
- **Four survey sheets:** Basseterre, Dominica—Marigot, Savanna-la-Mar, and Speightstown.
- **Three-island challenge:** students can complete three different islands for participation bonus marks.
- **Progressive feedback:** the first incorrect attempt prompts another try, the next supplies a hint, and a later attempt reveals guidance so the expedition can continue.
- **Scoring:** correct responses award XP and gold, with lower awards after additional attempts. Results include score and accuracy.
- **Skill lessons:** in-game notes introduce map keys, four- and six-figure references, bearings, distance, gradient, and topographic interpretation.
- **Saved progress:** challenge progress is stored in the browser, and completed island results are submitted to the configured results service.
- **Problem reporting:** the results screen provides an email-based problem-report link.

## How Students Play

1. Open `index.html` in a modern browser.
2. Enter a student name and class.
3. Choose Third Form or CSEC.
4. Select **Start Adventure**, read the introduction, and begin the expedition.
5. Study the map, question, lesson notes, and available tools.
6. Enter or select an answer, then select **Submit Answer**.
7. Use **Hint** when needed. The game also provides progressively more specific feedback after repeated incorrect attempts.
8. Use the numbered question navigation to revisit unfinished questions.
9. Complete every question to view the island result and, when available, choose another map for the three-island challenge.

## Using Progressive Hints

Each question offers up to four progressive hints. Select **Show hint 1** for a reminder of the method, then request further hints only when needed. Each new hint is more specific, and earlier hints stay visible while the student works. Hint progress resets when a new island expedition begins.

Requesting hints does not cost XP or gold. Rewards still depend on submitted attempts: a correct first, second, or later attempt earns 100, 80, or 60 points respectively. After three unsuccessful submissions, the clue is completed for 40 points and the reference answer is shown.

## Geography Tools and Controls

### Grid references

For six-figure questions, select the grid square containing the named symbol. The game opens a magnified square divided into tenths so the position can be estimated more precisely.

### Virtual ruler

Distance and gradient questions display a calibrated ruler. Drag the ruler to move it, drag its handle or use the rotation control to align it, then apply the displayed 1:50,000 scale.

### Digital protractor

Bearing questions display a 360° protractor. Drag the protractor over the starting symbol and use the angle slider to rotate the red sighting line clockwise from north toward the destination.

### Topographic sheets

Topographic questions provide zoom-in, zoom-out, and reset controls. The sheet can also be dragged to pan around the image.

## Mobile and Desktop Compatibility

The interface includes responsive layouts for narrower screens and uses pointer-based dragging for map tools. Touch, mouse, and keyboard support should be checked whenever an affected interface changes. The current automated suite verifies gameplay logic in a desktop browser; responsive visual checks still require browser testing at phone and desktop widths.

## Run Locally

No build step is required for the game itself.

1. Clone or download the repository.
2. Open the repository folder.
3. Open `index.html` in a modern browser.

The game references external services and study materials, so some result-saving and linked-resource features require an internet connection.

## Automated Tests

The browser tests use Playwright and Node.js.

```powershell
npm install
npx playwright install chromium
npm test
```

Individual playthroughs can be selected with Playwright's `--grep` option. For example:

```powershell
npx playwright test --grep "Third Form completes every question on Volcanic Island"
```

Run the complete suite before preparing a pull request that changes shared gameplay, scoring, navigation, or map logic.

## GitHub Pages

Map Hunt is a static site with `index.html` at the repository root, so it can be hosted with GitHub Pages without a build step. If Pages is enabled for the repository:

1. Open the repository's **Settings** on GitHub.
2. Open **Pages**.
3. Choose deployment from a branch.
4. Select the approved production branch and the repository root (`/`).
5. Save the setting and wait for GitHub to publish the site.

Only deploy reviewed and approved changes. This repository does not currently contain a GitHub Pages workflow file, so confirm the repository's Pages settings before relying on deployment.

## Project Documentation

- [Development rules](AGENTS.md)
- [Development history](CHANGELOG.md)
- [Development roadmap](ROADMAP.md)

The legacy `README.txt` is retained as historical prototype notes. This README is the current project guide.
