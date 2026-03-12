import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'http://20.106.185.110:8081/';
const OUT_DIR = path.resolve('docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9');
await fs.mkdir(OUT_DIR, { recursive: true });

const summary = {
  checkedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  mobile: {},
  desktop: {},
  notes: []
};

function attachSocketRecorder(page, bucket) {
  bucket.sent = [];
  bucket.received = [];
  page.on('websocket', (ws) => {
    ws.on('framesent', ({ payload }) => bucket.sent.push(String(payload)));
    ws.on('framereceived', ({ payload }) => bucket.received.push(String(payload)));
  });
  page.on('pageerror', (err) => {
    bucket.pageErrors = bucket.pageErrors || [];
    bucket.pageErrors.push(String(err));
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      bucket.consoleErrors = bucket.consoleErrors || [];
      bucket.consoleErrors.push(msg.text());
    }
  });
}

async function waitForPhase(page, phase, timeout = 20000) {
  await page.waitForFunction((expected) => document.querySelector('.panel')?.dataset.phase === expected, phase, { timeout });
}

async function collectState(page, label) {
  return await page.evaluate((label) => {
    const panel = document.querySelector('.panel');
    const board = document.getElementById('board');
    const stage = document.getElementById('gameStage');
    const touch = document.getElementById('touchControls');
    const ready = document.getElementById('readyButton');
    const rematch = document.getElementById('rematchButton');
    const postGame = document.getElementById('postGameBanner');
    const visible = (el) => !!el && !el.classList.contains('hidden');
    const rectObj = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const cells = Array.from(board?.children || []);
    const heads = cells.map((cell, i) => cell.className.includes('head') ? { index: i, className: cell.className } : null).filter(Boolean);
    return {
      label,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      panel: panel ? {
        phase: panel.dataset.phase,
        layoutMode: panel.dataset.layoutMode,
        orientation: panel.dataset.orientation,
        touch: panel.dataset.touch,
        outcome: panel.dataset.outcome,
        scrollY: window.scrollY
      } : null,
      buildMarker: document.getElementById('buildMarker')?.textContent?.trim(),
      gameBuildMarker: document.getElementById('gameBuildMarker')?.textContent?.trim(),
      status: document.getElementById('status')?.textContent?.trim(),
      lobbyMessage: document.getElementById('lobbyMessage')?.textContent?.trim(),
      gameMessage: document.getElementById('gameMessage')?.textContent?.trim(),
      roomCode: document.getElementById('roomCodeDisplay')?.textContent?.trim() || document.getElementById('gameRoomCode')?.textContent?.trim(),
      touchControlsVisible: visible(touch),
      touchButtonsDisabled: Array.from(touch?.querySelectorAll('button') || []).map((b) => ({ label: b.getAttribute('aria-label'), disabled: b.disabled })),
      readyEnabled: !!ready && !ready.disabled,
      rematchVisible: visible(rematch),
      postGameVisible: visible(postGame),
      boardRect: rectObj(board),
      stageRect: rectObj(stage),
      heads,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      docScrollHeight: document.documentElement.scrollHeight,
    };
  }, label);
}

function directionFrames(bucket) {
  return (bucket.sent || []).filter((frame) => frame.includes('player:direction:set'));
}

