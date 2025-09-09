import { test, expect } from '@playwright/test';

test.describe('Admin · Dead Letter Queue', () => {
  test('page renders and retry/delete endpoints respond', async ({ page, request, baseURL }) => {
    await page.goto('/admin/dead-letter-queue');
    await expect(page.getByText('Admin · Dead Letter Queue')).toBeVisible();

    // Retry
    const retryResp = await request.post(`${baseURL}/api/admin/dead-letter-queue`, {
      data: { dlqId: 'test-dlq-id', requestedBy: 'e2e@admin.local' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(retryResp.ok()).toBeTruthy();

    // Delete
    const deleteResp = await request.delete(`${baseURL}/api/admin/dead-letter-queue`, {
      data: { dlqId: 'test-dlq-id', requestedBy: 'e2e@admin.local' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(deleteResp.ok()).toBeTruthy();
  });
});


