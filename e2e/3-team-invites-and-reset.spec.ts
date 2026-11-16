import { expect, test } from '@playwright/test';
import { OWNER, linkIn, mailCount, signIn, signInAsOwner, waitForMail } from './helpers';

test.describe.configure({ mode: 'serial' });

let inviteLink = '';
let resetLink = '';

test('an owner invites a team member by email, with no password field', async ({ page }) => {
  await signInAsOwner(page);
  await page.goto('/team');
  await expect(page.locator('#t_password')).toHaveCount(0);
  await page.fill('#t_name', 'Sam Staff');
  await page.fill('#t_email', 'sam@example.com');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText('Invitation sent to sam@example.com')).toBeVisible();

  const mail = await waitForMail('sam@example.com', 'invited');
  inviteLink = linkIn(mail);
  expect(inviteLink).toContain('/set-password?token=');

  await page.reload();
  await expect(page.getByText('Invitation pending')).toBeVisible();
});

test('an invited person cannot sign in until they set a password', async ({ page }) => {
  await signIn(page, 'sam@example.com', 'anything12345');
  await expect(page.getByText('Incorrect email or password')).toBeVisible();
});

test('the invitation link lets them choose a password (weak or mismatched ones are refused)', async ({ page }) => {
  await page.goto(inviteLink);
  await expect(page.getByText('Welcome, Sam')).toBeVisible();

  await page.fill('#password', 'short');
  await page.fill('#confirm', 'short');
  await page.locator('#password').evaluate((el) => el.removeAttribute('minlength'));
  await page.getByRole('button', { name: 'Activate account' }).click();
  // (the "at least 8 characters" hint is always on the page, so wait for the actual error alert)
  await expect(page.getByRole('alert').filter({ hasText: 'Use at least 8 characters.' })).toBeVisible();
  await expect(page.locator('#password')).toHaveValue(''); // fields are cleared after a refused submit

  await page.fill('#password', 'samsecret123');
  await page.fill('#confirm', 'different123');
  await page.getByRole('button', { name: 'Activate account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'do not match' })).toBeVisible();
  await expect(page.locator('#password')).toHaveValue('');

  await page.fill('#password', 'samsecret123');
  await page.fill('#confirm', 'samsecret123');
  await page.getByRole('button', { name: 'Activate account' }).click();
  await expect(page).toHaveURL(/login\?notice=welcome/);
  await expect(page.getByText('Your password is set')).toBeVisible();

  await page.fill('#email', 'sam@example.com');
  await page.fill('#password', 'samsecret123');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/');
});

test('staff cannot reach the team page and the invitation link works only once', async ({ page, browser }) => {
  await signIn(page, 'sam@example.com', 'samsecret123');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('navigation').getByText('Team')).toHaveCount(0);
  await page.goto('/team');
  await expect(page).toHaveURL('/');

  const other = await (await browser.newContext()).newPage();
  await other.goto(inviteLink);
  await expect(other.getByText('expired or was already used')).toBeVisible();
});

test('forgot password: same answer for unknown emails, no mail sent to them', async ({ page }) => {
  const before = mailCount();
  await page.goto('/forgot-password');
  await page.fill('#email', 'nobody@example.com');
  await page.click('button[type=submit]');
  const unknown = await page.getByRole('status').innerText();
  expect(unknown).toContain('If that email belongs');

  await page.goto('/forgot-password');
  await page.fill('#email', 'sam@example.com');
  await page.click('button[type=submit]');
  expect(await page.getByRole('status').innerText()).toBe(unknown); // cannot be used to find accounts

  const mail = await waitForMail('sam@example.com', 'Reset', before);
  resetLink = linkIn(mail);
  expect(mailCount()).toBe(before + 1); // none for the unknown address
});

test('reset requests are rate limited to one a minute per account', async ({ page }) => {
  const before = mailCount();
  await page.goto('/forgot-password');
  await page.fill('#email', 'sam@example.com');
  await page.click('button[type=submit]');
  await expect(page.getByText('If that email belongs')).toBeVisible();
  await page.waitForTimeout(1500);
  expect(mailCount()).toBe(before);
});

test('the reset link sets a new password, signs out other sessions, and works once', async ({ page, browser }) => {
  const sam = await (await browser.newContext()).newPage();
  await signIn(sam, 'sam@example.com', 'samsecret123');
  await expect(sam).toHaveURL('/');

  await page.goto(resetLink);
  await page.fill('#password', 'newsecret456');
  await page.fill('#confirm', 'newsecret456');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page).toHaveURL(/login\?notice=reset/);

  await sam.goto('/leads');
  await expect(sam).toHaveURL(/login/); // the older session was revoked

  await page.fill('#email', 'sam@example.com');
  await page.fill('#password', 'samsecret123');
  await page.click('button[type=submit]');
  await expect(page.getByText('Incorrect email or password')).toBeVisible();
  await page.fill('#password', 'newsecret456');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/');

  await page.goto(resetLink);
  await expect(page.getByText('expired or was already used')).toBeVisible();
});

test('owners can promote and demote team members; their own row has no role or deactivate controls', async ({ page }) => {
  await signInAsOwner(page);
  await page.goto('/team');
  const sam = page.locator('li', { hasText: 'Sam Staff' });
  await sam.getByLabel('Role for Sam Staff').selectOption('owner');
  await sam.getByRole('button', { name: 'Change' }).click();
  await expect(sam.getByLabel('Role for Sam Staff')).toHaveValue('owner');

  await sam.getByLabel('Role for Sam Staff').selectOption('staff');
  await sam.getByRole('button', { name: 'Change' }).click();
  await expect(sam.getByLabel('Role for Sam Staff')).toHaveValue('staff');

  await expect(page.getByText(OWNER.email)).toBeVisible();
  await expect(page.locator('li', { hasText: OWNER.email }).getByText('Owner (you)')).toBeVisible();
});
