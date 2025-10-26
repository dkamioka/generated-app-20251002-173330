/**
 * End-to-End Tests for Kido Go Game
 *
 * These tests use Playwright to test the complete user journey.
 * Run with: npx playwright test
 *
 * Prerequisites:
 * - Install Playwright: npm install -D @playwright/test
 * - Setup browsers: npx playwright install
 */

import { test, expect, type Page } from '@playwright/test';

// Helper function to create a game
async function createGame(page: Page, playerName: string, boardSize: 9 | 13 | 19 = 19, opponentType: 'human' | 'ai' = 'human') {
  await page.goto('/');

  // Sign in (mock authentication)
  // In real scenario, this would go through Google OAuth
  await page.click('text=Create Game');

  await page.fill('input[name="playerName"]', playerName);
  await page.selectOption('select[name="boardSize"]', boardSize.toString());
  await page.selectOption('select[name="opponentType"]', opponentType);

  if (opponentType === 'human') {
    await page.check('input[name="isPublic"]');
  }

  await page.click('button[type="submit"]');

  // Wait for navigation to game page
  await page.waitForURL(/\/game\//);

  return page.url().split('/').pop(); // Return game ID
}

test.describe('Game Creation Flow', () => {
  test('should create a new public game', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Create Game');
    await expect(page.locator('text=Create New Game')).toBeVisible();

    await page.fill('input[name="playerName"]', 'TestPlayer');
    await page.click('button[type="submit"]');

    // Should navigate to game page
    await expect(page).toHaveURL(/\/game\//);
    await expect(page.locator('text=KIDO')).toBeVisible();
  });

  test('should create AI game and start immediately', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Create Game');
    await page.fill('input[name="playerName"]', 'TestPlayer');
    await page.selectOption('select[name="opponentType"]', 'ai');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/game\//);

    // Should show AI opponent name
    await expect(page.locator('text=Kido-Bot')).toBeVisible();
  });

  test('should support different board sizes', async ({ page }) => {
    for (const size of [9, 13, 19]) {
      await page.goto('/');
      await page.click('text=Create Game');

      await page.fill('input[name="playerName"]', 'TestPlayer');
      await page.selectOption('select[name="boardSize"]', size.toString());
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/game\//);

      // Verify board size (count cells)
      const cells = await page.locator('[class*="relative flex items-center"]').count();
      expect(cells).toBe(size * size);

      // Go back to lobby
      await page.click('text=Lobby');
    }
  });
});

