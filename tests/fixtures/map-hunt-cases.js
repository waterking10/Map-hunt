const MAP_NAMES = [
  'Isla del Tesoro',
  'Volcanic Island',
  'Twin Bay Island',
  'Crescent Island',
  'Highland Island',
  'Mangrove Island'
];

const SHEETS = [
  {
    name: 'Basseterre, St Kitts',
    choice: null,
    openAnswer:
      'First, the map shows a sheltered coastal port suitable for trade. Second, relatively flat lowland provides space for buildings and expansion. Third, visible roads connect the city to surrounding estates and provide transport access.'
  },
  {
    name: 'Dominica — Marigot',
    choice: 'Steep mountainous relief near the coast',
    openAnswer:
      'First, the map shows closely spaced contours that identify steep relief. Second, visible streams occupy valleys and flow toward the coast. Third, the contour valleys shape the drainage routes across the mountainous land.'
  },
  {
    name: 'Savanna-la-Mar',
    choice: 'Coastal lowlands and wetlands',
    openAnswer:
      'First, the map shows flat coastal lowland that supports settlement and buildings. Second, visible wetlands and drainage restrict some land uses. Third, roads follow accessible land and connect the settlement with agricultural areas.'
  },
  {
    name: 'Speightstown',
    choice: 'A coastal settlement with roads extending inland',
    openAnswer:
      'First, the map shows a coastal site that supports trade and fishing. Second, visible roads extend inland and improve transport access. Third, gentle relief provides suitable land for buildings and a linear settlement pattern.'
  }
];

const ORIGINAL_POINTS = {
  lighthouse: { x: 145, y: 190 },
  camp: { x: 604, y: 448 },
  skull: { x: 666, y: 211 },
  cave: { x: 373, y: 250 },
  tree: { x: 522, y: 364 },
  well: { x: 282, y: 465 },
  treasureSpot: { x: 458, y: 326 }
};

const SYMBOL_NAMES = {
  lighthouse: 'Lighthouse',
  camp: 'Pirate Camp',
  skull: 'Skull',
  cave: 'Cave',
  tree: 'Tree',
  well: 'Well',
  treasureSpot: 'Treasure X'
};

function generatedMap(mapId) {
  const cx = [0, 406, 414, 405, 405, 400][mapId];
  const cy = [0, 332, 334, 340, 336, 336][mapId];
  const points = {
    lighthouse: { x: cx - 172, y: cy - 103 },
    cave: { x: cx - 94, y: cy + 54 },
    camp: { x: cx + 151, y: cy + 81 },
    skull: { x: cx + 138, y: cy - 82 },
    treasureSpot: { x: cx + 62, y: cy + 122 },
    tree: { x: cx + 58, y: cy - 98 },
    well: { x: cx - 140, y: cy + 105 }
  };

  const distanceSymbols = {
    1: ['lighthouse', 'cave'],
    2: ['well', 'skull'],
    3: ['cave', 'tree'],
    4: ['lighthouse', 'camp'],
    5: ['well', 'tree']
  }[mapId];

  const hills = {
    1: { x: 342, y: 294, rx: 154, ry: 117, interval: 25, base: 50, count: 8 },
    2: { x: 366, y: 297, rx: 163, ry: 104, interval: 20, base: 40, count: 8 },
    3: { x: 456, y: 311, rx: 148, ry: 126, interval: 25, base: 25, count: 8 },
    4: { x: 366, y: 294, rx: 165, ry: 135, interval: 30, base: 60, count: 9 },
    5: { x: 452, y: 320, rx: 149, ry: 104, interval: 20, base: 20, count: 8 }
  }[mapId];
  const theta = [0, 0.25, -0.55, 0.48, -0.34, 0.6][mapId];
  const angle = [0, 0.55, 2.05, -0.75, 1.05, 2.45][mapId];
  const ellipsePoint = (fraction) => ({
    x:
      hills.x +
      hills.rx * fraction * Math.cos(angle) * Math.cos(theta) -
      hills.ry * fraction * Math.sin(angle) * Math.sin(theta),
    y:
      hills.y +
      hills.rx * fraction * Math.cos(angle) * Math.sin(theta) +
      hills.ry * fraction * Math.sin(angle) * Math.cos(theta)
  });
  const outerFraction = 1.02 - 0.88 / (hills.count - 1);
  const innerFraction = 1.02 - ((hills.count - 2) * 0.88) / (hills.count - 1);

  return {
    points,
    csecDistance: {
      a: points[distanceSymbols[0]],
      b: points[distanceSymbols[1]]
    },
    gradient: {
      a: ellipsePoint(innerFraction),
      b: ellipsePoint(outerFraction),
      elevationA: hills.base + hills.interval * (hills.count - 2),
      elevationB: hills.base + hills.interval
    }
  };
}

