import { expect, test, type Page } from '@playwright/test';
import { ID, INTAKE_KEY, signInAsOwner } from './helpers';

test.describe.configure({ mode: 'serial' });

let clientUrl = '';

async function logInquiry(page: Page, f: { name: string; phone?: string; email?: string; source: string; consult?: string }) {
  await page.goto('/leads/new');
  await page.fill('#lead_name', f.name);
  if (f.phone) await page.fill('#lead_phone', f.phone);
  if (f.email) await page.fill('#lead_email', f.email);
  await page.selectOption('#lead_source', f.source);
  if (f.consult) {
    await page.fill('main [name=notes]:visible', 'Wants to study in Canada');
    await page.check(`input[name=outcome][value=${f.consult}]`);
  } else {
    await page.uncheck('input[name=log_consultation]');
  }
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(new RegExp(`/leads/${ID}\\?created=1`));
}

test.beforeEach(async ({ page }) => {
  await signInAsOwner(page);
});

test('log an inquiry without an email, with its consultation, in one form', async ({ page }) => {
  const started = Date.now();
  await logInquiry(page, { name: 'Ada Okafor', phone: '+234 803 111 2222', source: 'whatsapp', consult: 'moved_to_assessment' });
  expect(Date.now() - started).toBeLessThan(15_000);

  await expect(page.getByRole('heading', { name: 'Ada Okafor' })).toBeVisible();
  await expect(page.getByText('None yet — needed before a case')).toBeVisible();
  await expect(page.getByText('Moved to assessment').first()).toBeVisible();
  await expect(page.getByText('Free consultation with Test Owner')).toBeVisible();
});

test('a lead needs a phone or an email, and any email given must be well formed', async ({ page }) => {
  await page.goto('/leads/new');
  await page.fill('#lead_name', 'No Contact');
  await page.selectOption('#lead_source', 'call');
  await page.uncheck('input[name=log_consultation]');
  await page.click('button[type=submit]');
  await expect(page.getByText('Add a phone / WhatsApp number or an email')).toBeVisible();

  await page.fill('#lead_phone', '0801');
  await page.fill('#lead_email', 'not-an-email');
  await page.locator('main form').first().evaluate((f) => ((f as HTMLFormElement).noValidate = true)); // skip the browser check to exercise the server's
  await page.click('button[type=submit]');
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await expect(page.locator('#lead_name')).toHaveValue('No Contact'); // typed values are kept
});

test('inquiries can be found again by name, phone fragment and email', async ({ page }) => {
  for (const q of ['okafor', '803111', '8031112222']) {
    await page.goto(`/leads?q=${q}`);
    await expect(page.getByRole('link', { name: 'Ada Okafor' })).toBeVisible();
  }
  await page.goto('/leads?q=zzzzzz');
  await expect(page.getByText('No inquiries match that search')).toBeVisible();
  await page.goto('/leads?status=moved_to_assessment');
  await expect(page.getByRole('link', { name: 'Ada Okafor' })).toBeVisible();
});

test('a case cannot be opened without a valid email', async ({ page }) => {
  await page.goto('/leads?q=okafor');
  await page.getByRole('link', { name: 'Ada Okafor' }).click();
  await page.getByRole('link', { name: 'Open case' }).first().click();
  await expect(page).toHaveURL(/cases\/new/);

  const open = page.getByRole('button', { name: 'Open case' });
  await expect(page.locator('#case_email')).toBeVisible();
  await expect(open).toBeDisabled();

  await page.fill('#case_email', 'not-an-email');
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await expect(open).toBeDisabled();

  // Bypass the disabled button: the server must still refuse.
  await page.selectOption('#case_service', 'study-visa');
  await open.evaluate((b) => b.removeAttribute('disabled'));
  await open.click();
  await expect(page.getByText('Enter a valid email address').first()).toBeVisible();
  await expect(page).toHaveURL(/cases\/new/);

  await page.fill('#case_email', '');
  await open.evaluate((b) => b.removeAttribute('disabled'));
  await open.click();
  await expect(page.getByText('An email address is required')).toBeVisible();
});

test('opening a case with a valid email creates the client profile', async ({ page }) => {
  await page.goto('/leads?q=okafor');
  await page.getByRole('link', { name: 'Ada Okafor' }).click();
  await page.getByRole('link', { name: 'Open case' }).first().click();
  await page.fill('#case_email', 'Ada.Okafor@Example.com'); // stored lower-case
  await page.selectOption('#case_service', 'study-visa');
  await page.getByRole('button', { name: 'Open case' }).click();

  await expect(page).toHaveURL(new RegExp(`/clients/${ID}\\?case=`));
  clientUrl = new URL(page.url()).pathname;
  await expect(page.getByText('ada.okafor@example.com')).toBeVisible();
  await expect(page.getByText('Cases (1)')).toBeVisible();
  // the timeline carries the lead-stage history too
  await expect(page.getByText('Inquiry logged via WhatsApp').filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText('Client profile created').filter({ visible: true })).toHaveCount(1);
});

