const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const outputDir = path.join(root, 'assets', 'tutorials');
const gameUrl = pathToFileURL(path.join(root, 'index.html')).href;
const size = { width: 1280, height: 720 };

const tutorials = [
  { type: 'number', file: 'four-figure-grid.webm', record: recordFourFigure },
  { type: 'six', file: 'six-figure-grid.webm', record: recordSixFigure },
  { type: 'distance', file: 'distance.webm', record: recordDistance },
  { type: 'bearing', file: 'bearings.webm', record: recordBearing },
  { type: 'gradient', file: 'gradient.webm', record: recordGradient }
];

async function wait(page, milliseconds = 900) {
  await page.waitForTimeout(milliseconds);
}

async function freeze(page, text, { target = null, position = 'top-right', duration = 2600 } = {}) {
  await page.evaluate(({ value, selector, placement }) => {
    document.querySelectorAll('.recording-focus').forEach(node => node.classList.remove('recording-focus'));
    const caption = document.querySelector('#recordingCaption');
    caption.textContent = value;
    caption.dataset.position = placement;
    caption.classList.add('show');
    if(selector)document.querySelector(selector)?.classList.add('recording-focus');
  }, { value: text, selector: target, placement: position });
  await wait(page, duration);
}

async function resume(page, milliseconds = 650) {
  await page.evaluate(() => {
    document.querySelector('#recordingCaption').classList.remove('show');
    document.querySelectorAll('.recording-focus').forEach(node => node.classList.remove('recording-focus'));
  });
  await wait(page, milliseconds);
}

async function zoomMap(page, enabled = true) {
  await page.evaluate(value => document.querySelector('#mapCard').classList.toggle('recording-map-zoom', value), enabled);
  await wait(page, 700);
}

