const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');
const { MAP_NAMES, SHEETS, expectedAnswer } = require('./fixtures/map-hunt-cases');

const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

async function installSupabaseMock(page, { signedIn = true, insertError = null } = {}) {
  await page.addInitScript(({ hasSession, errorMessage }) => {
    const user = hasSession ? {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'fake.student@queenscollege.edu.bb',
      user_metadata: { full_name: 'Fake Student' }
    } : null;
    window.__supabaseInserts = [];
    window.supabase = {
      createClient: () => ({
        auth: {
          getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signInWithOAuth: async () => ({ data: {}, error: null }),
          signOut: async () => ({ error: null })
        },
        from: () => ({
          insert: async (payload) => {
            window.__supabaseInserts.push(payload);
            return { error: errorMessage ? { message: errorMessage } : null };
          }
        })
      })
    };
  }, { hasSession: signedIn, errorMessage: insertError });
}

async function dismissSkillPopup(page) {
  await page.waitForTimeout(100);
  const popup = page.locator('#skillPopup');
  while (await popup.isVisible()) {
    await page.locator('#nextSkillSlide').click();
  }
}

async function startPlaythrough(page, { level, mapId, sheetId }) {
  await installSupabaseMock(page);
  await page.route('https://**', (route) => {
    if (route.request().url().includes('/rest/v1/game_sessions')) {
      return route.fulfill({
        status: route.request().method() === 'OPTIONS' ? 204 : 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      });
    }
    return route.abort();
  });
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#authStatus')).toHaveText('Signed in as fake.student@queenscollege.edu.bb');
  await page.evaluate(
    ({ selectedMap, selectedSheet }) => {
      localStorage.clear();
      const randomValues = [(selectedMap + 0.01) / 6, (selectedSheet + 0.01) / 4];
      let randomIndex = 0;
      Math.random = () => randomValues[randomIndex++] ?? 0.5;
    },
    { selectedMap: mapId, selectedSheet: sheetId }
  );

  await page.getByLabel('Class').fill('Test Class');
  if (level === 'csec') {
    await page.getByLabel(/CSEC/).check();
  }
  await page.getByRole('button', { name: 'Start Adventure' }).click();
  await page.getByRole('button', { name: 'Begin Expedition' }).click();
  await expect(page.locator('#adventureName')).toHaveText(`Adventure: ${MAP_NAMES[mapId]}`);
  await dismissSkillPopup(page);
}

async function showFakeStudentResult(page) {
  const externalRequests = [];
  await installSupabaseMock(page);
  page.on('request', (request) => externalRequests.push(request.url()));
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    challenge = {
      name: 'Fake Student',
      className: 'Test Class',
      level: 'third',
      runs: [{
        attemptId: '22222222-2222-4222-8222-222222222222',
        level: 'third', mapId: 0, mapName: 'Treasure Island', correct: 10,
        total: 12, accuracy: 83.333, treasure: true, finishedAt: '2026-11-14T12:00:00.000Z'
      }]
    };
    learningLevel = 'third';
    activeAdventure = 0;
    correct = 10;
    xp = 800;
    gold = 800;
    document.querySelector('#finalScore').textContent = '10/12';
    document.querySelector('#accuracy').textContent = '83%';
    document.querySelector('#finalXp').textContent = '800';
    document.querySelector('#finalGold').textContent = '800';
    show('results');
    showChallengeResults();
    saveMapHuntSession();
  });
  return externalRequests;
}

test('signed-in result is linked to the account and marked unverified', async ({ page }) => {
  const externalRequests = await showFakeStudentResult(page);

  await expect(page.locator('#results')).toHaveClass(/active/);
  await expect(page.locator('#finalScore')).toHaveText('10/12');
  await expect(page.locator('#saveStatus')).toContainText('not yet verified for formal grading');
  const inserts = await page.evaluate(() => window.__supabaseInserts);
  expect(inserts).toHaveLength(1);
  expect(inserts[0]).toMatchObject({
    user_id: '11111111-1111-4111-8111-111111111111',
    student_email: 'fake.student@queenscollege.edu.bb',
    score: 10,
    total_questions: 12,
    score_verification: 'unverified_client'
  });
  expect(externalRequests.some((url) => url.includes('/rest/v1/game_sessions'))).toBe(false);
  expect(externalRequests.some((url) => url.includes('google.com/forms'))).toBe(false);
});

test('recorded-results notice remains usable at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const externalRequests = await showFakeStudentResult(page);

  await expect(page.locator('#results')).toHaveClass(/active/);
  await expect(page.locator('#saveStatus')).toBeVisible();
  await expect(page.locator('#saveStatus')).toContainText('not yet verified for formal grading');
  await expect(page.locator('#problemReportLink')).toBeVisible();
  expect(externalRequests.some((url) => url.includes('/rest/v1/game_sessions'))).toBe(false);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('signed-out visitor cannot start a scored attempt', async ({ page }) => {
  await installSupabaseMock(page, { signedIn: false });
  await page.route('https://**', route => route.abort());
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Class').fill('Test Class');
  await page.getByRole('button', { name: 'Start Adventure' }).click();
  await expect(page.locator('#identityError')).toHaveText('Sign in with your school Google account before starting.');
  await expect(page.locator('#landing')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.__supabaseInserts)).toEqual([]);
});

async function chooseAnswer(page, answer) {
  const choices = page.locator('.choice');
  if ((await choices.count()) > 0) {
    await page.getByRole('button', { name: answer, exact: true }).click();
  } else {
    await page.locator('#answerInput').fill(answer);
  }
}

