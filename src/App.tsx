import { useCallback, useEffect, useRef, useState } from 'react';
import { BenchLog } from './components/BenchLog';
import { BenchScene } from './components/BenchScene';
import { BrassRail } from './components/BrassRail';
import { CalibreCard } from './components/CalibreCard';
import { HelpDialog } from './components/HelpDialog';
import { PartsCabinet } from './components/PartsCabinet';
import { ShelfDialog } from './components/ShelfDialog';
import { TimingStand, type TestRun } from './components/TimingStand';
import { buildCardSvg } from './components/cardSvg';
import type {
  BenchState,
  BenchTheme,
  FaultId,
  FixtureId,
  PinionLeaves,
  SavedCalibre,
  SocketId,
  Temperature,
  WheelId,
} from './horology/types';
import * as bench from './state/bench';
import {
  addShelfEntry,
  duplicateShelfEntry,
  loadShelfEntry,
  makeShelfEntry,
  removeShelfEntry,
  renameShelfEntry,
  saveCurrentToShelf,
  shelfDownloadPayload,
} from './state/shelf';
import {
  loadBench,
  loadShelf,
  readLocalBackup,
  readShelfLocal,
  saveBench,
  saveShelf,
} from './state/persist';
import { parseImportPayload, parseShelfPayload } from './state/validate';
import { decodeBuildHash, encodeBuild } from './lib/share';

const IDLE_TEST: TestRun = { active: false, startedAt: 0, duration: 0, result: null };
const THEME_KEY = 'escapement.theme';
const HINT_KEY = 'escapement.hint.v1';

function readTheme(): BenchTheme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'day' || stored === 'night') return stored;
  } catch {
    // The bench still works when storage is unavailable.
  }
  return 'day';
}

function readHint(): boolean {
  try {
    return !window.localStorage.getItem(HINT_KEY);
  } catch {
    return true;
  }
}

