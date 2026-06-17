import { test, expect } from '@playwright/test';

test('app loads and shows entry screen', async ({ page }) => {
  await page.goto('/');

  // Page title
  await expect(page).toHaveTitle('Multiplayer Snake');

  // Entry screen is visible with key UI
  await expect(page.locator('#entry')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Multiplayer Snake' })).toBeVisible();

  // Player name input and room controls are present
  await expect(page.locator('#playerNameInput')).toBeVisible();
  await expect(page.locator('#createRoomButton')).toBeVisible();
  await expect(page.locator('#joinRoomButton')).toBeVisible();
  await expect(page.locator('#roomCodeInput')).toBeVisible();
});

test('socket.io connects and status updates', async ({ page }) => {
  await page.goto('/');

  // The #status element should transition from "Connecting…" to something else
  await expect(page.locator('#status')).not.toHaveText('Connecting…', { timeout: 10_000 });
});
