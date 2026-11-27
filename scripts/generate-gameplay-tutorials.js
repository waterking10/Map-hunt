const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { installTrainingExample } = require('./tutorial-training');

const root = path.join(__dirname, '..');
const outputDir = path.join(root, 'assets', 'tutorials');
const captureDir = path.join(root, 'test-results', 'tutorial-recordings');
const gameUrl = pathToFileURL(path.join(root, 'index.html')).href;
const size = { width: 1280, height: 720 };
const CAPTION_FONT = 64;
const HOLD_MS = 6500;
const lessons = [
  { type: 'number', file: 'four-figure-grid.webm', title: 'Four-figure grid references', record: recordFourFigure },
  { type: 'six', file: 'six-figure-grid.webm', title: 'Six-figure grid references', record: recordSixFigure },
  { type: 'distance', file: 'distance.webm', title: 'Distance and scale', record: recordDistance },
  { type: 'bearing', file: 'bearings.webm', title: 'Bearings from north', record: recordBearing },
  { type: 'gradient', file: 'gradient.webm', title: 'Calculating gradient', record: recordGradient }
];
let currentCapture = null;
const wait = (page, ms) => page.waitForTimeout(ms);

async function freeze(page, text, { key = 'instruction', duration = HOLD_MS, target = null } = {}) {
  if (duration < 6000) throw new Error('Key instructions need at least six seconds of reading time');
  const frame = await page.evaluate(({ text, target }) => {
    document.querySelectorAll('.recording-focus').forEach(node => node.classList.remove('recording-focus'));
    const caption = document.querySelector('#recordingCaption');
    caption.textContent = text;
    caption.classList.add('show');
    if (target) document.querySelector(target)?.classList.add('recording-focus');
    const bounds = caption.getBoundingClientRect();
    if (bounds.height > 195 || caption.scrollHeight > caption.clientHeight + 1) throw new Error('Instruction caption does not fit its reserved band: ' + text);
    const expanded = document.querySelector('#zoomOverlay').classList.contains('show');
    return { captionFontPx: Number.parseFloat(getComputedStyle(caption).fontSize), viewBox: document.querySelector(expanded ? '#zoomSvg' : '.map-svg').getAttribute('viewBox'), cameraTarget: expanded ? 'expanded-grid' : 'map', captionBounds: bounds.toJSON() };
  }, { text, target });
  if (currentCapture) currentCapture.scenes.push({ key, text, startSeconds: (Date.now() - currentCapture.startedAt) / 1000, holdSeconds: duration / 1000, ...frame });
  await wait(page, duration);
}

async function clearCaption(page) {
  await page.evaluate(() => {
    document.querySelector('#recordingCaption').classList.remove('show');
    document.querySelectorAll('.recording-focus').forEach(node => node.classList.remove('recording-focus'));
  });
}

async function setCamera(page, box, { expanded = false } = {}) {
  await page.evaluate(({ box, expanded }) => {
    const value = `${box.x} ${box.y} ${box.width} ${box.height}`;
    if (expanded) document.querySelector('#zoomSvg').setAttribute('viewBox', value);
    else {
      document.querySelector('.map-svg').setAttribute('viewBox', value);
      document.querySelector('#gridClickOverlay').setAttribute('viewBox', value);
    }
  }, { box, expanded });
  await wait(page, 650);
}

async function slowMove(page, from, to, duration = 3000) {
  const steps = Math.ceil(duration / 50);
  await page.mouse.move(from.x, from.y);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await wait(page, duration / steps);
  }
}

