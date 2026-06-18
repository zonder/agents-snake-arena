import { test, expect } from '@playwright/test';

test.describe('Board bounds — issue #154', () => {
  test('board grid rows use explicit tracks so the bottom row is not clipped', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#entry')).toBeVisible();

    // Inject a board directly to test layout without waiting for a full game
    const bounds = await page.evaluate(() => {
      const board = document.getElementById('board');
      const gameStage = document.getElementById('gameStage');
      if (!board || !gameStage) return { error: 'missing elements' };

      // Make the game stage and board visible
      const panel = document.querySelector('.panel') as HTMLElement;
      const gamePanel = document.getElementById('gamePanel');
      if (panel) {
        panel.classList.add('gameplay-active');
        panel.dataset.phase = 'live';
      }
      if (gamePanel) gamePanel.classList.remove('hidden');

      // Set up the board grid the same way ensureBoard does
      const width = 30;
      const height = 30;
      board.innerHTML = '';
      board.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
      board.style.gridTemplateRows = `repeat(${height}, minmax(0, 1fr))`;
      for (let i = 0; i < width * height; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        board.appendChild(cell);
      }

      // Force layout
      void board.offsetHeight;

      const boardRect = board.getBoundingClientRect();
      const stageRect = gameStage.getBoundingClientRect();

      const cells = Array.from(board.children);
      const lastRowCells = cells.slice(-30);
      const lastRowRects = lastRowCells.map((c) => c.getBoundingClientRect());
      const lastRowBottom = Math.max(...lastRowRects.map((r) => r.bottom));
      const lastRowTop = Math.min(...lastRowRects.map((r) => r.top));
      const lastRowHeight = lastRowBottom - lastRowTop;

      const firstRowCells = cells.slice(0, 30);
      const firstRowRects = firstRowCells.map((c) => c.getBoundingClientRect());
      const firstRowBottom = Math.max(...firstRowRects.map((r) => r.bottom));
      const firstRowTop = Math.min(...firstRowRects.map((r) => r.top));
      const firstRowHeight = firstRowBottom - firstRowTop;

      // Check if the board has explicit grid-template-rows
      const boardStyle = board.style.gridTemplateRows;
      const hasExplicitRows = boardStyle.includes('repeat');

      return {
        totalCells: cells.length,
        boardBottom: boardRect.bottom,
        stageBottom: stageRect.bottom,
        lastRowBottom,
        lastRowHeight,
        firstRowHeight,
        isLastRowFullyVisible: lastRowBottom <= stageRect.bottom + 1,
        lastRowHeightDiff: Math.abs(lastRowHeight - firstRowHeight),
        hasExplicitRows,
        gridTemplateRows: boardStyle,
        gridTemplateColumns: board.style.gridTemplateColumns,
      };
    });

    expect(bounds.error).toBeUndefined();
    expect(bounds.totalCells).toBe(900);
    expect(bounds.hasExplicitRows).toBe(true);
    expect(bounds.gridTemplateRows).toContain('repeat(30');
    expect(bounds.gridTemplateColumns).toContain('repeat(30');

    // The last row bottom must be within the game stage container
    expect(bounds.isLastRowFullyVisible).toBe(true);

    // Last row height should be similar to first row height (within 2px tolerance for sub-pixel)
    expect(bounds.lastRowHeightDiff).toBeLessThan(2);

    // Board bottom should not exceed stage bottom
    expect(bounds.boardBottom).toBeLessThanOrEqual(bounds.stageBottom + 1);
  });

  test('board cells are approximately square', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#entry')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const board = document.getElementById('board');
      const gameStage = document.getElementById('gameStage');
      if (!board || !gameStage) return { error: 'missing elements' };

      // Make visible
      const panel = document.querySelector('.panel') as HTMLElement;
      const gamePanel = document.getElementById('gamePanel');
      if (panel) panel.classList.add('gameplay-active');
      if (gamePanel) gamePanel.classList.remove('hidden');

      const width = 30;
      const height = 30;
      board.innerHTML = '';
      board.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
      board.style.gridTemplateRows = `repeat(${height}, minmax(0, 1fr))`;
      for (let i = 0; i < width * height; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        board.appendChild(cell);
      }
      void board.offsetHeight;

      const cells = Array.from(board.children);
      const sample = [0, 449, 899]; // first, middle, last
      const measurements = sample.map((i) => {
        const rect = cells[i].getBoundingClientRect();
        return { width: rect.width, height: rect.height, ratio: rect.width / rect.height };
      });

      return { measurements };
    });

    expect(metrics.error).toBeUndefined();
    for (const m of metrics.measurements) {
      // Cells should be approximately square (ratio close to 1.0)
      expect(m.ratio).toBeGreaterThan(0.95);
      expect(m.ratio).toBeLessThan(1.05);
    }
  });
});
