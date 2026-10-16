# Hybrid 22 Sales Power Board

Office TV board. Every new membership sold in Mindbody triggers a power-up celebration with its contract value.
Hitting $9,000 in a week turns his hair blue and plays the goal visual. Every $15,000 in a month plays the boss fight.

## How it works

```
Mindbody ──webhook──▶ /api/mindbody ──▶ Netlify Blobs ◀── /api/sales ◀── TV (checks every 20s)
            hourly safety-net check ──┘
```

* `src/board.html` is the board (the same file as the Claude preview). The build turns it into `public/index.html` in live mode.
* `netlify/functions/lib/config.mjs` decides **what counts as a sale and what it's worth**. Edit this when your Mindbody pricing options are set up.
* Webhooks are free (not metered). The hourly check and name lookups use a handful of metered API calls a day.

## One-time setup

### 1. Netlify
1. Netlify → **Add new site → Import an existing project → GitHub** → pick `hybrid22-sales-board`.
2. Build settings are read from `netlify.toml`. Just click **Deploy**.
3. **Site configuration → Environment variables**, add:

| Variable | Where it comes from |
|---|---|
| `MB_API_KEY` | Mindbody developer portal → API Keys |
| `MB_SITE_ID` | `-99` for the sandbox, your real Site ID after go-live |
| `MB_STAFF_USERNAME` / `MB_STAFF_PASSWORD` | A Mindbody staff login (sandbox: `mindbodysandboxsite@gmail.com` / `Apitest1234`) |
| `ADMIN_KEY` | Make up a long random password. It protects the admin links below |
| `MB_WEBHOOK_SIGNATURE_KEY` | Added in step 2 |

4. **Deploys → Trigger deploy** so the variables take effect.

### 2. Connect Mindbody webhooks
Open `https://YOUR-SITE.netlify.app/api/admin/setup-webhook?key=YOUR_ADMIN_KEY`.
It returns a `messageSignatureKey`. **Copy it into Netlify as `MB_WEBHOOK_SIGNATURE_KEY` and redeploy.** Mindbody only shows it once.

### 3. The TV
Open `https://YOUR-SITE.netlify.app/` on the office TV. Add `#setup` to the end to see the test buttons and sound loaders.

## Admin links (add `?key=YOUR_ADMIN_KEY`)

| Link | Does |
|---|---|
| `/api/admin/status` | Shows which settings are present, this month's total, last webhook time |
| `/api/admin/test-sale?value=3120&name=Theo` | Adds a test sale (shows on the TV in ~30s) |
| `/api/admin/clear-tests` | Removes all test sales |
| `/api/admin/unmatched` | Item names Mindbody sent that didn't match `config.mjs` (add them!) |
| `/api/admin/raw` | Last 30 raw webhook payloads, for troubleshooting |
| `/api/admin/backfill?hours=24` | Runs the safety-net check now |
| `/api/admin/subscriptions` | Lists Mindbody webhook subscriptions |

## Go-live switch (Momence → Mindbody day)
1. Mindbody approves live access, then request the activation code for Hybrid 22's site and approve it as owner.
2. Change `MB_SITE_ID` and the staff login to the real ones, redeploy.
3. Run `setup-webhook` again for the live site and update `MB_WEBHOOK_SIGNATURE_KEY`.
4. Run `test-sale`, check the TV, then `clear-tests`.
