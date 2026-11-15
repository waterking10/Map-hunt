const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const videoDir = path.join(root, 'assets', 'tutorials');
const previewDir = path.join(videoDir, 'previews');
const files = [
  'four-figure-grid.webm',
  'six-figure-grid.webm',
  'distance.webm',
  'bearings.webm',
  'gradient.webm'
];

async function verify() {
  await fs.mkdir(previewDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const file of files) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const source = pathToFileURL(path.join(videoDir, file)).href;
      await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'domcontentloaded'});
      await page.evaluate(src=>{document.head.innerHTML='<style>html,body{margin:0;background:#082f40}video{display:block;width:1280px;height:720px;object-fit:contain}</style>';document.body.innerHTML=`<video controls src="${src}"></video>`},source);
      const video = page.locator('video');
      await video.evaluate(element => Promise.race([new Promise((resolve, reject) => {
        if(element.readyState>=1)return resolve();
        element.addEventListener('loadedmetadata', resolve, { once:true });
        element.addEventListener('error', () => reject(new Error('Video failed to decode')), { once:true });
      }),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timed out loading video metadata')),10000))]));
      const metadata = await video.evaluate(element => ({ duration:element.duration, width:element.videoWidth, height:element.videoHeight }));
      if(!Number.isFinite(metadata.duration)||metadata.duration<10||metadata.duration>45)throw new Error(`${file} has unexpected duration ${metadata.duration}`);
      if(metadata.width!==1280||metadata.height!==720)throw new Error(`${file} has unexpected dimensions ${metadata.width}x${metadata.height}`);
      if(file==='four-figure-grid.webm'){
        await video.evaluate(element => { element.currentTime=8.5; });
        await page.waitForTimeout(1800);
        await page.screenshot({path:path.join(previewDir,'four-figure-bottom-left-corner.png')});
      }
      await video.evaluate(element => { element.currentTime=Math.min(12,element.duration*.5); });
      await page.waitForTimeout(2000);
      const preview = path.join(previewDir, file.replace('.webm','.png'));
      await page.screenshot({ path:preview });
      results.push({ file, ...metadata, preview:path.relative(root,preview) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(previewDir,'manifest.json'),`${JSON.stringify(results,null,2)}\n`);
  console.table(results.map(({file,duration,width,height})=>({file,duration:duration.toFixed(1),size:`${width}x${height}`})));
}

verify().catch(error=>{console.error(error);process.exitCode=1});
