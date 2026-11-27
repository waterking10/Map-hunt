const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const videoDir = path.join(root, 'assets', 'tutorials');
const previewDir = path.join(videoDir, 'previews');
const files = ['four-figure-grid.webm', 'six-figure-grid.webm', 'distance.webm', 'bearings.webm', 'gradient.webm'];
const preferredScenes = ['easting', 'easting-tenths', 'measurement', 'reading', 'calculation'];

function validatePlan(plan, duration) {
  if (!plan || !Array.isArray(plan.scenes) || plan.scenes.length < 5) throw new Error('Missing readable scene plan');
  if (plan.example.islandsChecked !== 6 || !['third', 'csec'].every(level => plan.example.levelsChecked.includes(level))
    || plan.example.catalogCount < 134 || plan.example.collisions.length) throw new Error(`${plan.file}: incomplete example isolation checks`);
  for (const [index, scene] of plan.scenes.entries()) {
    if (!scene.text || scene.holdSeconds < 6 || scene.captionFontPx < 64) throw new Error(`${plan.file}: unreadable instruction ${scene.key}`);
    const box = scene.captionBounds;
    if (box.x < 0 || box.y < 520 || box.right > 1280 || box.bottom > 720 || box.height > 195) throw new Error(`${plan.file}: caption overlaps map or frame in ${scene.key}`);
    const camera = scene.viewBox.split(/\s+/).map(Number);
    const expanded = scene.cameraTarget === 'expanded-grid';
    if (camera.length !== 4 || camera.some(value => !Number.isFinite(value)) || camera[2] > (expanded ? 520 : 650) || camera[3] > (expanded ? 520 : 430)) throw new Error(`${plan.file}: missing close map framing`);
    if (index && scene.startSeconds < plan.scenes[index - 1].startSeconds + plan.scenes[index - 1].holdSeconds - 0.15) throw new Error(`${plan.file}: reading holds overlap`);
  }
  const last = plan.scenes.at(-1);
  // Capture begins just after context creation, before page navigation.
  if (last.startSeconds + last.holdSeconds > duration + 2) throw new Error(`${plan.file}: final instruction is cut short`);
}

async function seekDecodedFrame(video, time) {
  return video.evaluate((element, target) => new Promise((resolve, reject) => {
    if (Math.abs(element.currentTime - target) < 0.005 && element.readyState >= 2) {
      requestAnimationFrame(() => requestAnimationFrame(resolve)); return;
    }
    let seeked = false, decoded = false, frameId;
    const timer = setTimeout(() => finish(new Error('Timed out decoding selected video frame')), 15000);
    function finish(error) {
      clearTimeout(timer);
      element.removeEventListener('seeked', onSeeked); element.removeEventListener('error', onError);
      if (frameId) element.cancelVideoFrameCallback(frameId);
      if (error) reject(error); else resolve();
    }
    function ready() { if (seeked && decoded && element.readyState >= 2) finish(); }
    function onSeeked() { seeked = true; ready(); }
    function onError() { finish(new Error('Video failed to decode')); }
    function nextFrame() {
      frameId = element.requestVideoFrameCallback((_now, metadata) => {
        if (Math.abs(metadata.mediaTime - target) < 0.3) { decoded = true; ready(); }
        else nextFrame();
      });
    }
    element.addEventListener('seeked', onSeeked); element.addEventListener('error', onError, { once: true });
    nextFrame(); element.currentTime = target;
  }), time);
}

async function samplePixels(video) {
  return video.evaluate(element => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 72;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(element, 0, 0, canvas.width, canvas.height);
    return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
  });
}