async function installRecordingOverlay(page) {
  await page.evaluate(font => {
    document.body.classList.add('recording-tutorial');
    const style = document.createElement('style');
    style.textContent = `
      .recording-tutorial *, .recording-tutorial *::before, .recording-tutorial *::after{animation:none!important}
      #recordingCaption{position:fixed;z-index:10000;left:16px;right:16px;bottom:12px;box-sizing:border-box;min-height:150px;padding:12px 18px;border:4px solid #fff3bd;border-radius:16px;background:#061f2e;color:#fff;font:800 ${font}px/1.1 Arial;text-align:center;white-space:pre-line;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 12px #061f2e;pointer-events:none;opacity:0}
      #recordingCaption.show{opacity:1}
      #recordingCursor{position:fixed;z-index:10001;width:24px;height:24px;border:4px solid #fff;border-radius:50%;background:#df3025aa;box-shadow:0 0 0 3px #4e251b;transform:translate(-50%,-50%);pointer-events:none;display:none}
      #recordingCursor.moving{display:block}
      #mapCard.recording-map-zoom{position:fixed!important;inset:12px 12px 210px!important;width:auto!important;height:auto!important;min-height:0!important;z-index:9990!important;overflow:hidden!important;box-shadow:0 0 0 100vmax #082f40!important}
      #mapCard.recording-map-zoom .map-svg{height:100%!important;width:100%!important;min-height:0!important}
      .recording-tutorial .hud,.recording-tutorial .captain-box,.recording-tutorial .test-nav,.recording-tutorial #adventureName,.recording-tutorial .map-key{visibility:hidden!important}
      .recording-focus{outline:5px solid #ffc930!important;outline-offset:5px}
      .recording-map-highlight{fill:#ffd54f33;stroke:#d52d24;stroke-width:3;stroke-dasharray:8 5;pointer-events:none}
      .recording-corner{fill:#d1261c;stroke:#fff;stroke-width:3;pointer-events:none}
      .recording-line{stroke:#dc271e;stroke-width:5;stroke-linecap:round;pointer-events:none}
      .recording-tutorial #rulerTicks text{stroke:none!important;fill:#2b1b10;font-family:Arial;font-weight:700}
      #mapCard.recording-map-zoom #protractor{width:440px!important;height:440px!important}
      #mapCard.recording-map-zoom .zoom-overlay{padding:0!important}
      #mapCard.recording-map-zoom .zoom-panel{width:100%!important;height:100%!important;padding:0!important;border:0!important;border-radius:0!important;position:relative;overflow:hidden}
      #mapCard.recording-map-zoom .zoom-panel h3,#mapCard.recording-map-zoom .zoom-panel p{display:none}
      #mapCard.recording-map-zoom #zoomSvg{width:100%!important;height:100%!important;border:0!important;border-radius:0!important}
      #mapCard.recording-map-zoom #closeZoom{position:absolute;right:12px;top:12px;min-height:44px}
      .recording-answer .question-card{position:fixed!important;z-index:9995;left:140px;right:140px;top:80px;padding:24px;background:#fff4d2;border:5px solid #72502e;border-radius:20px}
      .recording-answer .question-card .level,.recording-answer .question-card #hintBtn,.recording-answer .question-card #hintList{display:none!important}
      .recording-answer .question-card h2{font:700 30px/1.2 Arial}
      .recording-answer #answerInput{font:700 64px/1.2 Arial;padding:12px;min-height:100px;text-align:center}
      .recording-answer #submitBtn{font:700 34px Arial!important;padding:14px 28px!important}
      .recording-answer #feedback{font:700 28px/1.2 Arial}
    `;
    document.head.appendChild(style);
    const caption = document.createElement('div'); caption.id = 'recordingCaption'; document.body.appendChild(caption);
    const cursor = document.createElement('div'); cursor.id = 'recordingCursor'; document.body.appendChild(cursor);
    document.addEventListener('mousemove', event => { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; });
    document.querySelector('#mapCard').classList.add('recording-map-zoom');
    document.querySelector('#protractor').style.left = '80px';
    document.querySelector('#protractor').style.top = '28px';
    document.querySelectorAll('#rulerTicks text').forEach(text => { text.setAttribute('font-size', '24'); text.setAttribute('y', '57'); });
    document.querySelectorAll('#virtualRuler > rect').forEach(rect => rect.setAttribute('height', '68'));
    const unit = document.querySelector('#virtualRuler > text'); unit.setAttribute('font-size', '22'); unit.setAttribute('x', '480'); unit.setAttribute('y', '95'); unit.setAttribute('text-anchor', 'end');
    document.querySelectorAll('#distancePoints text,#gradientPoints text').forEach(text => { text.setAttribute('font-size', '24'); text.setAttribute('font-weight', 'bold'); text.setAttribute('paint-order', 'stroke'); text.setAttribute('stroke', '#fff7df'); text.setAttribute('stroke-width', '3'); });
    [...document.querySelectorAll('#numberGroup text')].find(node => node.textContent === '000').setAttribute('font-size', '32');
  }, CAPTION_FONT);
}

