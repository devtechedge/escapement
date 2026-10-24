# ESCAPEMENT

A watchmaker's bench in the browser. Assemble a mechanical movement, wind the mainspring, turn the regulator, diagnose a fault, and earn a bench certificate.

Silent by design. Deterministic horology. No account, no backend, no network requests after load.

**Live:** [escapement-two.vercel.app](https://escapement-two.vercel.app)

![ESCAPEMENT, the School calibre on a watchmaker's bench](docs/screenshot.png)

## The bench

- **School** is a slow 18,000 vph lever movement. It runs, but the regulator is set fast. Eight notches bring it back.
- **Pocket** is a 21,600 vph pocket movement with a worn fourth pivot. The rate is far out, the amplitude is low, and the evidence is under the raking light.
- **Marine** is a clean 28,800 vph movement with no wind and no certificate. Wind it, test it, regulate it, certify it.

New builds can start clean or with one of five seeded conditions: a magnetized hairspring, a worn pivot, a set mainspring, a beat error, or a loose cannon pinion.

## What you can do

- Inspect an isometric SVG movement. Select any wheel, lift the movement into an exploded view, and move the raking light across the plate.
- Fit wheels and pinions from the spares cabinet. Center to fourth must stay 60:1. The escape wheel must agree with the nominal beat. Break either and the movement stops, with the break shown in the train schematic.
- Turn the regulator one notch at a time. Each notch is four seconds per day.
- Drag the crown or press Wind. Six mainspring turns give sixty hours of reserve.
- Run the timing stand. It spins the movement through 24 simulated hours in 12 seconds, draws a rate trace on paper, and reports rate, amplitude, and beat error. The test consumes 24 hours of reserve.
- Repair the cause, not the symptom. Each fault has a physical fix in the cabinet.
- Earn a bench certificate when the measured rate is within plus or minus ten seconds per day, the amplitude is 250 to 320 degrees, and the beat error is under 0.5 milliseconds.
- Export the calibre passport as SVG, the build as JSON, and import a build back.

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

- Vite 7, React 19, TypeScript strict.
- Self-hosted Bodoni Moda, Public Sans, and DM Mono through Fontsource. No external assets.
- SVG movement and rate trace, CSS materials, no Canvas.
- Vitest for the horology, Playwright for the bench.
- No backend, accounts, analytics, state library, UI kit, or runtime network calls.

## Run locally

```bash
npm install
npm run dev
```

Production preview:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4391
```

The end-to-end suite uses port 4391. Keep it unique: another project's preview on the same port will silently serve the wrong app.

```bash
npm test
npm run e2e
```

## Verification

- Typecheck, ESLint, 19 unit tests, and 7 Playwright tests are green.
- Lighthouse on the production build: **97 performance desktop, 93 mobile, 100 accessibility, 100 best practices, 100 SEO**.
- No console errors, no external requests after load, and no horizontal scroll at 390 px.
- CI runs typecheck, lint, unit tests, the production build, and Playwright; Dependabot tracks patch and minor updates.

## Limits

- The movement is a model. It is not a certified chronometer, and the certificate is a bench artefact, not an official rating.
- The calibre passport SVG uses the same font families but does not embed them; an external viewer may fall back to system fonts.
- The reserve drains while the page is closed, capped at empty. A long absence stops the movement; it never damages it.
- The test consumes 24 hours of reserve. Wind before testing.

## License

MIT. See [LICENSE](LICENSE). Font families are licensed under the SIL Open Font License; see [LICENSES.md](LICENSES.md).
