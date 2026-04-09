# Browser Extension

Chrome extension package for LinkedIn Automation.

## What it does now

- Extension install is free.
- Actions are credit-based (server-side wallet).
- When credits are exhausted, extension receives redirect URL and sends user to pricing page.
- Stores API base URL + dashboard email in extension local storage.
- Logs in by email and auto-starts extension session.
- Shows usage status (credits + profile search daily usage/remaining).
- Supports profile search / quick comment / relevance badge / save lead actions.
- Shows feed monitor as webapp-only when policy blocks extension use.
- Applies profile search daily limit from admin policy.
- Quick links to dashboard and pricing page.

## Load in Chrome

1. Download extension zip from public extension repo:
	`https://raw.githubusercontent.com/SanketHarde7/linkedin-automation-extension/master/browser_extension_package.zip`
2. Extract zip.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Click `Load unpacked`.
6. Select extracted folder that contains `manifest.json`.

## Frontend Entry (Free Flow)

- Open extension setup page from landing CTA:
	- `/extension.html`
- This page provides:
	- extension-only zip download,
	- `chrome://extensions` instructions.

## Usage

1. Open extension popup.
2. Set API base, default: `https://linkedin-automation-8tng.onrender.com/api`.
3. Enter dashboard email.
4. Click `Save`.
5. Click `Login & Start`.
6. Use `Refresh Usage` to see limits.
7. Use `Check Action` and `Run Action`.

## Next planned scope

- Add command actions for local agent.
- Add usage history in popup.
