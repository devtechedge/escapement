# Security

ESCAPEMENT is a static, client-side application. It has no backend, no accounts, no cookies, no sessions, no payments, no CORS surface, and no server-side data store. The production build makes no network requests after the initial document and local assets load.

## Reporting

If you find a security issue, use GitHub's private vulnerability reporting for this repository instead of opening a public issue. Include the affected build or commit, the browser, and a short reproduction. Do not include real personal data in a report.

## Trust boundaries

- **Local JSON import.** A calibre or shelf file is untrusted input. Every field is validated against fixed wheel, pinion, socket, fixture, temperature, and log enums. Names, log text, and signatures are length bounded. Imported measurements and their `certified` flags are discarded. A certificate is recomputed from the current regulation, the current reserve, and the running state.
- **Share links.** A `#build=` hash is untrusted input. The payload is size limited by the fields it carries, decoded defensively, and passed through the same calibre validator. Unknown fixtures, wrong-socket wheels, invalid pinions, and malformed base64 are rejected. No code from the hash is evaluated.
- **Certificate integrity.** `certified` is a cache key at most. The UI trusts only `currentSignals`, which requires a matching build signature, a running movement, no seeded fault, no missing fourth wheel, positive reserve, and rate, amplitude, and beat error inside tolerance. A forged file cannot display a certificate, and stopping or winding a movement can withdraw one.
- **Name and label rendering.** Calibre names and log entries are rendered as React text nodes, never as HTML. The SVG passport exporter escapes `&`, `<`, `>`, `"`, and `'` in every user-controlled string. A name such as `<script>` appears as text, not markup.
- **Storage integrity.** The bench and shelf live only in this browser, in IndexedDB with a localStorage fallback. Anyone who can run script in the origin, or edit the browser profile, can alter local data. The app revalidates stored records on read, so a malformed record is ignored rather than trusted.
- **Supply chain.** Production dependencies are audited with `npm audit --omit=dev` in CI and the step is blocking. Development-only audit findings do not ship in the static bundle. Dependabot proposes grouped weekly patch and minor updates for review; auto-merge is disabled.

## Data handling

Nothing is transmitted to a server. Exporting writes a JSON or SVG file to the device through a temporary blob URL. There is no analytics, telemetry, advertising, remote font, or runtime fetch. The app does not request geolocation, camera, microphone, clipboard read, or notification permission. The share button writes a URL to the clipboard only after a user action.

## Supported surface

The deployed site is a static Vite build served by Vercel from `https://escapement-two.vercel.app`. The source repository is public. There is no API, admin surface, database, or privileged endpoint to report against.

## Out of scope

- Reports that require modifying a visitor's own browser storage.
- Denial-of-service reports against a static file host.
- Findings that depend on a compromised browser extension or compromised device.
