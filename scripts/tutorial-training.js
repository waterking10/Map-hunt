/** Runs inside the real game page; keeps all teaching data separate from scored runs. */
function installTrainingExample(type) {
  const originalPairs = JSON.parse(JSON.stringify(MEASURED_POINT_PAIRS));
  const catalog = [];
  const scoredPoints = [];
  const add = (q, mapId, level, model) => {
    const pair = q.measurePair || (q.type === 'distance' ? (model?.distance || originalPairs.distance) : q.type === 'gradient' ? (model?.gradient || originalPairs.gradient) : null);
    let ends = q.type === 'bearing' ? bearingEndpoints(q) : pair ? [pair.a, pair.b] : null;
    if (ends) scoredPoints.push(...ends);
    catalog.push({ mapId, level, type: q.type, prompt: q.q, answer: q.answer, answers: q.answers || [], verticalInterval: q.type === 'gradient' ? Math.abs(pair.elevationA - pair.elevationB) : null, points: ends });
  };
  for (let mapId = 0; mapId < MAP_NAMES.length; mapId++) {
    const model = drawNewIsland(mapId);
    activeAdventure = mapId;
    activeIslandPoints = model?.pts || null;
    makeAdventureQuestions(mapId, model).forEach(q => add(q, mapId, 'csec', model));
    thirdFormQuestions(mapId, model).forEach(q => add(q, mapId, 'third', model));
  }
  SURVEY_SHEETS.forEach((sheet, mapId) => topoQuestions(sheet).forEach(q => add(q, mapId, 'topographic', null)));
  localStorage.clear();
  learningLevel = 'csec';
  startNewExpedition(1);
  const model = drawNewIsland(1);
  activeIslandPoints = model.pts;
  const point = type === 'number' ? { x: 218, y: 558 } : { x: 290.4, y: 515.1 };
  const distance = { a: { x: 180, y: 460 }, b: { x: 596, y: 460 } };
  const gradient = { a: { x: 250, y: 320 }, b: { x: 410, y: 320 }, elevationA: 180, elevationB: 140 };
  const bearing = { a: { x: 310, y: 350 }, b: { x: 400, y: 350 + 90 * Math.sqrt(3) } };
  const four = gridRef4(point), six = gridRef6(point);
  const base = { level: 'Practice example — not scored', speech: '“Practise the method using these training markers.”' };
  let q;
  if (type === 'number') q = { ...base, type, q: 'Give the four-figure grid reference for training marker T.', answer: four };
  else if (type === 'six') q = { ...base, type, q: 'Give the six-figure grid reference for training marker T.', answer: six, selectSquare: four, square: { e: Number(four.slice(0, 2)), n: Number(four.slice(2)), x: Number(six[2]), y: Number(six[5]), symbol: 'training' } };
  else if (type === 'distance') q = { ...base, type, q: 'Measure training A to training B. At 1:50,000, give kilometres.', measurePair: distance, answer: groundDistanceMetres(distance) / 1000 };
  else if (type === 'bearing') q = { ...base, type, q: 'Measure the three-figure bearing from training A to training B.', bearingPair: ['trainingA', 'trainingB'], answer: Math.round(bearingFrom(bearing.a, bearing.b)) };
  else if (type === 'gradient') q = { ...base, type, q: 'Calculate the gradient from training A (180 m) to training B (140 m). Enter 1:n.', answer: groundDistanceMetres(gradient) / 40 };
  else throw new Error(`Unknown tutorial type: ${type}`);
  const answerText = type === 'distance' ? Number(q.answer).toFixed(2) : type === 'gradient' ? `1:${q.answer}` : String(q.answer);
  const collision = catalog.find(scored => {
    if (scored.prompt === q.q) return true;
    if (scored.type === 'number' || scored.type === 'topo-grid') {
      if ([scored.answer, ...scored.answers].some(value => String(value) === answerText)) return true;
    }
    if (scored.type !== type) return false;
    if (type === 'six') return sixValid(answerText, String(scored.answer));
    if (type === 'distance') return Math.abs(Number(answerText) - Number(scored.answer)) <= MAP_MEASUREMENT.toleranceMapCm * MAP_MEASUREMENT.groundMetresPerCm / 1000 + 1e-7;
    if (type === 'gradient') return Math.abs(Number(q.answer) - Number(scored.answer)) <= MAP_MEASUREMENT.toleranceMapCm * MAP_MEASUREMENT.groundMetresPerCm / scored.verticalInterval + 1e-7;
    if (type === 'bearing') { const delta = Math.abs(Number(q.answer) - Number(scored.answer)); return Math.min(delta, 360 - delta) <= 5; }
    return String(scored.answer) === answerText;
  });
  if (collision) throw new Error(`Tutorial answer overlaps scored question: ${collision.prompt}`);
  const tutorialPoints = type === 'number' || type === 'six' ? [point] : Object.values(type === 'distance' ? distance : type === 'bearing' ? bearing : { a: gradient.a, b: gradient.b });
  if (tutorialPoints.some(p => scoredPoints.some(s => Math.hypot(p.x - s.x, p.y - s.y) < 0.01))) throw new Error('Training marker duplicates a scored marker');
  const mark = (p, label, elevation) => `<circle cx="${p.x}" cy="${p.y}" r="7" fill="#c52a24" stroke="#fff" stroke-width="2"/><text x="${p.x + 12}" y="${p.y - 12}" font-family="Arial" font-size="24" font-weight="bold" fill="#4d201b" paint-order="stroke" stroke="#fff6da" stroke-width="3">${label}${elevation ? `: ${elevation} m` : ''}</text>`;
  // A practice-only island has no scored feature symbols or scored marker locations.
  islandLayer.innerHTML = '<path d="M115 145 Q380 95 690 155 L700 570 Q430 615 125 580Z" fill="#e5d8a2" stroke="#765632" stroke-width="4"/>';
  if (type === 'gradient') {
    islandLayer.innerHTML += [180, 170, 160, 150, 140].map((e, i) => `<path d="M${250 + i * 40} 210 Q${235 + i * 40} 265 ${250 + i * 40} 320 T${250 + i * 40} 455" fill="none" stroke="#926636" stroke-width="2"/><text x="${250 + i * 40}" y="225" font-size="15" fill="#65441f">${e}</text>`).join('');
  }
  if (type === 'number' || type === 'six') islandLayer.innerHTML += `<g id="trainingMarker" transform="translate(${point.x} ${point.y})"><path d="M0-12L12 0 0 12-12 0Z" fill="#d72d24" stroke="white" stroke-width="3"/><text x="17" y="-12" font-family="Arial" font-size="23" font-weight="bold" fill="#4d201b">T</text></g>`;
  if (type === 'bearing') {
    activeIslandPoints = { ...activeIslandPoints, trainingA: bearing.a, trainingB: bearing.b };
    islandLayer.innerHTML += `<g id="trainingBearingPoints">${mark(bearing.a, 'Training A')}${mark(bearing.b, 'Training B')}</g>`;
  }
  MEASURED_POINT_PAIRS.distance = distance;
  MEASURED_POINT_PAIRS.gradient = gradient;
  setPointMarkers('distancePoints', distance, false);
  setPointMarkers('gradientPoints', gradient, true);
  questions.splice(0, questions.length, q);
  index = 0;
  shownSkills = new Set(['fourFigure', 'sixFigure', 'distance', 'gradient', 'bearings']);
  show('game'); render();
  document.querySelector('#skillPopup').classList.remove('show');
  // This recording fixture is unscored. Keep real validation/feedback visible instead
  // of letting its normal expedition timer navigate to a results screen mid-caption.
  next = () => {};
  document.querySelector('#adventureName').textContent = 'Practice map — not a scored island';
  const diagnostics = document.querySelector('#mapDiagnostics');
  if (diagnostics) diagnostics.style.display = 'none';
  const report = { type, answer: answerText, prompt: q.q, point: type === 'number' || type === 'six' ? point : null, pair: type === 'distance' ? distance : type === 'gradient' ? gradient : type === 'bearing' ? bearing : null, four, six, catalogCount: catalog.length, islandsChecked: MAP_NAMES.length, levelsChecked: ['third', 'csec'], scoredCatalog: catalog, trainingPoints: tutorialPoints, scoredPoints, collisions: [] };
  window.__tutorialTraining = report;
  return report;
}

module.exports = { installTrainingExample };