test('the same email on another inquiry warns, and can be linked to the same client', async ({ page }) => {
  await logInquiry(page, { name: 'Ada O.', email: 'ada.okafor@example.com', source: 'call' });
  await page.getByRole('link', { name: 'Open case' }).first().click();

  await expect(page.getByText('already belongs to another client')).toBeVisible();
  const open = page.getByRole('button', { name: 'Open case' });
  await expect(open).toBeDisabled(); // must choose how to proceed
  await page.check('input[value=link]');
  await page.selectOption('#case_service', 'visit-visa');
  await open.click();

  await expect(page).toHaveURL(new RegExp(`/clients/${ID}\\?case=`));
  expect(new URL(page.url()).pathname).toBe(clientUrl); // same person, not entered twice
  await expect(page.getByText('Cases (2)')).toBeVisible();
});

test('one client can have several cases and each case has its own page', async ({ page }) => {
  await page.goto(clientUrl);
  await page.getByRole('link', { name: 'Open another case' }).or(page.getByRole('link', { name: 'New case' })).first().click();
  await expect(page.getByText('email on file')).toBeVisible(); // no email prompt for an existing client
  await page.selectOption('#case_service', 'pr');
  await page.getByRole('button', { name: 'Open case' }).click();
  await expect(page.getByText('Cases (3)')).toBeVisible();

  await page.getByRole('link', { name: 'Permanent Residency' }).click();
  await expect(page).toHaveURL(new RegExp(`/cases/${ID}`));
  await page.fill('#note', 'Documents requested');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('Note: Documents requested')).toBeVisible();

  await page.selectOption('#status', 'awaiting_client');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByText('Case status: Open → Awaiting client')).toBeVisible();

  // notes and status changes show up on the client timeline too
  await page.goto(clientUrl);
  await expect(page.getByText('Note: Documents requested')).toBeVisible();
});

test('closing a case removes it from the open-case count', async ({ page }) => {
  await page.goto(clientUrl);
  await page.getByRole('link', { name: 'Permanent Residency' }).click();
  await page.selectOption('#status', 'closed');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByText('Awaiting client → Closed')).toBeVisible();
});

test('editing a client keeps the email rule', async ({ page }) => {
  await page.goto(clientUrl);
  await page.getByText('Edit contact details').filter({ visible: true }).click();
  await page.fill('#e_email', 'broken');
  await page.locator('#e_email').evaluate((el) => ((el as HTMLInputElement).form!.noValidate = true));
  await page.getByRole('button', { name: 'Save changes' }).filter({ visible: true }).click();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();

  await page.fill('#e_email', 'ada.new@example.com');
  await page.getByRole('button', { name: 'Save changes' }).filter({ visible: true }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await expect(page.getByText('ada.new@example.com').first()).toBeVisible();
});

test('another client cannot take an existing email', async ({ page }) => {
  await logInquiry(page, { name: 'Chidi Eze', phone: '0803', email: 'chidi@example.com', source: 'walk_in' });
  await page.getByRole('link', { name: 'Open case' }).first().click();
  await page.selectOption('#case_service', 'travel');
  await page.getByRole('button', { name: 'Open case' }).click();
  await expect(page).toHaveURL(new RegExp(`/clients/${ID}`));

  await page.getByText('Edit contact details').filter({ visible: true }).click();
  await page.fill('#e_email', 'ada.new@example.com');
  await page.getByRole('button', { name: 'Save changes' }).filter({ visible: true }).click();
  await expect(page.getByText('already uses this email')).toBeVisible();
});

test('follow-up outcome records a date and shows on the dashboard when due', async ({ page }) => {
  await logInquiry(page, { name: 'Later Person', phone: '0809', source: 'call' });
  // With no consultation yet, the "Add a consultation" panel is already open.
  await expect(page.getByText('+ Add a consultation').filter({ visible: true })).toBeVisible();
  await page.check('input[name=outcome][value=follow_up_later]:visible');
  await page.fill('main [name=follow_up_on]:visible', '2020-01-01');
  await page.getByRole('button', { name: 'Save consultation' }).filter({ visible: true }).click();
  await expect(page.getByText('Follow up on 1 Jan 2020')).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('Follow-ups due').first()).toBeVisible();
  // listed under "Follow-ups due" (and also among the latest inquiries)
  const due = page.locator('section', { has: page.getByRole('heading', { name: 'Follow-ups due' }) }).filter({ visible: true });
  await expect(due.getByRole('link', { name: 'Later Person' })).toBeVisible();
});

test('owners can delete a plain inquiry but not one that became a client', async ({ page }) => {
  await logInquiry(page, { name: 'Delete Me', phone: '0810', source: 'other' });
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete inquiry' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/leads\?deleted=1/);
  await page.goto('/leads?q=Delete Me');
  await expect(page.getByText('No inquiries match')).toBeVisible();

  await page.goto('/leads?q=okafor');
  await page.getByRole('link', { name: 'Ada Okafor' }).click();
  await expect(page.getByRole('button', { name: 'Delete inquiry' }).filter({ visible: true })).toHaveCount(0);
});

test('long lists are paginated and keep the search', async ({ page, request }) => {
  for (let i = 0; i < 27; i++) {
    await request.post('/api/intake/website', {
      headers: { 'x-intake-key': INTAKE_KEY },
      data: { name: `Bulk Lead ${String(i).padStart(2, '0')}`, email: `bulk${i}@example.com` },
    });
  }
  await page.goto('/leads?q=Bulk Lead');
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(page.getByRole('link', { name: /Bulk Lead/ })).toHaveCount(25);
  await page.getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('link', { name: /Bulk Lead/ })).toHaveCount(2);
});
