import { test, expect } from '@playwright/test';

test.describe('Admin · Backfill & Exports', () => {
  test('trigger backfill endpoint responds', async ({ request, baseURL }) => {
    const resp = await request.post(`${baseURL}/api/admin/jobs`, {
      data: { action: 'trigger_backfill', days: 1, limit: 10 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(resp.ok()).toBeTruthy();
  });

  test('download domains CSV from exports page', async ({ page }) => {
    await page.goto('/admin/exports');
    await expect(page.getByText('Admin · Exports')).toBeVisible();

    const [ download ] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download CSV/i }).click(),
    ]);

    const content = await download.text();
    const firstLine = content.split('\n')[0];
    expect(firstLine).toMatch(/domain,total_mentions,first_seen,last_seen/);
  });
});