async function installRecordingOverlay(page) {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      #recordingCaption{position:fixed;z-index:10000;width:min(38vw,470px);box-sizing:border-box;padding:14px 18px;border:4px solid #fff3bd;border-radius:14px;background:rgba(5,30,42,.96);color:white;font:800 24px/1.25 Arial;text-align:left;box-shadow:0 7px 22px #0009;pointer-events:none;opacity:0;transition:opacity .18s ease}
      #recordingCaption.show{opacity:1}
      #recordingCaption[data-position="top-left"]{left:24px;top:24px}
      #recordingCaption[data-position="top-right"]{right:24px;top:24px}
      #recordingCaption[data-position="bottom-left"]{left:24px;bottom:24px}
      #recordingCaption[data-position="bottom-right"]{right:24px;bottom:24px}
      #recordingCaption[data-position="bottom-centre"]{left:50%;bottom:20px;transform:translateX(-50%);width:min(72vw,820px);text-align:center}
      #recordingCursor{position:fixed;z-index:10001;width:22px;height:22px;border:4px solid white;border-radius:50%;background:#e43b2f99;box-shadow:0 0 0 3px #54291acc;transform:translate(-50%,-50%);pointer-events:none}
      .recording-focus{outline:8px solid #ffd54f!important;outline-offset:6px;filter:drop-shadow(0 0 8px #fff)!important}
      .recording-map-highlight{fill:#ffd54f55;stroke:#d22b24;stroke-width:6;stroke-dasharray:12 7;pointer-events:none}
      #mapCard{transition:inset .55s ease,width .55s ease,height .55s ease,box-shadow .55s ease}
      #mapCard.recording-map-zoom{position:fixed!important;inset:12px 12px 82px!important;width:auto!important;height:auto!important;z-index:9990!important;box-shadow:0 0 0 100vmax rgba(3,20,28,.78)!important}
      #mapCard.recording-map-zoom .map-svg{height:100%!important;min-height:0!important}
      .recording-corner{fill:#e1261c;stroke:white;stroke-width:5;pointer-events:none}
      .recording-line{stroke:#e1261c;stroke-width:9;stroke-linecap:round;pointer-events:none}
    `;
    document.head.appendChild(style);
    const caption = document.createElement('div'); caption.id = 'recordingCaption'; caption.textContent = 'Map Hunt gameplay tutorial'; document.body.appendChild(caption);
    const cursor = document.createElement('div'); cursor.id = 'recordingCursor'; document.body.appendChild(cursor);
    document.addEventListener('mousemove', event => { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; });
  });
}

async function setupQuestion(page, type) {
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate((questionType) => {
    localStorage.clear();
    learningLevel = 'csec';
    startNewExpedition(1);
    const model=drawNewIsland(1);
    activeIslandPoints=model.pts;
    const scored=[...makeAdventureQuestions(1,model),...thirdFormQuestions(1,model)];
    const used=new Set(scored.flatMap(q=>[q.answer,...(q.answers||[])]).filter(value=>value!==undefined).map(value=>String(value)));
    const unused=(values,answerFor)=>values.find(value=>!used.has(String(answerFor(value))));
    let tutorialQuestion;
    if(questionType==='number'||questionType==='six'){
      const candidates=[{x:382,y:364},{x:438,y:382},{x:335,y:347},{x:474,y:352},{x:365,y:408}];
      const point=unused(candidates,p=>questionType==='six'?gridRef6(p):gridRef4(p));
      const four=gridRef4(point),six=gridRef6(point);
      islandLayer.insertAdjacentHTML('beforeend',`<g id="trainingMarker" transform="translate(${point.x} ${point.y})"><path d="M0-15L14 0 0 15-14 0Z" fill="#d72d24" stroke="white" stroke-width="4"/><text x="20" y="6" font-size="18" font-weight="bold" fill="#4d201b">Training marker T</text></g>`);
      tutorialQuestion=questionType==='number'
        ?{level:'Tutorial example — not scored',type:'number',q:'Enter the four-figure grid reference for training marker T.',answer:four,speech:'“Use the square’s bottom-left corner: easting first, then northing.”'}
        :{level:'Tutorial example — not scored',type:'six',q:'Enter the six-figure grid reference for training marker T.',answer:six,selectSquare:four,square:{e:Number(four.slice(0,2)),n:Number(four.slice(2)),x:Number(six[2]),y:Number(six[5]),symbol:'training'},speech:'“Select the square, then estimate tenths east and north.”'};
    }else if(questionType==='distance'){
      const names=Object.keys(model.pts),pairs=[];
      names.forEach((a,i)=>names.slice(i+1).forEach(b=>pairs.push({a:model.pts[a],b:model.pts[b]})));
      const pair=unused(pairs,p=>groundDistanceMetres(p)/1000);
      MEASURED_POINT_PAIRS.distance=pair;setPointMarkers('distancePoints',pair,false);
      tutorialQuestion={level:'Tutorial example — not scored',type:'distance',measurePair:pair,q:'Measure the straight-line distance between training points A and B. At 1:50,000, give kilometres.',answer:groundDistanceMetres(pair)/1000,speech:'“Measure centre to centre, then use the scale.”'};
    }else if(questionType==='bearing'){
      const names=Object.keys(model.pts),pairs=[];
      names.forEach(a=>names.forEach(b=>{if(a!==b)pairs.push([a,b])}));
      const pair=unused(pairs,p=>Math.round(bearingFrom(model.pts[p[0]],model.pts[p[1]])));
      tutorialQuestion={level:'Tutorial example — not scored',type:'bearing',bearingPair:pair,q:`What is the three-figure bearing from the ${displaySymbolName(pair[0])} to the ${displaySymbolName(pair[1])}?`,answer:Math.round(bearingFrom(model.pts[pair[0]],model.pts[pair[1]])),speech:'“Centre on the start and measure clockwise from north.”'};
    }else{
      const pair={a:{...model.pts.tree},b:{...model.pts.well},elevationA:210,elevationB:90};
      pair.answer=groundDistanceMetres(pair)/Math.abs(pair.elevationA-pair.elevationB);
      while(used.has(String(pair.answer))){pair.elevationA+=5;pair.answer=groundDistanceMetres(pair)/Math.abs(pair.elevationA-pair.elevationB)}
      MEASURED_POINT_PAIRS.gradient=pair;setPointMarkers('gradientPoints',pair,true);
      tutorialQuestion={level:'Tutorial example — not scored',type:'gradient',q:`Calculate the gradient from training point A (${pair.elevationA} m) to B (${pair.elevationB} m). Enter 1:n.`,answer:pair.answer,speech:'“Find vertical difference, measure horizontal distance, then divide.”'};
    }
    if(used.has(String(tutorialQuestion.answer)))throw new Error('Tutorial answer duplicates a scored question answer');
    questions.splice(0,questions.length,tutorialQuestion);
    index=0;
    shownSkills = new Set(['fourFigure', 'sixFigure', 'distance', 'gradient', 'bearings']);
    show('game');
    render();
    document.querySelector('#skillPopup').classList.remove('show');
    const diagnostics=document.querySelector('#mapDiagnostics');
    if(diagnostics)diagnostics.style.display='none';
  }, type);
  await installRecordingOverlay(page);
  await page.locator('#mapCard').scrollIntoViewIfNeeded();
  await wait(page, 700);
}

async function questionData(page) {
  return page.evaluate(() => ({
    answer: String(questions[index].answer),
    prompt: questions[index].q,
    square: questions[index].square || null,
    selectSquare: questions[index].selectSquare || null,
    pair: questions[index].measurePair || (questions[index].type === 'gradient' ? MEASURED_POINT_PAIRS.gradient : MEASURED_POINT_PAIRS.distance),
    bearingPair: questions[index].bearingPair || null,
    bearingEnds: questions[index].type === 'bearing' ? bearingEndpoints(questions[index]) : null
  }));
}

async function highlightGridSquare(page, reference) {
  await page.evaluate((ref) => {
    document.querySelectorAll('.recording-map-highlight').forEach(node => node.remove());
    const e = Number(ref.slice(0, 2)), n = Number(ref.slice(-2));
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', 90 + (e - 30) * 80); rect.setAttribute('y', 70 + (29 - n) * 67.5);
    rect.setAttribute('width', 80); rect.setAttribute('height', 67.5); rect.setAttribute('class', 'recording-map-highlight');
    document.querySelector('.map-svg').appendChild(rect);
  }, reference);
}

async function highlightFourFigureParts(page, reference, part) {
  await page.evaluate(({ ref, visiblePart }) => {
    ['recordingLeftLine','recordingBottomLine','recordingCorner'].forEach(id=>document.querySelector(`#${id}`)?.remove());
    const svg=document.querySelector('.map-svg'),e=Number(ref.slice(0,2)),n=Number(ref.slice(2));
    const x=90+(e-30)*80,y=70+(29-n)*67.5,bottom=y+67.5,ns='http://www.w3.org/2000/svg';
    const line=(id,x1,y1,x2,y2)=>{const node=document.createElementNS(ns,'line');node.id=id;node.setAttribute('x1',x1);node.setAttribute('y1',y1);node.setAttribute('x2',x2);node.setAttribute('y2',y2);node.setAttribute('class','recording-line');svg.appendChild(node)};
    if(visiblePart==='corner'||visiblePart==='all'){
      const corner=document.createElementNS(ns,'circle');corner.id='recordingCorner';corner.setAttribute('cx',x);corner.setAttribute('cy',bottom);corner.setAttribute('r',13);corner.setAttribute('class','recording-corner');svg.appendChild(corner);
    }
    if(visiblePart==='easting'||visiblePart==='all')line('recordingLeftLine',x,y,x,bottom);
    if(visiblePart==='northing'||visiblePart==='all')line('recordingBottomLine',x,bottom,x+80,bottom);
  }, { ref: reference, visiblePart: part });
}

async function submitAnswer(page, answer) {
  await zoomMap(page, false);
  await resume(page, 450);
  await page.locator('#answerInput').fill(answer);
  await freeze(page, `Enter ${answer} in Map Hunt’s answer field.`, { target:'#answerInput', position:'top-left', duration:2200 });
  await resume(page, 450);
  await page.locator('#submitBtn').click();
  await freeze(page, 'Correct — the training example is complete.', { target:'#feedback', position:'top-left', duration:2200 });
}

async function recordFourFigure(page) {
  const data = await questionData(page);
  await zoomMap(page);
  await freeze(page, 'Step 1: Find training marker T and the square containing its centre.', { target:'#trainingMarker', position:'top-right' });
  await highlightGridSquare(page, data.answer);
  await freeze(page, 'Step 1 complete: this highlighted square contains the feature.', { position:'top-right' });
  await highlightFourFigureParts(page, data.answer, 'corner');
  await freeze(page, 'Step 2: Find the bottom-left corner of the grid square.', { position:'top-right', duration:3000 });
  await highlightFourFigureParts(page, data.answer, 'easting');
  await freeze(page, `Step 3: Read the easting first — ${data.answer.slice(0,2)}.`, { position:'top-right', duration:2800 });
  await highlightFourFigureParts(page, data.answer, 'northing');
  await freeze(page, `Step 4: Read the northing second — ${data.answer.slice(2)}.`, { position:'top-right', duration:2800 });
  await highlightFourFigureParts(page, data.answer, 'all');
  await freeze(page, `Step 5: Easting first, northing second: ${data.answer.slice(0,2)} + ${data.answer.slice(2)} = ${data.answer}.`, { position:'top-right', duration:3400 });
  await submitAnswer(page, data.answer);
}

async function recordSixFigure(page) {
  const data = await questionData(page);
  await zoomMap(page);
  await highlightGridSquare(page, data.selectSquare);
  await freeze(page, `Step 1: Find marker T inside four-figure square ${data.selectSquare}.`, { target:'#trainingMarker', position:'top-right', duration:2800 });
  await resume(page);
  const hit = page.locator(`.grid-hit[data-square="${data.selectSquare}"]`);
  await hit.click({ position: { x: 38, y: 30 } });
  await freeze(page, 'Step 2: Clicking the square opens Map Hunt’s expanded tenth-grid.', { target:'#zoomSvg', position:'top-right', duration:2600 });
  await freeze(page, `Step 3: Read eastings first — ${data.answer.slice(0,3)} means ${data.answer[2]} tenths across.`, { target:'#zoomSvg', position:'top-right', duration:3200 });
  await freeze(page, `Step 4: Read northings second — ${data.answer.slice(3)} means ${data.answer[5]} tenths up.`, { target:'#zoomSvg', position:'top-right', duration:3200 });
  await page.locator('#closeZoom').click();
  await freeze(page, `Step 5: Combine ${data.answer.slice(0,3)} + ${data.answer.slice(3)} = ${data.answer}.`, { position:'top-right', duration:3000 });
  await submitAnswer(page, data.answer);
}

async function mapPointToScreen(page, point) {
  return page.locator('.map-svg').evaluate((svg, p) => {
    const value = svg.createSVGPoint(); value.x = p.x; value.y = p.y;
    const screen = value.matrixTransform(svg.getScreenCTM());
    return { x: screen.x, y: screen.y };
  }, point);
}

async function positionRuler(page, pair) {
  const a = await mapPointToScreen(page, pair.a);
  const b = await mapPointToScreen(page, pair.b);
  const ruler = await page.locator('#virtualRuler').boundingBox();
  const before=await page.locator('#virtualRuler').getAttribute('transform');
  await page.mouse.move(ruler.x + 18, ruler.y + 18);
  await page.mouse.down();
  await page.mouse.move(a.x + 18, a.y + 18, { steps: 22 });
  await page.mouse.up();
  const angle = Math.round(Math.atan2(pair.b.y - pair.a.y, pair.b.x - pair.a.x) * 180 / Math.PI);
  await page.locator('#rulerAngle').fill(String(angle));
  const after=await page.locator('#virtualRuler').getAttribute('transform');
  if(after===before)throw new Error('Virtual ruler did not move through its drag control');
  return { a, b, angle };
}

async function recordDistance(page) {
  const data = await questionData(page);
  await zoomMap(page);
  await freeze(page, 'Step 1: Identify the two red training points A and B.', { target:'#distancePoints', position:'top-right', duration:2600 });
  await resume(page);
  await positionRuler(page, data.pair);
  await freeze(page, 'Step 2: Drag and rotate the ruler centre to centre from A to B.', { target:'#virtualRuler', position:'top-right', duration:3000 });
  const cm = await page.evaluate(pair => mapDistanceCm(pair), data.pair);
  await freeze(page, `Step 3: Read the map distance: about ${cm.toFixed(1)} cm.`, { target:'#virtualRuler', position:'top-right', duration:2800 });
  await freeze(page, `Step 4: Scale 1:50,000 means 1 cm = 0.5 km. ${cm.toFixed(1)} × 0.5 = ${Number(data.answer).toFixed(2)} km.`, { position:'top-right', duration:3600 });
  await submitAnswer(page, Number(data.answer).toFixed(2));
}

async function recordBearing(page) {
  const data = await questionData(page);
  await zoomMap(page);
  await freeze(page, 'Step 1: Identify the first named feature as START and the second as DESTINATION.', { target:'#bearingGuide', position:'bottom-right', duration:3000 });
  await resume(page);
  const start = await mapPointToScreen(page, data.bearingEnds[0]);
  const protractor = await page.locator('#protractor').boundingBox();
  const before=await page.locator('#protractor').evaluate(node=>`${node.style.left}|${node.style.top}`);
  await page.mouse.move(protractor.x + protractor.width / 2, protractor.y + protractor.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y, { steps: 24 });
  await page.mouse.up();
  const after=await page.locator('#protractor').evaluate(node=>`${node.style.left}|${node.style.top}`);
  if(after===before)throw new Error('Protractor did not move through its drag control');
  await freeze(page, 'Step 2: Centre the protractor on START. Keep 000° pointing north.', { target:'#protractor', position:'bottom-right', duration:3200 });
  await resume(page);
  if(await page.locator('#angleSlider').count())throw new Error('The bearing tutorial must use the red line without a slider');
  const targetAngle=Math.round(Number(data.answer))%360;
  const rayPath=await page.locator('#protractor svg').evaluate((svg,angle)=>{
    const matrix=svg.getScreenCTM(),steps=Math.max(1,Math.ceil(angle/4));
    return Array.from({length:steps+1},(_,i)=>{
      const radians=(angle*i/steps-90)*Math.PI/180;
      const point=new DOMPoint(180+145*Math.cos(radians),180+145*Math.sin(radians)).matrixTransform(matrix);
      return {x:point.x,y:point.y};
    });
  },targetAngle);
  await page.mouse.move(rayPath[0].x,rayPath[0].y);
  await page.mouse.down();
  for(const point of rayPath.slice(1))await page.mouse.move(point.x,point.y,{steps:2});
  await page.mouse.up();
  if(await page.locator('#bearingRay').getAttribute('aria-valuenow')!==String(targetAngle))throw new Error('The red-line drag did not reach the intended bearing');
  const rotatedPosition=await page.locator('#protractor').evaluate(node=>`${node.style.left}|${node.style.top}`);
  if(rotatedPosition!==after)throw new Error('Rotating the red line moved the protractor body');
  await freeze(page, 'Step 3: Drag the red line clockwise until it points toward the destination.', { target:'#protractor', position:'bottom-right', duration:3400 });
  const answer = String(Math.round(Number(data.answer))).padStart(3, '0');
  await freeze(page, `Step 4: The angle is ${answer}°. Write every bearing with three figures.`, { target:'#protractor', position:'bottom-right', duration:3200 });
  await submitAnswer(page, answer);
}

async function recordGradient(page) {
  const data = await questionData(page);
  const vertical = Math.abs(data.pair.elevationA - data.pair.elevationB);
  await zoomMap(page);
  await freeze(page, `Step 1: Read the heights: A = ${data.pair.elevationA} m and B = ${data.pair.elevationB} m.`, { target:'#gradientPoints', position:'top-right', duration:3000 });
  await freeze(page, `Step 2: Vertical difference = ${data.pair.elevationA} − ${data.pair.elevationB} = ${vertical} m.`, { target:'#gradientPoints', position:'top-right', duration:3200 });
  await resume(page);
  await positionRuler(page, data.pair);
  await freeze(page, 'Step 3: Measure horizontal distance A–B with Map Hunt’s ruler.', { target:'#virtualRuler', position:'top-right', duration:3000 });
  const cm = await page.evaluate(pair => mapDistanceCm(pair), data.pair);
  await freeze(page, `Step 4: ${cm.toFixed(1)} cm × 500 = ${(cm*500).toFixed(0)} m horizontal distance.`, { target:'#virtualRuler', position:'top-right', duration:3200 });
  await freeze(page, `Step 5: ${(cm*500).toFixed(0)} ÷ ${vertical} = ${Number(data.answer).toFixed(2)}. Gradient = 1:${Number(data.answer).toFixed(2)}.`, { position:'top-right', duration:3800 });
  await submitAnswer(page, `1:${Number(data.answer).toFixed(2)}`);
}

async function generate() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const selected=process.env.MAP_HUNT_TUTORIAL?tutorials.filter(tutorial=>tutorial.file.includes(process.env.MAP_HUNT_TUTORIAL)):tutorials;
    for (const tutorial of selected) {
      const context = await browser.newContext({ viewport: size, recordVideo: { dir: outputDir, size } });
      const page = await context.newPage();
      await setupQuestion(page, tutorial.type);
      const video = page.video();
      await tutorial.record(page);
      await context.close();
      await video.saveAs(path.join(outputDir, tutorial.file));
      await video.delete();
      console.log(`Generated ${tutorial.file}`);
    }
  } finally {
    await browser.close();
  }
}

generate().catch(error => { console.error(error); process.exitCode = 1; });
