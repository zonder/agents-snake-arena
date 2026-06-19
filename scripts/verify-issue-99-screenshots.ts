// Verifier visual screenshot capture for issue #99 lobby clarity
// Captures desktop and mobile lobby screens with both player counts.

import { chromium } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';
const OUT_DIR = process.argv[2] || '/opt/data/.worktrees/t_6cd18933/verify-evidence';

interface Metric { name: string; value: number | string; pass: boolean; }

async function captureLobby(opts: {
  viewport: { width: number; height: number };
  label: string;
  bringSecondPlayer?: boolean;
}) {
  const browser = await chromium.launch({ headless: true });
  const ctx1 = await browser.newContext({ viewport: opts.viewport });
  const page1 = await ctx1.newPage();
  await page1.goto(BASE);
  await page1.locator('#status').waitFor({ state: 'visible' });
  await page1.locator('#playerNameInput').fill('Alice');
  await page1.locator('#createRoomButton').click();
  await page1.locator('#lobby').waitFor({ state: 'visible' });
  const code = (await page1.locator('#roomCodeDisplay').textContent()) ?? '';

  if (opts.bringSecondPlayer) {
    const ctx2 = await browser.newContext({ viewport: opts.viewport });
    const page2 = await ctx2.newPage();
    await page2.goto(BASE);
    await page2.locator('#status').waitFor({ state: 'visible' });
    await page2.locator('#playerNameInput').fill('Bob');
    await page2.locator('#roomCodeInput').fill(code);
    await page2.locator('#joinRoomButton').click();
    await page2.locator('#lobby').waitFor({ state: 'visible' });
    await page1.waitForTimeout(600);
  }

  // Full-page screenshot of the lobby
  const screenshotPath = path.join(OUT_DIR, `${opts.label}.png`);
  await page1.screenshot({ path: screenshotPath, fullPage: true });

  // Metrics
  const metrics: Metric[] = [];

  // Logo/emblem area exists
  const emblemVisible = await page1.locator('.lobby-emblem').isVisible();
  metrics.push({ name: 'emblem_visible', value: emblemVisible, pass: emblemVisible });

  const svgVisible = await page1.locator('.emblem-svg').isVisible();
  metrics.push({ name: 'emblem_svg_visible', value: svgVisible, pass: svgVisible });

  const titleText = await page1.locator('.lobby-title').textContent();
  metrics.push({ name: 'lobby_title_text', value: titleText ?? '', pass: (titleText ?? '').trim() === 'Snake Arena' });

  // Room code prominent
  const roomCodeText = await page1.locator('#roomCodeDisplay').textContent();
  const roomCodeFontSize = await page1.locator('#roomCodeDisplay').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  metrics.push({ name: 'room_code_text', value: roomCodeText ?? '', pass: !!(roomCodeText && roomCodeText !== '----') });
  metrics.push({ name: 'room_code_font_size_px', value: roomCodeFontSize, pass: roomCodeFontSize >= 28 });

  const roomCodeHeroVisible = await page1.locator('.room-code-hero').isVisible();
  metrics.push({ name: 'room_code_hero_visible', value: roomCodeHeroVisible, pass: roomCodeHeroVisible });

  // Share CTA present
  const shareVisible = await page1.locator('#copyRoomCodeButton').isVisible();
  const shareText = await page1.locator('#copyRoomCodeButton').textContent();
  metrics.push({ name: 'share_button_visible', value: shareVisible, pass: shareVisible });
  metrics.push({ name: 'share_button_text', value: shareText ?? '', pass: (shareText ?? '').toLowerCase().includes('share') });

  // Player cards
  const playerCount = await page1.locator('.player').count();
  metrics.push({ name: 'player_card_count', value: playerCount, pass: playerCount === (opts.bringSecondPlayer ? 2 : 1) });

  if (playerCount >= 1) {
    const p1Badge = await page1.locator('.player.p1-card .player-ready-badge').first().textContent();
    metrics.push({ name: 'p1_ready_badge', value: p1Badge ?? '', pass: !!(p1Badge && p1Badge.toLowerCase().includes('not ready')) });
    const p1Border = await page1.locator('.player.p1-card').first().evaluate(el => getComputedStyle(el).borderLeftColor);
    metrics.push({ name: 'p1_border_color', value: p1Border, pass: p1Border.includes('46, 139, 255') });
  }

  if (playerCount >= 2) {
    const p2Badge = await page1.locator('.player.p2-card .player-ready-badge').first().textContent();
    metrics.push({ name: 'p2_ready_badge', value: p2Badge ?? '', pass: !!(p2Badge && p2Badge.toLowerCase().includes('not ready')) });
    const p2Border = await page1.locator('.player.p2-card').first().evaluate(el => getComputedStyle(el).borderLeftColor);
    metrics.push({ name: 'p2_border_color', value: p2Border, pass: p2Border.includes('255, 122, 26') });
  }

  // Next-action copy present
  const nextActionVisible = await page1.locator('#nextActionArea').isVisible();
  const nextActionText = await page1.locator('#nextActionText').textContent();
  metrics.push({ name: 'next_action_visible', value: nextActionVisible, pass: nextActionVisible });
  metrics.push({ name: 'next_action_text', value: nextActionText ?? '', pass: !!(nextActionText && nextActionText.length > 0) });

  // Regression guard: nextActionIcon must contain a real emoji glyph, not
  // a raw HTML-entity literal like '&#x1F4E3;'. (Issue #99 follow-up.)
  const nextActionIconText = (await page1.locator('#nextActionIcon').textContent()) ?? '';
  const iconHasEntity = nextActionIconText.includes('&#x') || nextActionIconText.includes('&amp;');
  const iconHasGrapheme = nextActionIconText.trim().length > 0;
  metrics.push({ name: 'next_action_icon_text', value: JSON.stringify(nextActionIconText), pass: !iconHasEntity });
  metrics.push({ name: 'next_action_icon_no_entity', value: !iconHasEntity, pass: !iconHasEntity });
  metrics.push({ name: 'next_action_icon_has_grapheme', value: iconHasGrapheme, pass: iconHasGrapheme });

  // CTAs differentiated
  const readyText = await page1.locator('#readyButton').textContent();
  metrics.push({ name: 'ready_button_text', value: readyText ?? '', pass: !!(readyText && readyText.toLowerCase().includes('ready')) });

  const shareClass = await page1.locator('#copyRoomCodeButton').getAttribute('class');
  const readyClass = await page1.locator('#readyButton').getAttribute('class');
  metrics.push({ name: 'share_button_class', value: shareClass ?? '', pass: !!(shareClass && shareClass.includes('share-button')) });
  metrics.push({ name: 'ready_button_class', value: readyClass ?? '', pass: !!(readyClass && readyClass.includes('ready-button')) });
  metrics.push({ name: 'ctas_differentiated', value: shareClass !== readyClass, pass: shareClass !== readyClass });

  // No clipping — body scrollWidth <= clientWidth
  const scrollW = await page1.locator('body').evaluate(el => el.scrollWidth);
  const clientW = await page1.locator('body').evaluate(el => el.clientWidth);
  metrics.push({ name: 'no_horizontal_overflow', value: `${scrollW}<=${clientW}`, pass: scrollW <= clientW + 2 });

  // Lobby element fully visible
  const lobbyBox = await page1.locator('#lobby').boundingBox();
  metrics.push({ name: 'lobby_bbox', value: JSON.stringify(lobbyBox), pass: !!lobbyBox && lobbyBox.height > 200 });

  await browser.close();
  return { screenshotPath, metrics };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results: any[] = [];

  for (const scenario of [
    { viewport: { width: 1280, height: 800 }, label: 'desktop-solo', bringSecondPlayer: false },
    { viewport: { width: 1280, height: 800 }, label: 'desktop-duo', bringSecondPlayer: true },
    { viewport: { width: 390, height: 844 }, label: 'mobile-solo', bringSecondPlayer: false },
    { viewport: { width: 390, height: 844 }, label: 'mobile-duo', bringSecondPlayer: true },
  ]) {
    try {
      const r = await captureLobby(scenario);
      results.push({ scenario: scenario.label, ...r });
    } catch (err: any) {
      results.push({ scenario: scenario.label, error: err.message });
    }
  }

  // Write report
  const reportLines: string[] = [];
  reportLines.push('# Issue #99 Lobby Clarity — Verifier Visual Evidence');
  reportLines.push('');
  for (const r of results) {
    reportLines.push(`## Scenario: ${r.scenario}`);
    if (r.error) {
      reportLines.push(`- ERROR: ${r.error}`);
    } else {
      reportLines.push(`- Screenshot: ${r.screenshotPath}`);
      const failed = r.metrics.filter((m: Metric) => !m.pass);
      const passed = r.metrics.filter((m: Metric) => m.pass);
      reportLines.push(`- Passed: ${passed.length}/${r.metrics.length}`);
      for (const m of r.metrics) {
        const mark = m.pass ? '✓' : '✗';
        reportLines.push(`  - ${mark} ${m.name}: ${m.value}`);
      }
      if (failed.length) {
        reportLines.push(`- FAILED metrics: ${failed.map((f: Metric) => f.name).join(', ')}`);
      }
    }
    reportLines.push('');
  }
  const reportPath = path.join(OUT_DIR, 'report.md');
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(reportLines.join('\n'));
})();
