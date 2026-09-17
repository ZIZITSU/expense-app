# Deploy on Vercel

The app now has a native Next.js deployment for Vercel. `vercel.json` selects `npm run build:vercel` and `.vercel-next`; `npm run build` also selects Next.js automatically on Vercel. Its build directory is separate from Vinext’s generated types. This fixes the missing `routes-manifest.json` error. The existing Cloudflare preview still uses Vinext.

## One-time setup

1. Create a **libSQL** database in [Turso](https://turso.tech/). Get its database URL and a database auth token. Use a libSQL database, matching `@libsql/client` and the existing SQLite ledger. With the Turso CLI, use `turso db create simple-expenses` (omit `--tursodb`). Then run `turso db show simple-expenses --url` and `turso db tokens create simple-expenses` to obtain the two connection values. See the [official quickstart](https://docs.turso.tech/quickstart).
2. In **Vercel → Project Settings → Environment Variables**, add these four server-side values for Production and Preview:

| Variable | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Your database URL, starting with `libsql://` |
| `TURSO_AUTH_TOKEN` | Your database auth token |
| `APP_PASSWORD` | A unique sign-in password, 16–256 characters |
| `SESSION_SECRET` | A separate random secret, at least 32 characters |

Do not prefix these names with `NEXT_PUBLIC_`. Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Keep the password and secret separate. Password changes invalidate existing sessions.

3. Update the repository with these source changes, including `package-lock.json` and `vercel.json`. Set the Vercel **Root Directory** to the folder containing this app's `package.json` (`expense-app` if the repository contains the parent folder). Use **Next.js**, **npm ci**, **npm run build:vercel**, and **.vercel-next**. The checked-in Vercel configuration provides the build settings.
4. Redeploy. Open the site and enter `APP_PASSWORD` to sign in. Database tables are created automatically. Sign-in uses signed, expiring, HttpOnly cookies and limits failed attempts; caller-supplied ChatGPT identity headers are ignored on Vercel.

Production requires a remote database. Files in a Vercel function cannot store a durable ledger. The local SQLite option is restricted to isolated local tests and rejected on Vercel.

## Keep your current entries

Before the **first sign-in** on Vercel, import a full JSON backup from **Settings → Download backup** in the current local app. Otherwise the new database initializes from the original workbook, which does not include entries added afterward.

Copy `.env.vercel.example` to `.env.vercel.local`, fill in your Turso URL and token, and run:

```sh
npm run import:vercel -- --file "path/to/simple-expenses-backup.json"
```

This imports IDs, versions, debt repayments, transfers and deleted entries in one transaction. It refuses to overwrite a nonempty ledger. It also saves a migration backup. Never commit `.env.vercel.local` or ledger backups. This script sends the selected backup only to the Turso database URL you configure; review that URL before running it.

For a Vercel-style local preview, add the four environment values to `.env.local` and use `npm run dev:vercel`. The existing `npm run dev` preview continues to use the current local Cloudflare database.

References: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build), [Turso TypeScript client and transactions](https://docs.turso.tech/sdk/ts/reference), [Turso quickstart](https://docs.turso.tech/quickstart).