async function setupQuestion(page, type) {
  await page.route('https://**', route => route.abort());
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  const training = await page.evaluate(installTrainingExample, type);
  await installRecordingOverlay(page);
  return training;
}

async function mapPointToScreen(page, point) {
  return page.locator('.map-svg').evaluate((svg, point) => {
    const screen = new DOMPoint(point.x, point.y).matrixTransform(svg.getScreenCTM());
    return { x: screen.x, y: screen.y };
  }, point);
}

async function highlightGridSquare(page, reference) {
  await page.evaluate(ref => {
    document.querySelectorAll('.recording-map-highlight').forEach(node => node.remove());
    const e = Number(ref.slice(0, 2)), n = Number(ref.slice(2));
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    for (const [key, value] of Object.entries({ x: 90 + (e - 30) * 80, y: 70 + (29 - n) * 67.5, width: 80, height: 67.5, class: 'recording-map-highlight' })) node.setAttribute(key, value);
    document.querySelector('.map-svg').appendChild(node);
  }, reference);
}

async function highlightFourFigureParts(page, reference, part) {
  await page.evaluate(({ ref, part }) => {
    ['recordingLeftLine', 'recordingBottomLine', 'recordingCorner'].forEach(id => document.getElementById(id)?.remove());
    const svg = document.querySelector('.map-svg'), e = Number(ref.slice(0, 2)), n = Number(ref.slice(2));
    const x = 90 + (e - 30) * 80, y = 70 + (29 - n) * 67.5, bottom = y + 67.5;
    const add = (tag, attributes) => { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value); svg.appendChild(node); };
    if (part === 'corner' || part === 'all') add('circle', { id: 'recordingCorner', cx: x, cy: bottom, r: 8, class: 'recording-corner' });
    if (part === 'easting' || part === 'all') add('line', { id: 'recordingLeftLine', x1: x, y1: y, x2: x, y2: bottom, class: 'recording-line' });
    if (part === 'northing' || part === 'all') add('line', { id: 'recordingBottomLine', x1: x, y1: bottom, x2: x + 80, y2: bottom, class: 'recording-line' });
  }, { ref: reference, part });
}

async function submitAnswer(page, answer) {
  await clearCaption(page);
  await page.evaluate(() => document.body.classList.add('recording-answer'));
  await page.locator('#answerInput').fill(answer);
  await freeze(page, `Enter ${answer}, then select Submit Answer.`, { key: 'answer-entry' });
  await page.locator('#submitBtn').click();
  if (!await page.locator('#feedback').evaluate(node => node.classList.contains('good'))) throw new Error('Training answer was not accepted');
  await page.locator('#feedback').evaluate(node => { node.textContent = 'Correct. This practice example is not scored.'; });
  await freeze(page, 'Correct. The practice example is complete.', { key: 'complete' });
}

