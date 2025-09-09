import { test, expect } from '@playwright/test';

test.describe('Admin · Kill Switch', () => {
  test('page renders and endpoints respond', async ({ page, request, baseURL }) => {
    await page.goto('/admin/kill-switch');
    await expect(page.getByText('Admin · Kill Switch')).toBeVisible();

    // API GET status
    const statusResp = await request.get(`${baseURL}/api/admin/kill-switch`);
    expect(statusResp.ok()).toBeTruthy();
    const statusJson = await statusResp.json();
    expect(statusJson.success).toBeTruthy();

    // Activate
    const postResp = await request.post(`${baseURL}/api/admin/kill-switch`, {
      data: { reason: 'e2e test', requestedBy: 'e2e@admin.local' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(postResp.ok()).toBeTruthy();

    // Deactivate
    const delResp = await request.delete(`${baseURL}/api/admin/kill-switch`, {
      data: { reason: 'e2e test', requestedBy: 'e2e@admin.local' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(delResp.ok()).toBeTruthy();
  });
});


