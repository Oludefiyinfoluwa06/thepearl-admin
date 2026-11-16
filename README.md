# The Pearl Travel and Tours: admin dashboard

Internal dashboard for the team: sign in with roles (owner, staff), capture and track inquiries, log free
consultations, keep client profiles with a timeline, and open cases.

Built with Next.js (App Router, Cache Components), Tailwind, and MongoDB Atlas. Branding matches the public
website (`../tptt`).

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

On first start the owner account is created from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`. After that, owners
invite team members from **Team**: they get an email and choose their own password. "Forgot your password?" on the
sign-in page sends a one-hour reset link.

### Environment

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI`, `MONGODB_DB` | Atlas connection string and database name |
| `ADMIN_SEED_*` | First owner (used only while there are no users) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Outgoing email (invitations, resets) |
| `APP_URL` | Public URL used in emailed links (falls back to the request host) |
| `INTAKE_API_KEY` | Shared secret the website sends to `POST /api/intake/website` |
| `DNS_SERVERS` | Optional, e.g. `8.8.8.8,1.1.1.1`. Only if `mongodb+srv` lookups fail on your network |

If SMTP is not configured, inviting someone still works: the app shows the invitation link so you can share it by hand.

### Website → dashboard

The website's contact form (`tptt`) posts each enquiry to `POST /api/intake/website` with the header
`x-intake-key: <INTAKE_API_KEY>`. Set `ADMIN_INTAKE_URL` and `ADMIN_INTAKE_KEY` in the website's environment.

## Rules worth knowing

- A lead can be logged without an email. A **case cannot be opened** until the client has a valid email; the case
  screen asks for it, checks the format, and warns if another client already uses it. This is enforced in
  `lib/clients.ts` and again by a MongoDB validator on the `clients` collection.
- One client can have many cases. Each case has a status and a note history.
- Owners can delete an inquiry that never became a client; clients are never deleted.

## Tests

End-to-end tests (Playwright) run the real app against a throwaway database, `tptt-admin-e2e`, which is wiped at the
start of each run, with a fake SMTP server to capture emails. They use your installed Chrome.

```bash
npm run test:e2e
```

They need `MONGODB_URI` (from `.env.local`). They refuse to touch any database that is not the `-e2e` one.

## Branches

`master` is production, `develop` is test; work happens on feature branches merged into `develop`.
