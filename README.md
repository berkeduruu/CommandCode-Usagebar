# CommandCode GOAT Usagebar

![CommandCode GOAT Usagebar icon](https://raw.githubusercontent.com/berkeduruu/commandcode-usagebar/main/images/icon.png)

Displays CommandCode GOAT usage in the Cursor and VS Code status bars, with a detailed dashboard.

The status bar shows the three limits in this order:

`5h 72% ●●●●●●●○○○   7d 45% ●●●●○○○○○○   Mo 25% ●●○○○○○○○○`

- `5h`: five-hour limit
- `7d`: weekly limit
- `Mo`: total monthly limit

Click the status bar to open quota cards, model usage, plan spend, charts, and usage history.

## Screenshots

### Status bar

![CommandCode GOAT status bar](https://raw.githubusercontent.com/berkeduruu/commandcode-usagebar/main/images/status-bar.png)

### Dashboard overview

![CommandCode GOAT dashboard overview](https://raw.githubusercontent.com/berkeduruu/commandcode-usagebar/main/images/dashboard.png)

### Usage analytics

![CommandCode GOAT usage analytics](https://raw.githubusercontent.com/berkeduruu/commandcode-usagebar/main/images/analytics.png)

### Usage history

![CommandCode GOAT usage history](https://raw.githubusercontent.com/berkeduruu/commandcode-usagebar/main/images/history.png)

## Installation

### Install from a VSIX

1. Open Cursor or VS Code.
2. Press `Ctrl+Shift+P`.
3. Run **Extensions: Install from VSIX...**.
4. Select `commandcode-goat-usagebar-*.vsix` from this project folder.
5. Select **Reload** when prompted.

Example release file:

`commandcode-goat-usagebar-0.1.7.vsix`

The extension is currently intended to be installed from a VSIX rather than from a marketplace.

## First run

If you are already logged in with `cmd login`, you do not need to log in again. The extension checks these sources automatically:

1. `COMMAND_CODE_API_KEY` or `COMMAND_CODE_SESSION_COOKIE`
2. An API key or Studio session cookie saved in VS Code SecretStorage
3. `~/.commandcode/auth.json`

If the status bar does not show usage:

1. Open the Command Palette with `Ctrl+Shift+P`.
2. Run **CommandCode Usagebar: Refresh**.
3. If you see the key icon, run **CommandCode Usagebar: Set API Key**.

To provide an API key through the terminal:

```bash
export COMMAND_CODE_API_KEY="user_..."
```

Start Cursor from that terminal so the extension can read the environment variable.

## Charts and usage history

Quota percentages can work with an API key or a Studio session cookie. Model history and charts use CommandCode Studio’s detailed usage endpoints. Some accounts require a browser session cookie for these endpoints.

If the charts are empty:

1. Open CommandCode Studio → **Usage** in a logged-in browser.
2. Open `F12` → **Network** → select `Fetch/XHR`.
3. Reload the page.
4. Select the `usage?limit=10` request.
5. Copy **Headers → Request Headers → Cookie**.
6. In Cursor, run **CommandCode Usagebar: Set Studio Session Cookie** and paste the value.
7. Close and reopen the dashboard, then run **Refresh**.

Never share your cookie. The extension stores it in VS Code SecretStorage and does not write it to logs. If the cookie expires, repeat the same process. You can also provide it through the environment:

```bash
export COMMAND_CODE_SESSION_COOKIE="..."
```

Use **CommandCode Usagebar: Clear Studio Session Cookie** to remove the saved cookie, or **CommandCode Usagebar: Clear Saved API Key** to remove the saved API key.

## Dashboard contents

- Five-hour, weekly, and monthly quota cards displayed vertically
- Per-model request count, token count, actual API cost, and GOAT plan spend
- Daily plan-spend chart for the selected date range
- Daily token chart grouped by model
- Usage history at the bottom

Available date ranges: `1d`, `7d`, `30d`, and `Custom`.

The status-bar hover table shows each recent model, its total tokens, and the UTC timestamp.

## Troubleshooting

### The status bar shows a key icon

The extension did not find a credential. Reload Cursor after `cmd login`, or run **CommandCode Usagebar: Set API Key**.

### Quotas are visible but the charts are empty

The quota endpoint is working, but the detailed Studio endpoint may require a session cookie. Follow the session-cookie steps above.

### The data looks stale

CommandCode’s detailed usage endpoint is internal, so short delays or missing records are possible. Run **Refresh** in the dashboard. Increase `commandCodeUsage.historyLimit` to request more records for larger date ranges.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Create a VSIX:

```bash
npm run package
```

Chart.js is bundled locally, so charts do not require CDN access. Release packages omit source maps and include only the runtime bundle, chart library, manifest, README, and license. Chart.js is distributed under the MIT license.

## Data sources

- `GET https://api.commandcode.ai/alpha/billing/credits` — live quota data with an API key
- `GET https://api.commandcode.ai/internal/billing/credits` — Studio quota fallback
- `GET https://api.commandcode.ai/internal/usage/summary` — period summary
- `GET https://api.commandcode.ai/internal/usage?limit=...` — model and usage history

The `internal` endpoints are undocumented and may change. Endpoint and response normalization is isolated in one adapter layer.

## License

MIT