async function recordFourFigure(page, data) {
  await setCamera(page, { x: 45, y: 440, width: 310, height: 215 });
  await freeze(page, 'Four-figure grid references\nPractice example — not scored', { key: 'intro' });
  await freeze(page, 'Find training marker T.', { key: 'find-feature', target: '#trainingMarker' });
  await highlightGridSquare(page, data.answer);
  await freeze(page, 'Find the square containing its centre.', { key: 'square' });
  await highlightFourFigureParts(page, data.answer, 'corner');
  await freeze(page, 'Start at the square’s bottom-left corner.', { key: 'bottom-left' });
  await highlightFourFigureParts(page, data.answer, 'easting');
  await freeze(page, `Read the left grid line first: ${data.answer.slice(0, 2)}.`, { key: 'easting' });
  await highlightFourFigureParts(page, data.answer, 'northing');
  await freeze(page, `Read the bottom grid line second: ${data.answer.slice(2)}.`, { key: 'northing' });
  await highlightFourFigureParts(page, data.answer, 'all');
  await freeze(page, `${data.answer.slice(0, 2)} then ${data.answer.slice(2)} gives ${data.answer}.`, { key: 'combine' });
  await submitAnswer(page, data.answer);
}

async function showTrainingMarkerInZoom(page) {
  await page.evaluate(() => {
    const svg = document.querySelector('#zoomSvg'), square = questions[index].square;
    const x = 55 + square.x * 40, y = 435 - square.y * 40;
    // The production zoom uses real map symbols. Keep this separate practice marker T.
    svg.querySelector('path')?.remove();
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    marker.id = 'expandedTrainingMarker';
    marker.innerHTML = `<path d="M${x} ${y - 12}L${x + 12} ${y} ${x} ${y + 12} ${x - 12} ${y}Z" fill="#d72d24" stroke="white" stroke-width="3"/><text x="${x + 17}" y="${y - 12}" font-family="Arial" font-size="32" font-weight="bold" fill="#4d201b">T</text>`;
    svg.appendChild(marker);
  });
}

async function recordSixFigure(page, data) {
  await setCamera(page, { x: 45, y: 420, width: 355, height: 235 });
  await freeze(page, 'Six-figure grid references\nPractice example — not scored', { key: 'intro' });
  await highlightGridSquare(page, data.four);
  await freeze(page, `Find training T in square ${data.four}.`, { key: 'square' });
  await clearCaption(page);
  const hit = page.locator(`.grid-hit[data-square="${data.four}"]`);
  const box = await hit.boundingBox();
  const target = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.evaluate(() => document.querySelector('#recordingCursor').classList.add('moving'));
  await slowMove(page, { x: target.x - 100, y: target.y + 50 }, target, 2000);
  await hit.click();
  await page.evaluate(() => { document.querySelector('#recordingCursor').classList.remove('moving'); document.querySelectorAll('#zoomSvg text').forEach(text => text.setAttribute('font-size', '32')); });
  await showTrainingMarkerInZoom(page);
  await setCamera(page, { x: 0, y: 0, width: 520, height: 520 }, { expanded: true });
  await freeze(page, 'The enlarged grid divides the square into tenths.', { key: 'tenths' });
  await setCamera(page, { x: 0, y: 210, width: 350, height: 310 }, { expanded: true });
  await freeze(page, `Read across first: ${data.six[2]} tenths.`, { key: 'easting-tenths' });
  await freeze(page, `Write ${data.six.slice(0, 2)}, then ${data.six[2]}: easting ${data.six.slice(0, 3)}.`, { key: 'easting' });
  await freeze(page, `Read up second: ${data.six[5]} tenths.`, { key: 'northing-tenths' });
  await freeze(page, `Write ${data.six.slice(3, 5)}, then ${data.six[5]}: northing ${data.six.slice(3)}.`, { key: 'northing' });
  await page.locator('#closeZoom').click();
  await freeze(page, `${data.six.slice(0, 3)} then ${data.six.slice(3)} gives ${data.six}.`, { key: 'combine' });
  await submitAnswer(page, data.answer);
}