function mapFixture(mapId) {
  if (mapId !== 0) return generatedMap(mapId);
  return {
    points: ORIGINAL_POINTS,
    csecDistance: { a: { x: 260, y: 405 }, b: { x: 500, y: 405 } },
    gradient: {
      a: { x: 230, y: 198 },
      b: { x: 148, y: 171 },
      elevationA: 175,
      elevationB: 100
    }
  };
}

function symbolKey(label) {
  const value = label.toLowerCase();
  if (value.includes('pirate camp') || value === 'camp') return 'camp';
  if (value.includes('treasure')) return 'treasureSpot';
  return Object.keys(SYMBOL_NAMES).find((key) =>
    value.includes(SYMBOL_NAMES[key].toLowerCase())
  );
}

function fourFigure(point) {
  const easting = Math.max(30, Math.min(37, Math.floor((point.x - 90) / 80) + 30));
  const northing = Math.max(22, Math.min(29, Math.floor((610 - point.y) / 67.5) + 22));
  return `${easting}${northing}`;
}

function sixFigure(point) {
  const easting = Math.max(30, Math.min(37, Math.floor((point.x - 90) / 80) + 30));
  const northing = Math.max(22, Math.min(29, Math.floor((610 - point.y) / 67.5) + 22));
  const eastingTenth = Math.max(
    0,
    Math.min(9, Math.floor((((point.x - 90) / 80) - (easting - 30)) * 10))
  );
  const northingTenth = Math.max(
    0,
    Math.min(9, Math.floor((((610 - point.y) / 67.5) - (northing - 22)) * 10))
  );
  return `${easting}${eastingTenth}${northing}${northingTenth}`;
}

function bearing(a, b) {
  return (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI + 360;
}

function roundedBearing(a, b) {
  return String(Math.round(bearing(a, b) % 360));
}

function direction(a, b) {
  const directions = [
    'North',
    'North-east',
    'East',
    'South-east',
    'South',
    'South-west',
    'West',
    'North-west'
  ];
  return directions[Math.round((bearing(a, b) % 360) / 45) % 8];
}

function distanceKm(pair) {
  return Math.hypot(pair.a.x - pair.b.x, pair.a.y - pair.b.y) / 160;
}

function gradientAnswer(pair) {
  const horizontalMetres = distanceKm(pair) * 1000;
  const verticalMetres = Math.abs(pair.elevationA - pair.elevationB);
  return `1:${(horizontalMetres / verticalMetres).toFixed(4)}`;
}

function expectedAnswer({ prompt, mapId, sheetId }) {
  const fixture = mapFixture(mapId);
  const sheet = SHEETS[sheetId];
  let match;

  if (prompt.includes('river valley')) return '1914';
  if (prompt.startsWith('Using evidence from the map')) return sheet.openAnswer;
  if (prompt.startsWith('Using map evidence')) return sheet.openAnswer;
  if (prompt.startsWith('Study the original')) return sheet.choice;
  if (prompt === 'From the Lighthouse, in which direction is the Skull symbol?') {
    return 'South-east';
  }

  match = prompt.match(/four-figure grid reference (?:for|of) the (.+?)\./i);
  if (match) return fourFigure(fixture.points[symbolKey(match[1])]);

  match = prompt.match(/six-figure grid reference (?:for|of) the (.+?)\./i);
  if (match) return sixFigure(fixture.points[symbolKey(match[1])]);

  match = prompt.match(/In which compass direction is the (.+?) from the (.+?)\?/i);
  if (match) {
    return direction(
      fixture.points[symbolKey(match[2])],
      fixture.points[symbolKey(match[1])]
    );
  }

  match = prompt.match(/From the (.+?), in which direction is the (.+?)\?/i);
  if (match) {
    return direction(
      fixture.points[symbolKey(match[1])],
      fixture.points[symbolKey(match[2])]
    );
  }

  match = prompt.match(/bearing from the (.+?) to the (.+?)\?/i);
  if (match) {
    return roundedBearing(
      fixture.points[symbolKey(match[1])],
      fixture.points[symbolKey(match[2])]
    );
  }

  match = prompt.match(/distance from the (.+?) to the (.+?)\./i);
  if (match) {
    return distanceKm({
      a: fixture.points[symbolKey(match[1])],
      b: fixture.points[symbolKey(match[2])]
    }).toFixed(4);
  }

  if (prompt.includes('distance between A and B')) {
    return distanceKm(fixture.csecDistance).toFixed(4);
  }

  if (prompt.toLowerCase().includes('calculate the gradient')) {
    return gradientAnswer(fixture.gradient);
  }

  throw new Error(`No independent expected answer for: ${prompt}`);
}

module.exports = {
  MAP_NAMES,
  SHEETS,
  expectedAnswer
};