function makeSharedState(calibre: BenchState['calibre']): BenchState {
  const base = bench.makeBenchState(calibre.fixture);
  const now = Date.now();
  return {
    ...base,
    calibre,
    selectedSocket: 'center',
    openDrawer: null,
    exploded: false,
    lastTest: null,
    log: [bench.makeLogEntry(now, 'import', 'Opened from a shared build link.')],
    savedAt: now,
  };
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
  const sharedInitial = useRef(decodeBuildHash(window.location.hash)).current;
  const hadShare = useRef(Boolean(sharedInitial));
  const hadLocal = useRef(false);
  const previousLocal = useRef<BenchState | null>(null);
  const [state, setState] = useState<BenchState>(() => {
    const saved = readLocalBackup();
    if (sharedInitial) {
      previousLocal.current = saved ? bench.applyElapsed(saved) : null;
      return makeSharedState(sharedInitial.calibre);
    }
    hadLocal.current = Boolean(saved);
    return saved ? bench.applyElapsed(saved) : bench.makeBenchState();
  });
  const [shelf, setShelf] = useState<SavedCalibre[]>(() => readShelfLocal());
  const [testRun, setTestRun] = useState<TestRun>(IDLE_TEST);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [raking, setRaking] = useState(true);
  const [theme, setTheme] = useState<BenchTheme>(() => sharedInitial?.theme ?? readTheme());
  const [importError, setImportError] = useState<string | null>(null);
  const [shelfError, setShelfError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(readHint);

  const signals = bench.currentSignals(state);
  const testing = testRun.active;
  const canTest = bench.canRunTest(state);
  const certificate = signals.certificate;
  const turns = state.calibre.reserveHours / signals.train.barrelHoursPerTurn;

  const dismissHint = () => {
    setShowHint((current) => {
      if (!current) return current;
      try {
        window.localStorage.setItem(HINT_KEY, '1');
      } catch {
        // The hint can return next session.
      }
      return false;
    });
  };

  useEffect(() => {
    let active = true;
    void loadBench().then((loaded) => {
      if (!active || !loaded || hadShare.current) return;
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
    let active = true;
    void loadShelf().then((entries) => {
      if (!active || entries.length === 0) return;
      setShelf((current) =>
        entries.reduce((next, entry) => addShelfEntry(next, entry), current),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (previousLocal.current) {
      const kept = makeShelfEntry(previousLocal.current);
      setShelf((current) => addShelfEntry(current, kept));
      previousLocal.current = null;
    }
    if (sharedInitial) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, [sharedInitial]);

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
    if (meta) meta.setAttribute('content', theme === 'night' ? '#1b1410' : '#f1e7d2');
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveBench(state), 600);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveShelf(shelf), 600);
    return () => window.clearTimeout(timer);
  }, [shelf]);

  useEffect(() => {
    const flush = () => {
      saveBench(state);
      saveShelf(shelf);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, shelf]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((previous) => (previous.calibre.running ? bench.applyElapsed(previous) : previous));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const startTest = useCallback(() => {
    if (testRun.active || !bench.canRunTest(state)) return;
    dismissHint();
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
    const remaining = Math.max(0, testRun.startedAt + testRun.duration - Date.now());
    const timer = window.setTimeout(() => {
      setState((previous) => bench.completeTest(previous));
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
        case 's':
          setShelfOpen(true);
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

  const rememberCurrent = (now = Date.now()) => {
    const result = saveCurrentToShelf(shelf, state, now);
    setShelf(result.shelf);
    return result;
  };

  const handleSelectFixture = (fixture: FixtureId) => {
    if (testing) return;
    rememberCurrent();
    setState((previous) => {
      const next = bench.newCalibre(previous, fixture);
      return {
        ...next,
        log: [...next.log, bench.makeLogEntry(Date.now(), 'state', 'Previous bench saved to the shelf.')],
      };
    });
    setTestRun(IDLE_TEST);
    setImportError(null);
  };

  const handleNewCalibre = (fault: FaultId) => {
    if (testing) return;
    rememberCurrent();
    setState((previous) => {
      const next = bench.newCalibre(previous, 'marine', fault);
      return {
        ...next,
        log: [...next.log, bench.makeLogEntry(Date.now(), 'state', 'Previous bench saved to the shelf.')],
      };
    });
    setTestRun(IDLE_TEST);
    setImportError(null);
  };

  const handleSaveCurrent = () => {
    const { entry } = saveCurrentToShelf(shelf, state);
    setShelf((current) => addShelfEntry(current, entry));
    setState((previous) => ({
      ...previous,
      log: [
        ...previous.log.slice(-39),
        bench.makeLogEntry(Date.now(), 'state', `${entry.name} saved to the shelf.`),
      ],
    }));
  };

  const handleLoadShelf = (entry: SavedCalibre) => {
    if (testing) return;
    rememberCurrent();
    setState((previous) => loadShelfEntry(previous, entry));
    setTestRun(IDLE_TEST);
    setShelfOpen(false);
    setShelfError(null);
  };

  const handleDuplicateShelf = (id: string) => {
    setShelf((current) => duplicateShelfEntry(current, id));
  };

  const handleDeleteShelf = (id: string) => {
    setShelf((current) => removeShelfEntry(current, id));
  };

  const handleRenameShelf = (id: string, name: string) => {
    setShelf((current) => renameShelfEntry(current, id, name));
  };

  const handleShelfExport = () => {
    download(
      'escapement-shelf.json',
      JSON.stringify(shelfDownloadPayload(shelf), null, 2),
      'application/json',
    );
  };

  const handleShelfImport = (file: File) => {
    setShelfError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseShelfPayload(JSON.parse(String(reader.result)));
        if (!parsed) {
          setShelfError('That file is not a valid shelf export.');
          return;
        }
        const imported = parsed.map((entry) => ({
          ...entry,
          lastTest: null,
          calibre: { ...entry.calibre, name: entry.name },
        }));
        setShelf((current) =>
          imported.reduce((next, entry) => addShelfEntry(next, entry), current),
        );
      } catch {
        setShelfError('Could not read that shelf file.');
      }
    };
    reader.onerror = () => setShelfError('Could not read that shelf file.');
    reader.readAsText(file);
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
        rememberCurrent();
        setState((previous) => {
          const next = bench.importCalibre(previous, payload.calibre, payload.log, null);
          return {
            ...next,
            log: [
              ...next.log,
              bench.makeLogEntry(
                Date.now(),
                'import',
                'Imported measurement discarded. Re-test this build on the bench.',
              ),
            ],
          };
        });
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
      signals.running,
    );
    download(`escapement-${state.calibre.serial}.svg`, svg, 'image/svg+xml');
  };

  const handleShare = async () => {
    const encoded = encodeBuild(state.calibre, theme);
    const url = `${window.location.origin}${window.location.pathname}#build=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Build link copied.');
    } catch {
      setShareStatus(url);
    }
    window.setTimeout(() => setShareStatus(null), 3500);
  };

  return (
    <div className="app">
      <BrassRail
        calibre={state.calibre}
        signals={signals}
        testing={testing}
        still={state.still}
        certificate={certificate}
        shelfCount={shelf.length}
        onOpenShelf={() => setShelfOpen(true)}
        onSelectFixture={handleSelectFixture}
        onNewCalibre={handleNewCalibre}
        onToggleRun={() => {
          if (testing) return;
          dismissHint();
          setState((previous) =>
            signals.running ? bench.stopMovement(previous) : bench.startMovement(previous),
          );
        }}
        onWind={() => {
          if (!testing) {
            dismissHint();
            setState((previous) => bench.wind(previous, 1));
          }
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
            onRegulator={(value) => {
              dismissHint();
              setState((previous) => bench.setRegulator(previous, value));
            }}
            onWind={() => {
              if (!testing) {
                dismissHint();
                setState((previous) => bench.wind(previous, 1));
              }
            }}
            disabled={testing}
            turns={turns}
            maxTurns={6}
            showHint={showHint}
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
            running={signals.running}
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
            running={signals.running}
            onRename={(name) => setState((previous) => bench.renameCalibre(previous, name))}
            onExportJson={handleExportJson}
            onExportSvg={handleExportSvg}
            onImport={handleImport}
            onShare={handleShare}
            shareStatus={shareStatus}
            importError={importError}
            disabled={testing}
          />
        </section>
        <BenchLog entries={state.log} />
      </main>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ShelfDialog
        open={shelfOpen}
        shelf={shelf}
        importError={shelfError}
        onClose={() => setShelfOpen(false)}
        onSaveCurrent={handleSaveCurrent}
        onLoad={handleLoadShelf}
        onDuplicate={handleDuplicateShelf}
        onDelete={handleDeleteShelf}
        onRename={handleRenameShelf}
        onExport={handleShelfExport}
        onImport={handleShelfImport}
      />
    </div>
  );
}
