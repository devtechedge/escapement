import { useCallback, useEffect, useRef, useState } from 'react';
import { BenchLog } from './components/BenchLog';
import { BenchScene } from './components/BenchScene';
import { BrassRail } from './components/BrassRail';
import { CalibreCard } from './components/CalibreCard';
import { HelpDialog } from './components/HelpDialog';
import { PartsCabinet } from './components/PartsCabinet';
import { TimingStand, type TestRun } from './components/TimingStand';
import { buildCardSvg } from './components/cardSvg';
import type {
  BenchState,
  FaultId,
  FixtureId,
  PinionLeaves,
  SocketId,
  Temperature,
  WheelId,
} from './horology/types';
import * as bench from './state/bench';
import { loadBench, readLocalBackup, saveBench } from './state/persist';
import { parseImportPayload } from './state/validate';

const IDLE_TEST: TestRun = { active: false, startedAt: 0, duration: 0, result: null };
const THEME_KEY = 'escapement.theme';

type Theme = 'day' | 'night';

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'day' || stored === 'night') return stored;
  } catch {
    // The bench still works when storage is unavailable.
  }
  return 'day';
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const hadLocal = useRef(false);
  const [state, setState] = useState<BenchState>(() => {
    const saved = readLocalBackup();
    hadLocal.current = Boolean(saved);
    return saved ? bench.applyElapsed(saved) : bench.makeBenchState();
  });
  const [testRun, setTestRun] = useState<TestRun>(IDLE_TEST);
  const [helpOpen, setHelpOpen] = useState(false);
  const [raking, setRaking] = useState(true);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [importError, setImportError] = useState<string | null>(null);

  const signals = bench.currentSignals(state);
  const testing = testRun.active;
  const canTest = bench.canRunTest(state);
  const certificate = Boolean(signals.testCurrent && state.lastTest?.certified);
  const turns = state.calibre.reserveHours / signals.train.barrelHoursPerTurn;

  useEffect(() => {
    let active = true;
    void loadBench().then((loaded) => {
      if (!active || !loaded) return;
      setState((previous) =>
        !hadLocal.current || loaded.savedAt >= previous.savedAt
          ? bench.applyElapsed(loaded)
          : previous,
      );
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      setState((previous) => (previous.still ? previous : { ...previous, still: true }));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The theme still applies for this session.
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'night' ? '#1b1410' : '#f1e7d2');
    }
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveBench(state), 600);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const flush = () => saveBench(state);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((previous) => (previous.calibre.running ? bench.applyElapsed(previous) : previous));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const startTest = useCallback(() => {
    if (testRun.active || !bench.canRunTest(state)) return;
    const result = bench.makeCurrentTest(state);
    setTestRun({
      active: true,
      startedAt: Date.now(),
      duration: state.still ? 900 : 12_000,
      result,
    });
  }, [state, testRun.active]);

  useEffect(() => {
    if (!testRun.active || !testRun.result) return;
    const result = testRun.result;
    const remaining = Math.max(0, testRun.startedAt + testRun.duration - Date.now());
    const timer = window.setTimeout(() => {
      setState((previous) => bench.completeTest(previous, result));
      setTestRun((current) => ({ ...current, active: false }));
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [testRun.active, testRun.startedAt, testRun.duration, testRun.result]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      switch (event.key.toLowerCase()) {
        case 'r':
          setRaking((current) => !current);
          break;
        case 'e':
          setState((previous) => bench.toggleExploded(previous));
          break;
        case 'w':
          if (!testing) setState((previous) => bench.wind(previous, 1));
          break;
        case 't':
          if (!testing) startTest();
          break;
        case 'c':
          document.getElementById('calibre-card')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          break;
        case 'l':
          setTheme((current) => (current === 'day' ? 'night' : 'day'));
          break;
        case ' ':
          event.preventDefault();
          if (!testing) {
            setState((previous) =>
              signals.running ? bench.stopMovement(previous) : bench.startMovement(previous),
            );
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signals.running, startTest, testing]);

  const handleSelectFixture = (fixture: FixtureId) => {
    if (testing) return;
    setState((previous) => bench.newCalibre(previous, fixture));
    setTestRun(IDLE_TEST);
    setImportError(null);
  };

  const handleNewCalibre = (fault: FaultId) => {
    if (testing) return;
    setState((previous) => bench.newCalibre(previous, 'marine', fault));
    setTestRun(IDLE_TEST);
    setImportError(null);
  };

  const handleImport = (file: File) => {
    if (testing) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = parseImportPayload(JSON.parse(String(reader.result)));
        if (!payload) {
          setImportError('That file is not a valid Escapement calibre export.');
          return;
        }
        setState((previous) =>
          bench.importCalibre(previous, payload.calibre, payload.log, payload.lastTest ?? null),
        );
        setTestRun(IDLE_TEST);
      } catch {
        setImportError('Could not read that JSON file.');
      }
    };
    reader.onerror = () => setImportError('Could not read that file.');
    reader.readAsText(file);
  };

  const handleExportJson = () => {
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      calibre: state.calibre,
      log: state.log,
      lastTest: state.lastTest,
    };
    download(
      `escapement-${state.calibre.serial}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
  };

  const handleExportSvg = () => {
    const svg = buildCardSvg(
      state,
      signals.regulation,
      signals.train,
      signals.testCurrent,
      certificate,
    );
    download(`escapement-${state.calibre.serial}.svg`, svg, 'image/svg+xml');
  };

  return (
    <div className="app">
      <BrassRail
        calibre={state.calibre}
        signals={signals}
        testing={testing}
        still={state.still}
        certificate={certificate}
        onSelectFixture={handleSelectFixture}
        onNewCalibre={handleNewCalibre}
        onToggleRun={() => {
          if (testing) return;
          setState((previous) =>
            signals.running ? bench.stopMovement(previous) : bench.startMovement(previous),
          );
        }}
        onWind={() => {
          if (!testing) setState((previous) => bench.wind(previous, 1));
        }}
        onToggleStill={() => setState((previous) => bench.setStill(previous, !previous.still))}
        onHelp={() => setHelpOpen(true)}
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === 'day' ? 'night' : 'day'))
        }
      />

      <main className="bench">
        <section className="scene">
          <BenchScene
            calibre={state.calibre}
            train={signals.train}
            regulation={signals.regulation}
            selectedSocket={state.selectedSocket}
            onSelect={(socket: SocketId) =>
              setState((previous) => bench.selectSocket(previous, socket))
            }
            exploded={state.exploded}
            onToggleExploded={() => setState((previous) => bench.toggleExploded(previous))}
            still={state.still}
            running={signals.running}
            testing={testing}
            raking={raking}
            onToggleRaking={() => setRaking((current) => !current)}
            onRegulator={(value) => setState((previous) => bench.setRegulator(previous, value))}
            onWind={() => {
              if (!testing) setState((previous) => bench.wind(previous, 1));
            }}
            disabled={testing}
            turns={turns}
            maxTurns={6}
          />
          <PartsCabinet
            state={state}
            onSelect={(socket) => setState((previous) => bench.selectSocket(previous, socket))}
            onToggleDrawer={(drawer) =>
              setState((previous) => bench.toggleDrawer(previous, drawer))
            }
            onInstallWheel={(wheel: WheelId) =>
              setState((previous) => bench.installWheel(previous, wheel))
            }
            onInstallPinion={(leaves: PinionLeaves) =>
              setState((previous) => bench.installPinion(previous, leaves))
            }
            onRepair={() => setState((previous) => bench.repair(previous))}
            disabled={testing}
          />
          <TimingStand
            calibre={state.calibre}
            train={signals.train}
            regulation={signals.regulation}
            testing={testing}
            test={testRun}
            lastTest={state.lastTest}
            testCurrent={signals.testCurrent}
            certificate={certificate}
            canTest={canTest}
            onRunTest={startTest}
            onTemperature={(temperature: Temperature) =>
              setState((previous) => bench.setTemperature(previous, temperature))
            }
            still={state.still}
          />
          <CalibreCard
            state={state}
            regulation={signals.regulation}
            train={signals.train}
            testCurrent={signals.testCurrent}
            certificate={certificate}
            onRename={(name) => setState((previous) => bench.renameCalibre(previous, name))}
            onExportJson={handleExportJson}
            onExportSvg={handleExportSvg}
            onImport={handleImport}
            importError={importError}
            disabled={testing}
          />
        </section>
        <BenchLog entries={state.log} />
      </main>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
