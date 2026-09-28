<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Writing style

- Never use em-dashes or en-dashes (— –) in code, comments, or user-facing text. Use a plain hyphen "-" or restructure the sentence.

# Google sign-in configuration is frozen

Read the mobile repo's `GOOGLE-SIGNIN-RULES.md` (sahakari-sip-mobile)
BEFORE touching `AUTH_GOOGLE_ID`, the google-native route audiences, or
Cloud Console OAuth clients. Only the **Web application** client
(`416335590615-e96du...`) may be used as `AUTH_GOOGLE_ID` /
`serverClientId`. Android client IDs (`7qms...`, `f111...`) in those
spots broke mobile Google sign-in for two days (Sep 26-28, 2026).

- `next_auth.users` has NO `email_verified` column - it is
  `emailVerified` (camelCase). The google-native route once crashed on
  this for every new Google user.
- Vercel deploy command: `npx vercel --prod --project expense-calculator
  --scope rezas-projects-f4562f6a` (the Vercel project is named
  `expense-calculator`; its production URL is sahakari-sip.vercel.app).
- Never print or commit secrets: `.env`, `.env.local`, service-role
  keys, VAPID private keys. They are gitignored - keep it that way.