async function positionRuler(page, pair) {
  await clearCaption(page);
  const from = await page.locator('#virtualRuler').evaluate(node => { const p = new DOMPoint(20, 25).matrixTransform(node.getScreenCTM()); return { x: p.x, y: p.y }; });
  const to = await mapPointToScreen(page, { x: pair.a.x + 20, y: pair.a.y + 25 });
  const before = await page.locator('#virtualRuler').getAttribute('transform');
  await page.evaluate(() => document.querySelector('#recordingCursor').classList.add('moving'));
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await slowMove(page, from, to, 3200); await page.mouse.up();
  await page.evaluate(() => document.querySelector('#recordingCursor').classList.remove('moving'));
  const after = await page.locator('#virtualRuler').getAttribute('transform');
  if (before === after) throw new Error('The real ruler did not move');
  const origin = await page.locator('#virtualRuler').evaluate(node => ({ x: node.transform.baseVal.consolidate().matrix.e, y: node.transform.baseVal.consolidate().matrix.f }));
  if (Math.hypot(origin.x - pair.a.x, origin.y - pair.a.y) > 0.2) throw new Error('Ruler zero is not centred on training A');
}

async function recordDistance(page, data) {
  await setCamera(page, { x: 100, y: 350, width: 650, height: 260 });
  await freeze(page, 'Distance and scale\nPractice example — not scored', { key: 'intro' });
  await freeze(page, 'Measure the straight line from A to B.', { key: 'points' });
  await positionRuler(page, data.pair);
  await setCamera(page, { x: 140, y: 395, width: 580, height: 230 });
  await freeze(page, 'Place the ruler’s zero at the centre of A.', { key: 'ruler-zero' });
  await freeze(page, 'Read at the centre of B: 5.2 cm.', { key: 'measurement' });
  await freeze(page, 'At 1:50,000, 1 cm represents 0.5 km.', { key: 'scale' });
  await freeze(page, '5.2 × 0.5 = 2.60 km.', { key: 'calculation' });
  await submitAnswer(page, data.answer);
}

async function recordBearing(page, data) {
  await setCamera(page, { x: 110, y: 125, width: 400, height: 430 });
  await freeze(page, 'Bearings from north\nPractice example — not scored', { key: 'intro' });
  await freeze(page, 'Start at training A. Aim towards training B.', { key: 'points' });
  await clearCaption(page);
  const start = await mapPointToScreen(page, data.pair.a);
  const protractor = await page.locator('#protractor').boundingBox();
  const from = { x: protractor.x + protractor.width / 2, y: protractor.y + protractor.height / 2 };
  await page.evaluate(() => document.querySelector('#recordingCursor').classList.add('moving'));
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await slowMove(page, from, start, 3200); await page.mouse.up();
  await page.evaluate(() => document.querySelector('#recordingCursor').classList.remove('moving'));
  await freeze(page, 'Centre the protractor on A. Keep 000° north.', { key: 'centre' });
  await freeze(page, 'Bearings are measured clockwise from north.', { key: 'clockwise' });
  await clearCaption(page);
  const position = await page.locator('#protractor').evaluate(node => `${node.style.left}|${node.style.top}`);
  const path = await page.locator('#protractor svg').evaluate(svg => {
    const matrix = svg.getScreenCTM(); return Array.from({ length: 81 }, (_, i) => { const rad = (150 * i / 80 - 90) * Math.PI / 180; const p = new DOMPoint(180 + 145 * Math.cos(rad), 180 + 145 * Math.sin(rad)).matrixTransform(matrix); return { x: p.x, y: p.y }; });
  });
  await page.evaluate(() => document.querySelector('#recordingCursor').classList.add('moving'));
  await page.mouse.move(path[0].x, path[0].y); await page.mouse.down();
  for (const p of path.slice(1)) { await page.mouse.move(p.x, p.y); await wait(page, 50); }
  await page.mouse.up();
  await page.evaluate(() => { document.querySelector('#recordingCursor').classList.remove('moving'); [...document.querySelectorAll('#numberGroup text')].find(node => node.textContent === '150').setAttribute('font-size', '46'); });
  if (await page.locator('#bearingRay').getAttribute('aria-valuenow') !== '150') throw new Error('The real red-ray drag did not reach 150 degrees');
  if (await page.locator('#protractor').evaluate(node => `${node.style.left}|${node.style.top}`) !== position) throw new Error('Ray rotation moved the protractor body');
  await freeze(page, 'Drag the red line clockwise towards B.', { key: 'ray' });
  await freeze(page, 'Read the scale: 150°.', { key: 'reading' });
  await freeze(page, 'Use three digits. The bearing is 150°.', { key: 'format' });
  await submitAnswer(page, data.answer);
}