const browser = await chromium.launch({ headless: true });
try {
  const iphone = devices['iPhone 12'];

  const hostCtx = await browser.newContext({ ...iphone });
  const guestCtx = await browser.newContext({ ...iphone });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const hostSock = {};
  const guestSock = {};
  attachSocketRecorder(host, hostSock);
  attachSocketRecorder(guest, guestSock);

  await Promise.all([host.goto(BASE_URL), guest.goto(BASE_URL)]);
  await host.waitForSelector('#createRoomButton');
  await guest.waitForSelector('#joinRoomButton');
  await host.waitForTimeout(1500);
  await guest.waitForTimeout(1500);

  summary.mobile.entryHost = await collectState(host, 'mobile-entry-host');
  summary.mobile.entryGuest = await collectState(guest, 'mobile-entry-guest');
  await host.screenshot({ path: path.join(OUT_DIR, '01-mobile-entry-host.png'), fullPage: true });

  await host.click('#createRoomButton');
  await waitForPhase(host, 'lobby');
  await host.waitForFunction(() => {
    const code = document.getElementById('roomCodeDisplay')?.textContent?.trim();
    return code && code !== '----';
  }, { timeout: 15000 });
  const roomCode = await host.locator('#roomCodeDisplay').textContent();
  summary.mobile.roomCode = roomCode.trim();

  await guest.fill('#roomCodeInput', summary.mobile.roomCode);
  await guest.click('#joinRoomButton');
  await waitForPhase(guest, 'lobby');
  await host.waitForFunction(() => document.querySelectorAll('#players .player').length >= 2, { timeout: 15000 });
  await guest.waitForFunction(() => document.querySelectorAll('#players .player').length >= 2, { timeout: 15000 });

  summary.mobile.lobbyHost = await collectState(host, 'mobile-lobby-host');
  summary.mobile.lobbyGuest = await collectState(guest, 'mobile-lobby-guest');
  await host.screenshot({ path: path.join(OUT_DIR, '02-mobile-lobby-host.png'), fullPage: true });
  await guest.screenshot({ path: path.join(OUT_DIR, '03-mobile-lobby-guest.png'), fullPage: true });

  await host.click('#readyButton');
  await guest.click('#readyButton');
  await host.waitForSelector('#gamePanel:not(.hidden)', { timeout: 60000 });
  await guest.waitForSelector('#gamePanel:not(.hidden)', { timeout: 60000 });
  await host.waitForSelector('#touchControls:not(.hidden)', { timeout: 60000 });
  await guest.waitForSelector('#touchControls:not(.hidden)', { timeout: 60000 });

  summary.mobile.gamePortraitHost = await collectState(host, 'mobile-game-portrait-host');
  summary.mobile.gamePortraitGuest = await collectState(guest, 'mobile-game-portrait-guest');
  await host.screenshot({ path: path.join(OUT_DIR, '04-mobile-game-portrait-host.png'), fullPage: true });
  await guest.screenshot({ path: path.join(OUT_DIR, '05-mobile-game-portrait-guest.png'), fullPage: true });

  await host.waitForFunction(() => window.eval('latestGameState?.phase') === 'in-progress', { timeout: 45000 });
  await guest.waitForFunction(() => window.eval('latestGameState?.phase') === 'in-progress', { timeout: 45000 });
  const box = await host.locator('#gameStage').boundingBox();
  await host.mouse.move(box.x + box.width / 2, box.y + box.height * 0.75);
  await host.mouse.down();
  await host.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25, { steps: 8 });
  await host.mouse.up();
  await host.evaluate(() => window.eval('requestDirection("up", "swipe")'));
  await guest.evaluate(() => window.eval('requestDirection("down", "touch-button")'));
  await host.waitForTimeout(1200);

  summary.mobile.hostDirectionFramesAfterSwipe = directionFrames(hostSock);
  summary.mobile.guestDirectionFramesAfterButtons = directionFrames(guestSock);

  await host.setViewportSize({ width: 844, height: 390 });
  await guest.setViewportSize({ width: 844, height: 390 });
  await host.waitForTimeout(800);
  await guest.waitForTimeout(800);

  summary.mobile.gameLandscapeHost = await collectState(host, 'mobile-game-landscape-host');
  summary.mobile.gameLandscapeGuest = await collectState(guest, 'mobile-game-landscape-guest');
  await host.screenshot({ path: path.join(OUT_DIR, '06-mobile-game-landscape-host.png'), fullPage: true });
  await guest.screenshot({ path: path.join(OUT_DIR, '07-mobile-game-landscape-guest.png'), fullPage: true });

  for (let i = 0; i < 20; i += 1) {
    const phase = await host.evaluate(() => window.eval('latestGameState?.phase'));
    if (phase === 'game-over') break;
    await host.evaluate(() => {
      const state = window.eval('latestGameState');
      const slot = window.eval('yourSlotIndex');
      const snake = state?.snakes?.[slot];
      if (!state || !snake) return;
      const head = snake.body?.[0];
      const current = snake.pendingDirection || snake.direction;
      const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
      const choices = [
        { dir: 'up', dist: head.y },
        { dir: 'down', dist: state.board.height - 1 - head.y },
        { dir: 'left', dist: head.x },
        { dir: 'right', dist: state.board.width - 1 - head.x },
      ].filter((c) => c.dir !== current && opposite[current] !== c.dir)
       .sort((a, b) => a.dist - b.dist);
      if (choices[0]) {
        window.eval(`socket.emit('player:direction:set', { direction: '${choices[0].dir}' })`);
      }
    });
    await host.waitForTimeout(300);
  }
  await host.waitForFunction(() => window.eval('latestGameState?.phase') === 'game-over', { timeout: 15000 });
  await guest.waitForFunction(() => window.eval('latestGameState?.phase') === 'game-over', { timeout: 15000 });
  summary.mobile.gameOverHost = await collectState(host, 'mobile-gameover-host');
  summary.mobile.gameOverGuest = await collectState(guest, 'mobile-gameover-guest');
  await host.screenshot({ path: path.join(OUT_DIR, '08-mobile-gameover-host.png'), fullPage: true });
  await guest.screenshot({ path: path.join(OUT_DIR, '09-mobile-gameover-guest.png'), fullPage: true });

  // Verify rematch usability on mobile in portrait-preferred mode.
  await host.setViewportSize({ width: 390, height: 844 });
  await guest.setViewportSize({ width: 390, height: 844 });
  await host.waitForTimeout(500);
  await guest.waitForTimeout(500);
  await host.click('#postGameBannerButton');
  await guest.click('#postGameBannerButton');
  await host.waitForSelector('#gamePanel:not(.hidden)', { timeout: 15000 });
  await guest.waitForSelector('#gamePanel:not(.hidden)', { timeout: 15000 });
  summary.mobile.rematchHost = await collectState(host, 'mobile-rematch-host');
  summary.mobile.rematchGuest = await collectState(guest, 'mobile-rematch-guest');
  await host.screenshot({ path: path.join(OUT_DIR, '10-mobile-rematch-host.png'), fullPage: true });
  await guest.screenshot({ path: path.join(OUT_DIR, '11-mobile-rematch-guest.png'), fullPage: true });

  await hostCtx.close();
  await guestCtx.close();

  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopGuestCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const deskHost = await desktopCtx.newPage();
  const deskGuest = await desktopGuestCtx.newPage();
  const deskHostSock = {};
  attachSocketRecorder(deskHost, deskHostSock);
  attachSocketRecorder(deskGuest, {});
  await Promise.all([deskHost.goto(BASE_URL), deskGuest.goto(BASE_URL)]);
  await deskHost.waitForSelector('#createRoomButton');
  await deskHost.click('#createRoomButton');
  await waitForPhase(deskHost, 'lobby');
  await deskHost.waitForFunction(() => {
    const code = document.getElementById('roomCodeDisplay')?.textContent?.trim();
    return code && code !== '----';
  }, { timeout: 15000 });
  const desktopRoomCode = (await deskHost.locator('#roomCodeDisplay').textContent()).trim();
  await deskGuest.fill('#roomCodeInput', desktopRoomCode);
  await deskGuest.click('#joinRoomButton');
  await waitForPhase(deskGuest, 'lobby');
  await deskHost.click('#readyButton');
  await deskGuest.click('#readyButton');
  await deskHost.waitForSelector('#gamePanel:not(.hidden)', { timeout: 20000 });
  await deskHost.waitForFunction(() => document.querySelector('.panel')?.dataset.phase !== 'lobby', { timeout: 20000 });
  await deskHost.keyboard.press('ArrowUp');
  await deskHost.waitForTimeout(800);
  summary.desktop.entryAndGame = await collectState(deskHost, 'desktop-game-host');
  summary.desktop.directionFrames = directionFrames(deskHostSock);
  await deskHost.screenshot({ path: path.join(OUT_DIR, '12-desktop-game-host.png'), fullPage: true });
  await desktopCtx.close();
  await desktopGuestCtx.close();

  summary.assertions = {
    buildMarkerHost: summary.mobile.entryHost.buildMarker,
    portraitLayoutHost: summary.mobile.gamePortraitHost.panel.layoutMode,
    landscapeLayoutHost: summary.mobile.gameLandscapeHost.panel.layoutMode,
    portraitBoardFits: summary.mobile.gamePortraitHost.boardRect.bottom <= summary.mobile.gamePortraitHost.viewport.height + 1,
    landscapeBoardFits: summary.mobile.gameLandscapeHost.boardRect.bottom <= summary.mobile.gameLandscapeHost.viewport.height + 1,
    portraitTouchVisible: summary.mobile.gamePortraitHost.touchControlsVisible,
    landscapeTouchVisible: summary.mobile.gameLandscapeHost.touchControlsVisible,
    swipeFramesSeen: summary.mobile.hostDirectionFramesAfterSwipe.length > 0,
    buttonFramesSeen: summary.mobile.guestDirectionFramesAfterButtons.length > 0,
    rematchWorked: summary.mobile.rematchHost.panel.phase === 'countdown' || summary.mobile.rematchHost.panel.phase === 'live',
    desktopLayout: summary.desktop.entryAndGame.panel.layoutMode,
    desktopTouchHidden: summary.desktop.entryAndGame.touchControlsVisible === false,
    desktopKeyFramesSeen: summary.desktop.directionFrames.length > 0
  };

  await fs.writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary.assertions, null, 2));
} finally {
  await browser.close();
}
