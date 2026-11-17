import { useCallback, useEffect, useMemo, useState } from 'react';
import { SYSTEM_BY_ID } from '../data/terms';
import { DIFFICULTIES, SIZES, encodeConfig, generate, type Config, type Placement } from '../lib/generator';
import { readLine, type Line } from '../lib/geometry';
import { formatTime, load, save } from '../lib/storage';
import { Board, type Mark } from './Board';
import { Modal } from './Modal';
import { NewPuzzle } from './NewPuzzle';
import { WordPanel } from './WordPanel';

interface Props {
  config: Config;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNew: (c: Config) => void;
}

interface Progress {
  found: Record<string, Line>;
  revealed: Record<string, Line>;
  hints: number;
  elapsed: number;
}

const endOf = (p: Placement): Line => ({
  r0: p.r,
  c0: p.c,
  r1: p.r + p.dr * (p.word.length - 1),
  c1: p.c + p.dc * (p.word.length - 1),
});

export function Game({ config, theme, onToggleTheme, onNew }: Props) {
  const puzzle = useMemo(() => generate(config), [config]);
  const { n, grid, placements } = puzzle;
  const key = `corpus:progress:${encodeConfig(config)}`;
  const bestKey = `corpus:best:${config.size}:${config.diff}:${config.systems.slice().sort().join(',') || 'all'}`;

  const initial = useMemo(
    () => load<Progress>(key, { found: {}, revealed: {}, hints: 0, elapsed: 0 }),
    [key],
  );
  const [found, setFound] = useState(initial.found);
  const [revealed, setRevealed] = useState(initial.revealed);
  const [hints, setHints] = useState(initial.hints);
  const [elapsed, setElapsed] = useState(initial.elapsed);

  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState<{ word: string; r: number; c: number; nonce: number } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [zoom, setZoom] = useState<number>(() =>
    load<number>('corpus:zoom', n <= 18 ? 34 : n <= 26 ? 30 : 26),
  );

  const total = placements.length;
  const foundCount = placements.filter((p) => found[p.word]).length;
  const solved = foundCount === total;
  const gaveUp = Object.keys(revealed).length > 0;
  const finished = solved || gaveUp;
  const running = !paused && !finished;

  // Timer
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Pause when the tab is hidden so the clock stays honest.
  useEffect(() => {
    const onVis = () => document.hidden && setPaused(true);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Persist progress and zoom.
  useEffect(() => save(key, { found, revealed, hints, elapsed } satisfies Progress), [key, found, revealed, hints, elapsed]);
  useEffect(() => save('corpus:zoom', zoom), [zoom]);

  // Completion
  const [best, setBest] = useState<number | null>(() => load<number | null>(bestKey, null));
  useEffect(() => {
    if (!solved || gaveUp) return;
    setWinOpen(true);
    if (best === null || elapsed < best) {
      setBest(elapsed);
      save(bestKey, elapsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const submit = useCallback(
    (line: Line) => {
      const str = readLine(grid, line);
      const rev = [...str].reverse().join('');
      const hit = placements.find((p) => !found[p.word] && (p.word === str || p.word === rev));
      if (!hit) return false;
      setFound((f) => ({ ...f, [hit.word]: line }));
      setHint((h) => (h?.word === hit.word ? null : h));
      return true;
    },
    [grid, placements, found],
  );

  const locate = useCallback((p: Placement) => {
    setHint({ word: p.word, r: p.r, c: p.c, nonce: Date.now() });
    setHints((h) => h + 1);
  }, []);

  const giveHint = () => {
    const left = placements.filter((p) => !found[p.word]);
    if (!left.length) return;
    locate(left[Math.floor(Math.random() * left.length)]);
  };

  const reveal = () => {
    if (!window.confirm('Reveal every remaining word? This ends the puzzle.')) return;
    const rest: Record<string, Line> = {};
    for (const p of placements) if (!found[p.word]) rest[p.word] = endOf(p);
    setRevealed(rest);
    setHint(null);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setToast('Puzzle link copied. Anyone opening it gets this exact grid.');
    } catch {
      setToast('Copy the address bar URL to share this puzzle.');
    }
  };

  const marks = useMemo<Mark[]>(
    () =>
      placements.flatMap((p) =>
        found[p.word] ? [{ ...found[p.word], color: SYSTEM_BY_ID[p.systemId].color }] : [],
      ),
    [placements, found],
  );
  const ghosts = useMemo<Mark[]>(
    () => Object.values(revealed).map((l) => ({ ...l, color: '' })),
    [revealed],
  );
  const foundSet = useMemo(() => new Set(Object.keys(found)), [found]);
  const hintCell = hint ? { r: hint.r, c: hint.c, nonce: hint.nonce } : null;
  const pct = total ? (foundCount / total) * 100 : 0;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">K</span>
          <div>
            <h1>Kaizen's Wordsearch</h1>
            <p>Massive anatomy word search</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button className="btn primary" onClick={() => setNewOpen(true)}>New puzzle</button>
        </div>
      </header>

      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={foundCount} aria-label="Words found">
        <div style={{ width: `${pct}%` }} />
      </div>

      <main className="main">
        <section className="stage">
          <div className="toolbar">
            <div className="stat"><b>{foundCount}</b><span>/ {total} found</span></div>
            <div className="stat"><b className="mono">{formatTime(elapsed)}</b><span>{SIZES[config.size].n}×{SIZES[config.size].n} · {DIFFICULTIES[config.diff].label}</span></div>
            <div className="spacer" />
            <label className="zoom">
              <span>Zoom</span>
              <input type="range" min={16} max={56} value={zoom} onChange={(e) => setZoom(+e.target.value)} aria-label="Grid zoom" />
            </label>
            <button className="btn" onClick={giveHint} disabled={finished}>Hint</button>
            <button className="btn" onClick={() => setPaused((p) => !p)} disabled={finished}>{paused ? 'Resume' : 'Pause'}</button>
            <button className="btn" onClick={share}>Share</button>
            <button className="btn danger" onClick={reveal} disabled={finished}>Reveal</button>
          </div>

          {gaveUp && !solved && <div className="banner">Solution revealed. Dashed lines show the words you missed.</div>}

          <Board
            grid={grid}
            marks={marks}
            ghosts={ghosts}
            hint={hintCell}
            cell={zoom}
            paused={paused}
            disabled={finished}
            onSubmit={submit}
            onResume={() => setPaused(false)}
          />
          <p className="help">
            Drag across letters, or click the first and last letter. On touch, tap the first and last letter.
            Words run in straight lines{config.diff === 'hard' ? ', including backwards' : ''}.
            Keyboard: arrow keys, Space to mark, Esc to cancel.
          </p>
        </section>

        <WordPanel placements={placements} found={foundSet} clueMode={config.clue} onLocate={locate} />
      </main>

      <div className={`toast${toast ? ' show' : ''}`} role="status">{toast}</div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New puzzle" wide>
        <NewPuzzle
          initial={config}
          onCancel={() => setNewOpen(false)}
          onStart={(c) => {
            setNewOpen(false);
            onNew(c);
          }}
        />
      </Modal>

      <Modal open={winOpen} onClose={() => setWinOpen(false)} title="Puzzle complete! 🎉">
        <div className="win">
          <div className="win-stats">
            <div><b className="mono">{formatTime(elapsed)}</b><span>Time</span></div>
            <div><b>{total}</b><span>Terms</span></div>
            <div><b>{hints}</b><span>Hints</span></div>
            <div><b className="mono">{best !== null ? formatTime(best) : '—'}</b><span>Best</span></div>
          </div>
          <p>
            You found every term. Hover or open the word list to review each definition.
          </p>
          <div className="actions">
            <button className="btn" onClick={() => setWinOpen(false)}>Review grid</button>
            <button className="btn primary" onClick={() => { setWinOpen(false); onNew({ ...config, seed: Math.random().toString(36).slice(2, 8) }); }}>
              Play again
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
