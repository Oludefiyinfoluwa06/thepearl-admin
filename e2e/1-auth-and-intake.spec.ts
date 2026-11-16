import { expect, test } from '@playwright/test';
import { INTAKE_KEY, OWNER, signIn, signInAsOwner } from './helpers';

test('signing in: wrong password is rejected, correct one works, sign out ends the session', async ({ page }) => {
  await signIn(page, OWNER.email, 'wrong-password');
  await expect(page.getByText('Incorrect email or password')).toBeVisible();

  await page.fill('#password', OWNER.password);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto('/leads');
  await expect(page).toHaveURL(/login/);
});

test('pages are protected when signed out', async ({ page }) => {
  for (const path of ['/', '/leads', '/clients', '/team', '/cases/new']) {
    await page.goto(path);
    await expect(page).toHaveURL(/login/);
  }
});

test('a stale session cookie does not cause a redirect loop', async ({ page, context }) => {
  await context.addCookies([{ name: 'tptt_admin_session', value: 'not-a-real-session', url: 'http://localhost:3200' }]);
  await page.goto('/leads');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test.describe('website intake endpoint', () => {
  const post = (request: import('@playwright/test').APIRequestContext, key: string | null, data: object) =>
    request.post('/api/intake/website', { data, headers: key ? { 'x-intake-key': key } : {} });

  test('rejects missing or wrong keys', async ({ request }) => {
    expect((await post(request, null, { name: 'A', email: 'a@example.com' })).status()).toBe(401);
    expect((await post(request, 'wrong-key-wrong-key', { name: 'A', email: 'a@example.com' })).status()).toBe(401);
  });

  test('rejects an invalid email', async ({ request }) => {
    expect((await post(request, INTAKE_KEY, { name: 'A', email: 'nope' })).status()).toBe(400);
  });

  test('creates a lead that staff can see', async ({ request, page }) => {
    const res = await post(request, INTAKE_KEY, { name: 'Web Visitor', email: 'web.visitor@example.com', phone: '08011112222', service: 'study-visa', message: 'Hello from the site' });
    expect(res.status()).toBe(201);

    await signInAsOwner(page);
    await page.goto('/leads?q=web.visitor');
    await expect(page.getByRole('link', { name: 'Web Visitor' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Website form' })).toBeVisible();
  });
});
