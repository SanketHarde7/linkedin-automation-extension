# Browser Extension (Starter)

This is a minimal Chrome extension starter for LinkedIn Automation.

## What it does now

- Extension install is free.
- Actions are credit-based (server-side wallet).
- When credits are exhausted, extension receives redirect URL and sends user to pricing page.
- Stores API base URL and dashboard bearer token in extension local storage.
- Starts extension session and receives scoped extension token.
- Checks extension action credit cost.
- Consumes extension credits for quick comment draft action.
- Checks `/license/status` from popup.
- Quick links to dashboard and pricing page.

## Load in Chrome

1. Download extension-only zip:
	`https://raw.githubusercontent.com/SanketHarde7/linkedin-automation/master/browser_extension_package.zip`
2. Extract zip.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Click `Load unpacked`.
6. Select extracted folder that contains `manifest.json`.

Important:
Do not select full repo root like `linkedin-automation-master` in Load Unpacked.

## Frontend Entry (Free Flow)

- Open extension setup page from landing CTA:
	- `/extension.html`
- This page provides:
	- extension-only zip download,
	- `chrome://extensions` instructions.

## Usage

1. Open extension popup.
2. Set API base, default: `https://linkedin-automation-8tng.onrender.com/api`.
3. Paste dashboard `app_auth_token`.
4. Click `Save`.
5. Click `Check License`.
6. Click `Start Extension Session`.
7. Use `Check Draft Cost` and `Consume Draft Credit`.

## Next planned scope

- Add login flow to fetch token from API directly.
- Add start/stop command actions for local agent.
- Add simple history of recent checks.