async function recordGradient(page, data) {
  await setCamera(page, { x: 145, y: 205, width: 610, height: 380 });
  await freeze(page, 'Calculating gradient\nPractice example — not scored', { key: 'intro' });
  await freeze(page, 'A is 180 m high. B is 140 m high.', { key: 'elevations' });
  await freeze(page, 'Vertical interval: 180 − 140 = 40 m.', { key: 'vertical' });
  await positionRuler(page, data.pair);
  await setCamera(page, { x: 210, y: 230, width: 280, height: 200 });
  await freeze(page, 'Read the horizontal map distance: 2.0 cm.', { key: 'measurement' });
  await freeze(page, '2.0 × 500 = 1000 m on the ground.', { key: 'horizontal' });
  await freeze(page, 'Divide horizontal distance by vertical interval.', { key: 'method' });
  await freeze(page, '1000 ÷ 40 = 25.', { key: 'calculation' });
  await freeze(page, 'Write the gradient as a ratio: 1:25.', { key: 'format' });
  await submitAnswer(page, data.answer);
}

async function copyRecording(video, destination) {
  const source = await video.path();
  for (let attempt = 0; ; attempt++) {
    try { await fs.copyFile(source, destination); break; }
    catch (error) { if (attempt >= 3) throw error; await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1))); }
  }
  await video.delete();
}

async function generate() {
  await fs.mkdir(outputDir, { recursive: true }); await fs.mkdir(captureDir, { recursive: true });
  const metadataFile = path.join(outputDir, 'recording-plan.json');
  let plans = [];
  try { plans = JSON.parse(await fs.readFile(metadataFile, 'utf8')); } catch {}
  const selected = process.env.MAP_HUNT_TUTORIAL ? lessons.filter(lesson => lesson.file.includes(process.env.MAP_HUNT_TUTORIAL)) : lessons;
  if (!selected.length) throw new Error('No matching tutorial');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const lesson of selected) {
      currentCapture = { file: lesson.file, type: lesson.type, title: lesson.title, startedAt: Date.now(), scenes: [] };
      const context = await browser.newContext({ viewport: size, recordVideo: { dir: captureDir, size } });
      const page = await context.newPage(); const video = page.video();
      const data = await setupQuestion(page, lesson.type);
      currentCapture.example = { answer: data.answer, prompt: data.prompt, points: data.trainingPoints, catalogCount: data.catalogCount, islandsChecked: data.islandsChecked, levelsChecked: data.levelsChecked, collisions: data.collisions };
      await lesson.record(page, data);
      await context.close(); await copyRecording(video, path.join(outputDir, lesson.file));
      const plan = { ...currentCapture }; delete plan.startedAt;
      plans = [...plans.filter(existing => existing.file !== lesson.file), plan];
      await fs.writeFile(metadataFile, JSON.stringify(lessons.map(item => plans.find(plan => plan.file === item.file)).filter(Boolean), null, 2) + '\n');
      console.log(`Generated ${lesson.file}: ${plan.scenes.length} readable scenes; example ${data.answer}; checked ${data.catalogCount} scored questions.`);
    }
  } finally { await browser.close(); currentCapture = null; }
}

if (require.main === module) generate().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { setupQuestion, installRecordingOverlay, showTrainingMarkerInZoom, lessons, CAPTION_FONT, HOLD_MS };