async function chooseIncorrectAnswer(page, correctAnswer) {
  const choices = page.locator('.choice');
  if ((await choices.count()) > 0) {
    const count = await choices.count();
    for (let index = 0; index < count; index += 1) {
      const choice = choices.nth(index);
      if ((await choice.textContent()) !== correctAnswer) {
        await choice.click();
        return;
      }
    }
    throw new Error('No incorrect multiple-choice answer was available');
  }

  const input = page.locator('#answerInput');
  const tagName = await input.evaluate((element) => element.tagName);
  await input.fill(tagName === 'TEXTAREA' ? 'The map is interesting.' : '999999');
}

async function completeEveryQuestion(page, scenario) {
  const expectedCount = scenario.level === 'third' ? 12 : 11;
  await expect(page.locator('#questionJump button')).toHaveCount(expectedCount);

  const testedPrompts = [];
  for (let questionIndex = 0; questionIndex < expectedCount; questionIndex += 1) {
    await dismissSkillPopup(page);
    const prompt = await page.locator('#question').textContent();
    const answer = expectedAnswer({
      prompt,
      mapId: scenario.mapId,
      sheetId: scenario.sheetId
    });
    testedPrompts.push(prompt);

    if (prompt.startsWith('Study the original') || prompt.includes('river valley') || prompt.startsWith('Using map evidence') || prompt.startsWith('Using evidence from the map')) {
      await expect(page.locator('#topoLabel')).toContainText(SHEETS[scenario.sheetId].name);
      await expect(page.locator('#topoMapWrap')).toHaveClass(/show/);
      await expect(page.locator('#topoImage')).toHaveJSProperty('complete', true);
      await expect
        .poll(() => page.locator('#topoImage').evaluate((image) => image.naturalWidth))
        .toBeGreaterThan(0);
    }

    const scoreBefore = questionIndex * 80;
    await expect(page.locator('#xp')).toHaveText(String(scoreBefore));
    await expect(page.locator('#gold')).toHaveText(String(scoreBefore));

    await chooseIncorrectAnswer(page, answer);
    await page.getByRole('button', { name: 'Submit Answer' }).click();
    await expect(page.locator('#feedback')).toHaveClass(/bad/);
    await expect(page.locator('#xp')).toHaveText(String(scoreBefore));
    await expect(page.locator('#gold')).toHaveText(String(scoreBefore));

    await chooseAnswer(page, answer);
    await page.getByRole('button', { name: 'Submit Answer' }).click();
    await expect(page.locator('#feedback')).toHaveClass(/good/);
    await expect(page.locator('#xp')).toHaveText(String(scoreBefore + 80));
    await expect(page.locator('#gold')).toHaveText(String(scoreBefore + 80));

    await page.locator('#nextQuestion').click();
  }

  await expect(page.locator('#results')).toHaveClass(/active/);
  await expect(page.locator('#finalScore')).toHaveText(`${expectedCount}/${expectedCount}`);
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#finalXp')).toHaveText(String(expectedCount * 80));
  await expect(page.locator('#finalGold')).toHaveText(String(expectedCount * 80));
  return testedPrompts;
}

for (const [mapId, mapName] of MAP_NAMES.entries()) {
  test(`Third Form completes every question on ${mapName}`, async ({ page }) => {
    test.setTimeout(120_000);
    const scenario = { level: 'third', mapId, sheetId: 0 };
    await startPlaythrough(page, scenario);
    const prompts = await completeEveryQuestion(page, scenario);
    console.log(`[coverage] Third Form | ${mapName} | ${prompts.length}/12 questions`);
  });
}

for (const [mapId, mapName] of MAP_NAMES.entries()) {
  const sheetId = mapId % SHEETS.length;
  test(`CSEC completes every question on ${mapName} with ${SHEETS[sheetId].name}`, async ({ page }) => {
    test.setTimeout(120_000);
    const scenario = { level: 'csec', mapId, sheetId };
    await startPlaythrough(page, scenario);
    const prompts = await completeEveryQuestion(page, scenario);
    console.log(
      `[coverage] CSEC | ${mapName} | ${SHEETS[sheetId].name} | ${prompts.length}/11 questions`
    );
  });
}

test('Three-island challenge records three different completed maps', async ({ page }) => {
  test.setTimeout(180_000);
  await startPlaythrough(page, { level: 'third', mapId: 0, sheetId: 0 });
  const completedMaps = new Set();

  for (let run = 0; run < 3; run += 1) {
    const adventureLabel = await page.locator('#adventureName').textContent();
    const mapName = adventureLabel.replace('Adventure: ', '');
    const mapId = MAP_NAMES.indexOf(mapName);
    expect(mapId).toBeGreaterThanOrEqual(0);
    expect(completedMaps.has(mapName)).toBe(false);
    completedMaps.add(mapName);

    await completeEveryQuestion(page, { level: 'third', mapId, sheetId: 0 });
    await expect(page.locator('#challengeSummary')).toContainText(
      `Three-Island Challenge — ${run + 1}/3 maps completed`
    );

    if (run < 2) {
      await page.getByRole('button', { name: 'Choose New Map' }).click();
      await page.getByRole('button', { name: 'Begin Expedition' }).click();
      await dismissSkillPopup(page);
    }
  }

  await expect(page.locator('#challengeSummary')).toContainText('Bonus marks: 3/3');
  await expect(page.locator('#replayBtn')).toBeHidden();
  console.log(`[coverage] Three-Island Challenge | ${completedMaps.size}/3 distinct maps`);
});
