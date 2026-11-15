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