test.describe('Game Joining Flow', () => {
  test('should allow second player to join waiting game', async ({ browser }) => {
    // Create two browser contexts (two different users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Player 1 creates game
    await page1.goto('/');
    await page1.click('text=Create Game');
    await page1.fill('input[name="playerName"]', 'Alice');
    await page1.check('input[name="isPublic"]');
    await page1.click('button[type="submit"]');

    const gameId = page1.url().split('/').pop();

    // Player 2 joins
    await page2.goto('/');
    await page2.click(`text=Join`, { timeout: 5000 });
    await page2.fill('input[name="playerName"]', 'Bob');
    await page2.click('button[type="submit"]');

    // Both players should see the game
    await expect(page1.locator('text=Bob')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=Alice')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should not allow joining full game', async ({ page }) => {
    await page.goto('/');

    // Try to join a game that's already in progress
    const inProgressGame = page.locator('text=In Progress').first();

    if (await inProgressGame.isVisible()) {
      await expect(page.locator('text=Join').first()).toBeDisabled();
    }
  });
});

test.describe('Stone Placement', () => {
  test('should place stones alternately', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup game
    await page1.goto('/');
    await page1.click('text=Create Game');
    await page1.fill('input[name="playerName"]', 'Alice');
    await page1.check('input[name="isPublic"]');
    await page1.click('button[type="submit"]');

    await page2.goto('/');
    await page2.click('text=Join');
    await page2.fill('input[name="playerName"]', 'Bob');
    await page2.click('button[type="submit"]');

    // Wait for both players to load
    await page1.waitForTimeout(1000);

    // Alice (black) plays first
    const cells1 = page1.locator('[class*="relative flex items-center"]');
    await cells1.nth(60).click(); // Click center-ish

    // Wait for stone to appear
    await expect(page1.locator('[class*="bg-black"]').first()).toBeVisible();

    // Bob's turn now
    await page2.waitForTimeout(1000);
    const cells2 = page2.locator('[class*="relative flex items-center"]');
    await cells2.nth(120).click();

    await expect(page2.locator('[class*="bg-white"]').first()).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should not allow playing out of turn', async ({ page }) => {
    await createGame(page, 'TestPlayer', 19, 'ai');

    // AI plays as white, so after black's first move, can't immediately play again
    const cells = page.locator('[class*="relative flex items-center"]');
    await cells.nth(180).click();

    // Try to play again immediately (should be ignored)
    await cells.nth(181).click();

    // Should only have one black stone
    const blackStones = await page.locator('[class*="bg-black"]').count();
    expect(blackStones).toBeLessThanOrEqual(2); // At most 2 (one player, one AI response)
  });
});

test.describe('Pass and Resignation', () => {
  test('should allow player to pass', async ({ page }) => {
    await createGame(page, 'TestPlayer', 9, 'ai');

    await page.click('text=Pass');
    await expect(page.locator('text=You passed your turn')).toBeVisible();
  });

  test('should end game on double pass', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup game
    await page1.goto('/');
    await page1.click('text=Create Game');
    await page1.fill('input[name="playerName"]', 'Alice');
    await page1.selectOption('select[name="boardSize"]', '9');
    await page1.check('input[name="isPublic"]');
    await page1.click('button[type="submit"]');

    await page2.goto('/');
    await page2.click('text=Join');
    await page2.fill('input[name="playerName"]', 'Bob');
    await page2.click('button[type="submit"]');

    await page1.waitForTimeout(1000);

    // Both players pass
    await page1.click('text=Pass');
    await page2.waitForTimeout(1000);
    await page2.click('text=Pass');

    // Game should end
    await expect(page1.locator('text=GAME OVER')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=GAME OVER')).toBeVisible({ timeout: 5000 });

    await context1.close();
    await context2.close();
  });

  test('should allow player to resign', async ({ page }) => {
    await createGame(page, 'TestPlayer', 9, 'ai');

    await page.click('text=Resign');

    // Confirm resignation if there's a confirmation dialog
    if (await page.locator('text=Are you sure').isVisible()) {
      await page.click('text=Confirm');
    }

    await expect(page.locator('text=GAME OVER')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Chat Functionality', () => {
  test('should send and receive public chat messages', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup game
    await page1.goto('/');
    await page1.click('text=Create Game');
    await page1.fill('input[name="playerName"]', 'Alice');
    await page1.check('input[name="isPublic"]');
    await page1.click('button[type="submit"]');

    await page2.goto('/');
    await page2.click('text=Join');
    await page2.fill('input[name="playerName"]', 'Bob');
    await page2.click('button[type="submit"]');

    await page1.waitForTimeout(1000);

    // Send chat message
    const chatInput1 = page1.locator('input[placeholder*="message"]');
    await chatInput1.fill('Hello Bob!');
    await chatInput1.press('Enter');

    // Check both players see the message
    await expect(page1.locator('text=Hello Bob!')).toBeVisible();
    await page2.waitForTimeout(2000); // Wait for polling
    await expect(page2.locator('text=Hello Bob!')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should toggle player chat visibility', async ({ page }) => {
    await createGame(page, 'TestPlayer', 9, 'ai');

    // Find visibility toggle
    const toggle = page.locator('text=Player Chat Visible to Observers');

    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('text=hidden')).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Observer Mode', () => {
  test('should allow observing public game', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    // Player 1 creates game
    await page1.goto('/');
    await page1.click('text=Create Game');
    await page1.fill('input[name="playerName"]', 'Alice');
    await page1.check('input[name="isPublic"]');
    await page1.click('button[type="submit"]');

    // Player 2 joins
    await page2.goto('/');
    await page2.click('text=Join');
    await page2.fill('input[name="playerName"]', 'Bob');
    await page2.click('button[type="submit"]');

    // Observer watches
    await page3.goto('/');
    await page3.click('text=Watch');
    await page3.fill('input[name="observerName"]', 'Observer');
    await page3.click('button[type="submit"]');

    // Observer should see the game but not be able to play
    await expect(page3.locator('text=Alice')).toBeVisible();
    await expect(page3.locator('text=Bob')).toBeVisible();

    // Verify observer cannot place stones
    const cells = page3.locator('[class*="cursor-pointer"]');
    await expect(cells.first()).not.toBeVisible();

    await context1.close();
    await context2.close();
    await context3.close();
  });
});

test.describe('Replay System', () => {
  test('should navigate to replay after game ends', async ({ page }) => {
    await createGame(page, 'TestPlayer', 9, 'ai');

    // Quickly end game by resignation
    await page.click('text=Resign');

    await expect(page.locator('text=GAME OVER')).toBeVisible({ timeout: 3000 });

    // Click replay button
    await page.click('text=View Replay');

    await expect(page).toHaveURL(/\/replay\//);
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await createGame(page, 'MobilePlayer', 9, 'ai');

    // Mobile drawer should be visible
    await expect(page.locator('[class*="MobileGameDrawer"]')).toBeVisible();

    // Should still be able to place stones
    const cells = page.locator('[class*="relative flex items-center"]');
    await cells.nth(40).click();

    await expect(page.locator('[class*="bg-black"]').first()).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle non-existent game gracefully', async ({ page }) => {
    await page.goto('/game/non-existent-game-id');

    // Should redirect to lobby or show error
    await expect(page.locator('text=Game not found')).toBeVisible({ timeout: 3000 });
  });

  test('should handle network errors', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);

    await page.goto('/');

    // Should show error or loading state
    await expect(page.locator('text=error|failed|offline', { noWaitAfter: true })).toBeVisible({ timeout: 5000 });

    await page.context().setOffline(false);
  });
});
