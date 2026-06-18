import { test, expect } from '@playwright/test';

test.describe('Design system tokens', () => {
  test('landing page loads design tokens and typography', async ({ page }) => {
    await page.goto('/');

    // Wait for entry screen
    await expect(page.locator('#entry')).toBeVisible();

    // Verify CSS custom properties are applied on :root
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      return {
        p1Blue: cs.getPropertyValue('--p1-blue').trim(),
        p2Orange: cs.getPropertyValue('--p2-orange').trim(),
        bgApp: cs.getPropertyValue('--bg-app').trim(),
        fontDisplay: cs.getPropertyValue('--font-display').trim(),
        fontBody: cs.getPropertyValue('--font-body').trim(),
        fontMono: cs.getPropertyValue('--font-mono').trim(),
      };
    });

    // P1 blue and P2 orange tokens exist
    expect(rootStyles.p1Blue).toBe('#2E8BFF');
    expect(rootStyles.p2Orange).toBe('#FF7A1A');
    expect(rootStyles.bgApp).toBe('#0A0E1A');

    // Font stacks reference the design system fonts
    expect(rootStyles.fontDisplay).toContain('Bungee');
    expect(rootStyles.fontBody).toContain('Space Grotesk');
    expect(rootStyles.fontMono).toContain('Space Mono');
  });

  test('h1 uses Bungee display font', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#entry')).toBeVisible();

    const h1Font = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? getComputedStyle(h1).fontFamily : '';
    });

    expect(h1Font).toContain('Bungee');
  });

  test('eyebrow elements use Space Mono monospace font', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#entry')).toBeVisible();

    const eyebrowFont = await page.evaluate(() => {
      const eyebrow = document.querySelector('.eyebrow');
      return eyebrow ? getComputedStyle(eyebrow).fontFamily : '';
    });

    expect(eyebrowFont).toContain('Space Mono');
  });

  test('player identity colors are blue/orange, not green/cyan', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#entry')).toBeVisible();

    const colors = await page.evaluate(() => {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      return {
        accentPrimary: cs.getPropertyValue('--accent-primary').trim(),
        accentSecondary: cs.getPropertyValue('--accent-secondary').trim(),
      };
    });

    // Primary accent is blue, not green
    expect(colors.accentPrimary).toBe('#2E8BFF');
    // Secondary accent is orange, not cyan
    expect(colors.accentSecondary).toBe('#FF7A1A');
  });

  test('primary button uses blue gradient', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#entry')).toBeVisible();

    const btnBg = await page.evaluate(() => {
      const btn = document.querySelector('.primary-button');
      return btn ? getComputedStyle(btn).backgroundImage : '';
    });

    // Primary button background should reference the blue primary
    expect(btnBg).toContain('2E8BFF');
  });
});
