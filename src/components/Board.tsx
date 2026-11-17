import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { snapEnd, type Cell, type Line } from '../lib/geometry';

export interface Mark extends Line {
  color: string;
}

interface Props {
  grid: string[][];
  marks: Mark[];
  ghosts: Mark[];
  hint: (Cell & { nonce: number }) | null;
  cell: number;
  paused: boolean;
  disabled: boolean;
  /** Returns true when the selection was a correct word. */
  onSubmit: (line: Line) => boolean;
  onResume: () => void;
}

const Letters = memo(function Letters({ grid }: { grid: string[][] }) {
  return (
    <div className="letters" aria-hidden="true">
      {grid.flatMap((row, r) => row.map((ch, c) => <div key={`${r}-${c}`} className="cell">{ch}</div>))}
    </div>
  );
});

const center = (v: number) => v + 0.5;

export const Board = memo(function Board({ grid, marks, ghosts, hint, cell, paused, disabled, onSubmit, onResume }: Props) {
  const n = grid.length;
  const scroller = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const [anchor, setAnchor] = useState<Cell | null>(null);
  const [end, setEnd] = useState<Cell | null>(null);
  const [cursor, setCursor] = useState<Cell | null>(null);
  const [wrong, setWrong] = useState<Line | null>(null);
  const dragging = useRef(false);

  const clear = useCallback(() => {
    setAnchor(null);
    setEnd(null);
    dragging.current = false;
  }, []);

  const finish = useCallback(
    (a: Cell, b: Cell) => {
      clear();
      if (a.r === b.r && a.c === b.c) return;
      const line = { r0: a.r, c0: a.c, r1: b.r, c1: b.c };
      if (!onSubmit(line)) {
        setWrong(line);
        window.setTimeout(() => setWrong(null), 450);
      }
    },
    [clear, onSubmit],
  );

  const cellAt = (e: React.PointerEvent): Cell => {
    const rect = boardRef.current!.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * n);
    return { r: Math.min(n - 1, Math.max(0, r)), c: Math.min(n - 1, Math.max(0, c)) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || paused || e.pointerType === 'touch' || e.button !== 0) return;
    const p = cellAt(e);
    if (anchor) {
      // Second click of click–click mode: commit (or cancel on the same cell).
      finish(anchor, snapEnd(anchor, p, n));
      return;
    }
    boardRef.current!.setPointerCapture(e.pointerId);
    dragging.current = true;
    setAnchor(p);
    setEnd(p);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!anchor || e.pointerType === 'touch') return;
    setEnd(snapEnd(anchor, cellAt(e), n));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (disabled || paused) return;
    const p = cellAt(e);
    if (e.pointerType === 'touch') {
      // Tap–tap mode keeps native scrolling/pinch-zoom working on phones.
      if (!anchor) {
        setAnchor(p);
        setEnd(p);
      } else finish(anchor, snapEnd(anchor, p, n));
      return;
    }
    if (dragging.current && anchor) {
      dragging.current = false;
      const to = snapEnd(anchor, p, n);
      if (to.r !== anchor.r || to.c !== anchor.c) finish(anchor, to);
    }
  };

  // Keyboard: arrows move, Space/Enter marks start then end, Esc cancels.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || paused) return;
    const cur = cursor ?? { r: 0, c: 0 };
    const move = (dr: number, dc: number) => {
      e.preventDefault();
      const k = e.shiftKey ? 5 : 1;
      const next = {
        r: Math.min(n - 1, Math.max(0, cur.r + dr * k)),
        c: Math.min(n - 1, Math.max(0, cur.c + dc * k)),
      };
      setCursor(next);
      if (anchor) setEnd(snapEnd(anchor, next, n));
    };
    switch (e.key) {
      case 'ArrowUp': return move(-1, 0);
      case 'ArrowDown': return move(1, 0);
      case 'ArrowLeft': return move(0, -1);
      case 'ArrowRight': return move(0, 1);
      case 'Escape': return clear();
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (!cursor) return setCursor(cur);
        if (!anchor) {
          setAnchor(cur);
          setEnd(cur);
        } else finish(anchor, snapEnd(anchor, cur, n));
    }
  };

  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [cursor]);

  // Scroll a hinted cell into the middle of the viewport.
  useEffect(() => {
    const s = scroller.current;
    if (!hint || !s) return;
    s.scrollTo({
      left: hint.c * cell - s.clientWidth / 2 + cell / 2,
      top: hint.r * cell - s.clientHeight / 2 + cell / 2,
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint]);

  const selection = useMemo<Line | null>(
    () => (anchor && end ? { r0: anchor.r, c0: anchor.c, r1: end.r, c1: end.c } : null),
    [anchor, end],
  );

  const style = { '--n': n, '--cell': `${cell}px` } as CSSProperties;

  return (
    <div className="scroller" ref={scroller}>
      <div
        ref={boardRef}
        className={`board${disabled ? ' done' : ''}`}
        style={style}
        tabIndex={0}
        role="application"
        aria-label="Word search grid. Arrow keys move the cursor. Space marks the first and last letter of a word. Escape cancels."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
      >
        <Letters grid={grid} />
        <svg className="overlay" viewBox={`0 0 ${n} ${n}`} preserveAspectRatio="none" aria-hidden="true">
          {ghosts.map((m, i) => (
            <line key={`g${i}`} className="ghost" x1={center(m.c0)} y1={center(m.r0)} x2={center(m.c1)} y2={center(m.r1)} />
          ))}
          {marks.map((m, i) => (
            <line key={`m${i}`} className="found" stroke={m.color} x1={center(m.c0)} y1={center(m.r0)} x2={center(m.c1)} y2={center(m.r1)} />
          ))}
          {selection && (
            <line className="selection" x1={center(selection.c0)} y1={center(selection.r0)} x2={center(selection.c1)} y2={center(selection.r1)} />
          )}
          {wrong && (
            <line className="wrong" x1={center(wrong.c0)} y1={center(wrong.r0)} x2={center(wrong.c1)} y2={center(wrong.r1)} />
          )}
          {hint && <circle key={hint.nonce} className="hint" cx={center(hint.c)} cy={center(hint.r)} r={0.62} />}
        </svg>
        {cursor && (
          <div
            ref={cursorRef}
            className="cursor"
            style={{ left: cursor.c * cell, top: cursor.r * cell, width: cell, height: cell }}
          />
        )}
        {paused && (
          <div className="paused">
            <p>Paused</p>
            <button className="btn primary" onClick={onResume}>Resume</button>
          </div>
        )}
      </div>
    </div>
  );
});
