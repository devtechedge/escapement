# ESCAPEMENT

A watchmaker's bench in the browser. Assemble a mechanical movement, wind the mainspring, turn the regulator, diagnose a fault, and earn a bench certificate.

Silent by design. Deterministic horology. No account, no backend, no network requests after load.

This is not another dashboard or CRUD demo. Every wheel drives real train arithmetic, every fault has a physical symptom and a physical fix, and the certificate is recomputed from the current build rather than stored as a claim.

[![Live Demo](https://img.shields.io/badge/live-escapement--two.vercel.app-9e1a32)](https://escapement-two.vercel.app)
[![CI](https://github.com/devtechedge/escapement/actions/workflows/ci.yml/badge.svg)](https://github.com/devtechedge/escapement/actions/workflows/ci.yml)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-9e7a43)](LICENSE)

## Live Demo

**https://escapement-two.vercel.app**

> Client-side only. The bench, saved calibres, and test history live in your browser. No account, no backend, no network after load.

## Screenshots

![The School calibre on the day bench](docs/screenshots/01-bench.png)

![The School calibre certified, with a measured rate trace](docs/screenshots/02-certified.png)

![The Pocket calibre with its fourth wheel missing and a worn pivot](docs/screenshots/03-pocket.png)

![The bench at night with the lamp toggle](docs/screenshots/04-night.png)

<img src="docs/screenshots/05-mobile.png" alt="The bench at phone width" width="320" />

## The bench

- **School** is a slow 18,000 vph lever movement. It runs, but the regulator is set fast. Eight notches bring it back.
- **Pocket** is a 21,600 vph pocket movement, partly apart. The fourth wheel sits in the spares tray and its pivot is worn. Fit the wheel, then replace the pivot, and the train is complete again.
- **Marine** is a clean 28,800 vph movement with no wind and no certificate. Wind it, test it, regulate it, certify it.

New builds can start clean or with one of five seeded conditions: a magnetized hairspring, a worn pivot, a set mainspring, a beat error, or a loose cannon pinion.

## What you can do

- Inspect an isometric SVG movement. Select any wheel, lift the movement into an exploded view, and move the raking light across the plate.
- Fit wheels and pinions from the spares cabinet. Center to fourth must stay 60:1. The escape wheel must agree with the nominal beat. Break either and the movement stops, with the break shown in the train schematic.
- Turn the regulator one notch at a time. Each notch is four seconds per day.
- Drag the crown or press Wind. Six mainspring turns give sixty hours of reserve.
- Run the timing stand. It spins the movement through 24 simulated hours in 12 seconds, draws a rate trace on paper, and reports rate, amplitude, and beat error. The test consumes 24 hours of reserve.
- Repair the cause, not the symptom. Each fault has a physical fix in the cabinet. A worn pivot shows as a discolored pivot, a beat error as an offset impulse pin and uneven ticks, and a loose cannon pinion as slipping hands.
- Earn a bench certificate when the movement is running and the current rate is within plus or minus ten seconds per day, the amplitude is 250 to 320 degrees, and the beat error is under 0.5 milliseconds. Stopping the movement, winding it, or moving the regulator out of tolerance withdraws the certificate.
- Save builds to the calibre shelf, then load, rename, duplicate, or delete them. Switching calibres saves the current bench first. The shelf has its own IndexedDB store with a localStorage fallback.
- Export the calibre passport as SVG, the build as JSON, and import a build back. Imported measurements are discarded, so a hand-edited file cannot mint a certificate.
- Copy a share link that restores the parts, regulator, condition, name, and theme in the URL hash.
- Switch the bench between day and night with the lamp toggle or the L key.

Everything stays in this browser. The bench persists to IndexedDB with a localStorage fallback.

## Controls

| Input | Action |
| --- | --- |
| Click a wheel | Inspect it in the cabinet |
| Drag the crown | Wind; one full turn per revolution |
| Regulator notches | Four seconds per day per notch |
| `R` | Raking light on or off |
| `E` | Exploded movement |
| `W` | Wind one turn |
| `T` | Run the timing test |
| `C` | Go to the calibre passport |
| `S` | Open the calibre shelf |
| `L` | Switch between day and night |
| `Space` | Start or stop the movement |
| `?` | Bench note and model limits |
| `Escape` | Close the bench note |

## The model

The arithmetic is real, not decorative.

- Center to fourth is `(center teeth / third pinion) × (third teeth / fourth pinion)`, and the app requires 60:1.
- Escape wheel rate is `2 × escape teeth × fourth wheel revolutions per hour × (fourth teeth / escape pinion)`. It must match the nominal balance frequency.
- Reserve is `mainspring turns × barrel teeth / center pinion leaves`.
- Rate is the regulator position, temperature drift, isochronism across the reserve, and the seeded condition.
- Amplitude and beat error are deterministic functions of the parts, winding, temperature, and condition.

No runtime randomness. The same build and the same actions always give the same result. The three starting calibres are fixed, so two visitors can compare notes.

This is a teaching model, not a certified chronometer. The rate, amplitude, and beat error are illustrative but calibrated to plausible watchmaking behaviour.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vite 7, React 19, TypeScript strict |
| Movement | Generated SVG, CSS materials |
| Simulation | Pure TypeScript horology |
| State | React state, IndexedDB schema v2 with localStorage fallback |
| Fonts | Self-hosted Bodoni Moda, Public Sans, DM Mono |
| Tests | Vitest and Playwright |
| Host | Vercel static |

## Run locally

```bash
npm install
npm run dev
```

Production preview:

```bash
npm run build
npm run preview
```

Tests:

```bash
npm test
npm run e2e
```

## Verification

- Typecheck, ESLint, **81 unit tests**, and **21 Playwright tests** are green.
- Axe reports no WCAG A or AA violations on the day bench, night bench, help dialog, shelf dialog, or the partly assembled Pocket.
- Lighthouse on the live production alias, median of three runs: **100 performance desktop, 99 mobile, 100 accessibility, 100 best practices, 100 SEO**.
- No console errors, no external requests after load, and no horizontal scroll from 390 to 1920 px. The layout remains usable at a 200 percent zoom equivalent.
- The social preview is 1280 by 640 and under 1 MB.
- CI runs production audit, typecheck, lint, unit tests, the production build, and Playwright on Node 22. Dependabot groups weekly patch and minor updates, with no auto-merge.

## Limits

- The movement is a model. It is not a certified chronometer, and the certificate is a bench artefact, not an official rating.
- The calibre passport SVG uses the same font families but does not embed them; an external viewer may fall back to system fonts.
- The reserve drains while the page is closed. The movement keeps running through an absence while reserve remains, then stops when reserve is exhausted. It never damages the movement.
- The test consumes 24 hours of reserve and reports the state at the end of the test. Wind before testing, especially if the starting reserve is close to 24 hours.

## License

MIT. See [LICENSE](LICENSE). Font families are licensed under the SIL Open Font License; see [LICENSES.md](LICENSES.md).