async function verify() {
  const plans = JSON.parse(await fs.readFile(path.join(videoDir, 'recording-plan.json'), 'utf8'));
  await fs.mkdir(previewDir, { recursive: true });
  const selectedFiles = process.env.MAP_HUNT_TUTORIAL ? files.filter(file => file.includes(process.env.MAP_HUNT_TUTORIAL)) : files;
  if (!selectedFiles.length) throw new Error('No matching tutorial selected for verification');
  let previous = [];
  try { previous = JSON.parse(await fs.readFile(path.join(previewDir, 'manifest.json'), 'utf8')); } catch {}
  const browser = await chromium.launch({ headless: true }); const results = [];
  try {
    for (const file of selectedFiles) {
      const index = files.indexOf(file);
      const plan = plans.find(item => item.file === file);
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const media = await fs.readFile(path.join(videoDir, file));
      // Fulfilled local media shares this player's synthetic HTTP origin, allowing
      // pixel checks without a server, outside requests or file-origin CORS issues.
      await page.route('http://tutorial-verification.local/**', route => {
        if (new URL(route.request().url()).pathname === '/player') return route.fulfill({ contentType: 'text/html', body: '<style>html,body{margin:0;background:#082f40}video{display:block;width:1280px;height:720px;object-fit:contain}</style><video preload="auto" muted></video>' });
        const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || '');
        if (range) {
          const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : media.length - 1, media.length - 1);
          if (start > end) return route.fulfill({ status: 416, headers: { 'Content-Range': `bytes */${media.length}` } });
          return route.fulfill({ status: 206, contentType: 'video/webm', body: media.subarray(start, end + 1), headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${media.length}`, 'Content-Length': String(end - start + 1) } });
        }
        return route.fulfill({ contentType: 'video/webm', body: media, headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(media.length) } });
      });
      await page.goto('http://tutorial-verification.local/player'); const video = page.locator('video');
      await video.evaluate((element, name) => { element.src = '/' + name; element.load(); }, file);
      await video.evaluate(element => new Promise((resolve, reject) => {
        if (element.readyState >= 1) return resolve();
        const timer = setTimeout(() => reject(new Error('Timed out loading video metadata')), 15000);
        element.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(); }, { once: true });
        element.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Video failed to decode')); }, { once: true });
      }));
      const metadata = await video.evaluate(element => ({ duration: element.duration, width: element.videoWidth, height: element.videoHeight }));
      if (!Number.isFinite(metadata.duration) || metadata.duration < 45 || metadata.duration > 120) throw new Error(`${file}: unexpected reading pace/duration ${metadata.duration}`);
      if (metadata.width !== 1280 || metadata.height !== 720) throw new Error(`${file}: unexpected frame dimensions`);
      validatePlan(plan, metadata.duration);
      const scene = plan.scenes.find(item => item.key === preferredScenes[index]) || plan.scenes[2];
      const midpoint = scene.startSeconds + scene.holdSeconds / 2;
      await seekDecodedFrame(video, midpoint - 0.75); const first = await samplePixels(video);
      const preview = path.join(previewDir, file.replace('.webm', '.png')); await page.screenshot({ path: preview });
      await seekDecodedFrame(video, midpoint + 0.75); const second = await samplePixels(video);
      let difference = 0;
      for (let pixel = 0; pixel < first.length; pixel += 4) for (let channel = 0; channel < 3; channel++) difference += Math.abs(first[pixel + channel] - second[pixel + channel]);
      const meanPixelDifference = difference / (first.length / 4 * 3);
      if (meanPixelDifference > 3) throw new Error(`${file}: key instruction is not visually still (${meanPixelDifference.toFixed(2)})`);
      if (file === 'four-figure-grid.webm') {
        const corner = plan.scenes.find(item => item.key === 'bottom-left');
        if (!corner) throw new Error('Four-figure tutorial is missing bottom-left-corner instruction');
        await seekDecodedFrame(video, corner.startSeconds + corner.holdSeconds / 2); await page.screenshot({ path: path.join(previewDir, 'four-figure-bottom-left-corner.png') });
      }
      results.push({ file, ...metadata, preview: path.relative(root, preview), captionFontPx: Math.min(...plan.scenes.map(item => item.captionFontPx)), minimumHoldSeconds: Math.min(...plan.scenes.map(item => item.holdSeconds)), instructionCount: plan.scenes.length, meanPixelDifference: Number(meanPixelDifference.toFixed(4)), example: { answer: plan.example.answer, catalogCount: plan.example.catalogCount, islandsChecked: plan.example.islandsChecked, levelsChecked: plan.example.levelsChecked } });
      await page.close();
    }
  } finally { await browser.close(); }
  const manifest = files.map(file => results.find(item => item.file === file) || previous.find(item => item.file === file)).filter(Boolean);
  await fs.writeFile(path.join(previewDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.table(results.map(({ file, duration, captionFontPx, minimumHoldSeconds }) => ({ file, duration: duration.toFixed(1), captionFontPx, minimumHoldSeconds })));
}

if (require.main === module) verify().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { validatePlan, seekDecodedFrame, verify };
