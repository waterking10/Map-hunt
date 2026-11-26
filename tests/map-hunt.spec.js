const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

test('submits a guess and shows the expected result', async ({ page }) => {
  const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

  await page.addInitScript(() => {
    const user = {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'fake.student@queenscollege.edu.bb',
      user_metadata: { full_name: 'Test Student' }
    };
    const mockSupabase = { createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user } }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({ data: {}, error: null }),
        signOut: async () => ({ error: null })
      },
      from: () => ({ insert: async () => ({ error: null }) })
    }) };
    Object.defineProperty(window, 'supabase', {
      configurable: true,
      get: () => mockSupabase,
      set() {}
    });
  });
  await page.route('https://**', route => route.abort());
  await page.goto(gameUrl);
  await expect(page.locator('#authStatus')).toContainText('Signed in as');
  await page.getByLabel('Class').fill('Test Class');
  await page.getByRole('button', { name: 'Start Adventure' }).click();
  await page.getByRole('button', { name: 'Begin Expedition' }).click();

  const skillPopup = page.locator('#skillPopup');
  await expect(skillPopup).toBeVisible();
  while (await skillPopup.isVisible()) {
    await page.locator('#nextSkillSlide').click();
  }

  await page.locator('#answerInput').fill('9999');
  await page.getByRole('button', { name: 'Submit Answer' }).click();

  await expect(page.locator('#feedback')).toHaveText(
    'Not quite. Check the map and try again.'
  );
});
