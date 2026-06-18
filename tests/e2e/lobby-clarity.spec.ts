import { test, expect } from '@playwright/test';

/**
 * Lobby clarity / polish — issue #99
 *
 * Verifies the lobby UI presents:
 *  - Emblem / logo area
 *  - Prominent room code with pulse animation
 *  - Player cards with P1/P2 colour coding and ready badges
 *  - "What happens next" guidance copy (next-action area)
 *  - Share / Ready CTAs
 *  - Subtle animation classes (pulse, fade-in)
 *  - Mobile-friendly (no horizontal overflow)
 */

test.describe('Lobby clarity — waiting state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait until socket connects
    await expect(page.locator('#status')).not.toHaveText('Connecting…', { timeout: 10_000 });

    // Enter a player name and create a room
    await page.locator('#playerNameInput').fill('Tester');
    await page.locator('#createRoomButton').click();

    // Lobby should become visible
    await expect(page.locator('#lobby')).toBeVisible({ timeout: 8_000 });
  });

  test('emblem zone renders with title', async ({ page }) => {
    const emblem = page.locator('.lobby-emblem');
    await expect(emblem).toBeVisible();

    // Title text
    await expect(page.locator('.lobby-title')).toHaveText('Snake Arena');
  });

  test('room code is the most prominent element', async ({ page }) => {
    const roomCodeEl = page.locator('#roomCodeDisplay');
    await expect(roomCodeEl).toBeVisible();
    await expect(roomCodeEl).not.toHaveText('----');

    // Room code font-size should be at least 1.8rem (clamp lower bound)
    const fontSize = await roomCodeEl.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(28); // 1.8rem ≈ 28.8px

    // Room code hero section has glow
    const hero = page.locator('.room-code-hero');
    await expect(hero).toBeVisible();
  });

  test('player card for P1 has blue left-border accent', async ({ page }) => {
    const p1Card = page.locator('.player.p1-card');
    await expect(p1Card).toBeVisible();

    // Check border-left includes P1 blue (#2E8BFF → rgb(46, 139, 255))
    const borderLeft = await p1Card.evaluate((el) =>
      getComputedStyle(el).borderLeftColor,
    );
    // border-left-color should be the P1 blue
    expect(borderLeft).toContain('46, 139, 255');
  });

  test('player card shows ready badge', async ({ page }) => {
    const badge = page.locator('.player-ready-badge');
    await expect(badge.first()).toBeVisible();

    // New player is not ready yet
    await expect(badge.first()).toHaveClass(/not-ready/);
  });

  test('guidance copy: "Share" when waiting for opponent', async ({ page }) => {
    const nextAction = page.locator('#nextActionArea');
    await expect(nextAction).toBeVisible();

    const guidanceText = page.locator('#nextActionText');
    await expect(guidanceText).toContainText('Share');
  });

  test('Share code button is visible', async ({ page }) => {
    const shareBtn = page.locator('#copyRoomCodeButton');
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toContainText('Share');
  });

  test('Ready button present and enabled', async ({ page }) => {
    const readyBtn = page.locator('#readyButton');
    await expect(readyBtn).toBeVisible();
    await expect(readyBtn).toBeEnabled();
    await expect(readyBtn).toHaveText('Ready up');
  });

  test('player cards have fade-in animation', async ({ page }) => {
    // Check that animation CSS is applied (cardFadeIn keyframes)
    const p1Card = page.locator('.player.p1-card');
    const animation = await p1Card.evaluate((el) =>
      getComputedStyle(el).animationName,
    );
    expect(animation).toContain('cardFadeIn');
  });

  test('room code has pulse animation', async ({ page }) => {
    const roomCodeEl = page.locator('#roomCodeDisplay');
    const animation = await roomCodeEl.evaluate((el) =>
      getComputedStyle(el).animationName,
    );
    expect(animation).toContain('roomCodePulse');
  });

  test('lobby is responsive — no horizontal overflow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);

    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance
  });
});

test.describe('Lobby clarity — both players present', () => {
  test('guidance changes when both players are in the room', async ({ browser }) => {
    // Player 1 creates a room
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.goto('/');
    await expect(page1.locator('#status')).not.toHaveText('Connecting…', { timeout: 10_000 });
    await page1.locator('#playerNameInput').fill('Alice');
    await page1.locator('#createRoomButton').click();
    await expect(page1.locator('#lobby')).toBeVisible({ timeout: 8_000 });
    const code = (await page1.locator('#roomCodeDisplay').textContent()) ?? '';

    // Player 2 joins the same room
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto('/');
    await expect(page2.locator('#status')).not.toHaveText('Connecting…', { timeout: 10_000 });
    await page2.locator('#playerNameInput').fill('Bob');
    await page2.locator('#roomCodeInput').fill(code);
    await page2.locator('#joinRoomButton').click();
    await expect(page2.locator('#lobby')).toBeVisible({ timeout: 8_000 });

    // Player 1 should now see guidance about both players being present
    await page1.waitForTimeout(500);
    const guidanceP1 = await page1.locator('#nextActionText').textContent() ?? '';
    expect(guidanceP1).toMatch(/Ready|both/i);

    // Both should see 2 player cards
    const cardsP1 = await page1.locator('.player').count();
    expect(cardsP1).toBe(2);

    const cardsP2 = await page2.locator('.player').count();
    expect(cardsP2).toBe(2);

    // P2 card should have orange accent
    const p2Card = page1.locator('.player.p2-card');
    await expect(p2Card).toBeVisible();
    const borderLeft = await p2Card.evaluate((el) =>
      getComputedStyle(el).borderLeftColor,
    );
    expect(borderLeft).toContain('255, 122, 26');

    await ctx1.close();
    await ctx2.close();
  });
});
