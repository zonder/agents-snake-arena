import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const BASE_URL = 'http://20.106.185.110:8081/';
const OUT = 'docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/touch-input-check.json';

function attachSocketRecorder(page, bucket) {
  bucket.sent = [];
  page.on('websocket', (ws) => {
    ws.on('framesent', ({ payload }) => bucket.sent.push(String(payload)));
  });
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
  await host.click('#createRoomButton');
  await host.waitForFunction(() => document.getElementById('roomCodeDisplay')?.textContent?.trim()?.length === 4);
  const roomCode = (await host.locator('#roomCodeDisplay').textContent()).trim();
  await guest.fill('#roomCodeInput', roomCode);
  await guest.click('#joinRoomButton');
  await host.waitForFunction(() => document.querySelectorAll('#players .player').length >= 2);
  await guest.waitForFunction(() => document.querySelectorAll('#players .player').length >= 2);
  await host.click('#readyButton');
  await guest.click('#readyButton');
  await host.waitForSelector('#touchControls:not(.hidden)');
  await guest.waitForSelector('#touchControls:not(.hidden)');
  await host.waitForTimeout(1500);
  await guest.waitForTimeout(1500);

  const before = await host.evaluate(() => ({
    buildMarker: document.getElementById('buildMarker')?.textContent?.trim(),
    phase: window.eval('latestGameState?.phase'),
    currentDirection: window.eval('latestGameState?.snakes?.[yourSlotIndex]?.direction'),
    pendingDirection: window.eval('latestGameState?.snakes?.[yourSlotIndex]?.pendingDirection') ?? null,
    layoutMode: document.querySelector('.panel')?.dataset.layoutMode,
    touchControlsVisible: !document.getElementById('touchControls')?.classList.contains('hidden')
  }));

  await host.click('button[aria-label="Move up"]');
  await host.waitForTimeout(300);
  const afterButton = await host.evaluate(() => ({
    phase: window.eval('latestGameState?.phase'),
    currentDirection: window.eval('latestGameState?.snakes?.[yourSlotIndex]?.direction'),
    pendingDirection: window.eval('latestGameState?.snakes?.[yourSlotIndex]?.pendingDirection') ?? null,
    layoutMode: document.querySelector('.panel')?.dataset.layoutMode,
  }));

  await guest.evaluate(() => window.eval('requestDirection("up", "swipe")'));
  await guest.waitForTimeout(300);
  const afterSwipe = await guest.evaluate(() => ({
    phase: window.eval('latestGameState?.phase'),
    currentDirection: window.eval('latestGameState?.snakes?.[yourSlotIndex]?.direction'),
    pendingDirection: window.eval('latestGameState?.snakes?.[yourSlotIndex]?.pendingDirection') ?? null,
    layoutMode: document.querySelector('.panel')?.dataset.layoutMode,
  }));

  const result = {
    checkedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    roomCode,
    before,
    touchButtonHost: afterButton,
    swipeGuest: afterSwipe,
    hostFrames: hostSock.sent,
    guestFrames: guestSock.sent,
    buttonFrames: hostSock.sent.filter((f) => f.includes('player:direction:set')),
    swipeFrames: guestSock.sent.filter((f) => f.includes('player:direction:set')),
  };
  result.pass = (afterButton.currentDirection === 'up' || afterButton.pendingDirection === 'up') && result.swipeFrames.length > 0;
  await fs.writeFile(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await hostCtx.close();
  await guestCtx.close();
} finally {
  await browser.close();
}
